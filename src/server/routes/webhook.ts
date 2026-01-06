/**
 * Webhook Routes - Approval endpoints
 */

import { Router, Request, Response } from 'express';
import { approve, reject, getByToken, formatActionForDisplay } from '../../approval/queue.js';
import { executeAction } from '../../approval/executor.js';
import { sendConfirmationEmail } from '../../email/sender.js';
import { serverLogger } from '../../utils/logger.js';

const router = Router();

/**
 * Approve action via token
 * GET /webhook/approve/:token
 */
router.get('/approve/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  serverLogger.info('Approval request received', { token: token.substring(0, 8) + '...' });

  try {
    const action = approve(token, 'email');

    if (!action) {
      return res.status(404).send(renderPage('Akce nenalezena', 'Tato akce neexistuje, již vypršela nebo byla zpracována.', 'error'));
    }

    // Execute the action immediately
    const result = await executeAction(action);

    if (result.success) {
      await sendConfirmationEmail(action, true, 'Akce byla úspěšně provedena.');
      return res.send(renderPage(
        'Akce schválena a provedena',
        `Akce "${formatActionForDisplay(action).typeName}" byla úspěšně provedena.`,
        'success'
      ));
    } else {
      await sendConfirmationEmail(action, false, result.error);
      return res.send(renderPage(
        'Akce schválena, ale selhala',
        `Akce byla schválena, ale při provádění došlo k chybě: ${result.error}`,
        'error'
      ));
    }
  } catch (error) {
    serverLogger.error('Error processing approval', error);
    return res.status(500).send(renderPage('Chyba', 'Došlo k chybě při zpracování schválení.', 'error'));
  }
});

/**
 * Reject action via token
 * GET /webhook/reject/:token
 */
router.get('/reject/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  serverLogger.info('Rejection request received', { token: token.substring(0, 8) + '...' });

  try {
    const action = reject(token, 'email');

    if (!action) {
      return res.status(404).send(renderPage('Akce nenalezena', 'Tato akce neexistuje, již vypršela nebo byla zpracována.', 'error'));
    }

    return res.send(renderPage(
      'Akce zamítnuta',
      `Akce "${formatActionForDisplay(action).typeName}" byla zamítnuta.`,
      'info'
    ));
  } catch (error) {
    serverLogger.error('Error processing rejection', error);
    return res.status(500).send(renderPage('Chyba', 'Došlo k chybě při zpracování zamítnutí.', 'error'));
  }
});

/**
 * View action details
 * GET /webhook/view/:token
 */
router.get('/view/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const action = getByToken(token);

    if (!action) {
      return res.status(404).send(renderPage('Akce nenalezena', 'Tato akce neexistuje.', 'error'));
    }

    const formatted = formatActionForDisplay(action);
    const baseUrl = process.env.BASE_URL || 'http://localhost:6081';

    const html = `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Detail akce</title>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
          .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
          .status.pending { background: #FEF3C7; color: #92400E; }
          .status.approved { background: #D1FAE5; color: #065F46; }
          .status.rejected { background: #FEE2E2; color: #991B1B; }
          .status.executed { background: #DBEAFE; color: #1E40AF; }
          .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 5px; font-weight: bold; }
          .btn-approve { background: #10B981; color: white; }
          .btn-reject { background: #EF4444; color: white; }
          pre { background: #e9ecef; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>${formatted.typeName}</h1>
        <span class="status ${formatted.status}">${formatted.status.toUpperCase()}</span>

        <div class="card">
          <h3>Detail</h3>
          <pre>${JSON.stringify(formatted.payload, null, 2)}</pre>
        </div>

        <div class="card">
          <h3>AI Zdůvodnění</h3>
          <p>${formatted.reasoning}</p>
          <p><strong>Očekávaný dopad:</strong> ${formatted.expectedImpact}</p>
          <p><strong>Spolehlivost:</strong> ${formatted.confidence}</p>
        </div>

        <p><strong>Vytvořeno:</strong> ${new Date(formatted.createdAt).toLocaleString('cs-CZ')}</p>
        <p><strong>Vyprší:</strong> ${new Date(formatted.expiresAt).toLocaleString('cs-CZ')}</p>

        ${formatted.status === 'pending' ? `
          <div style="margin-top: 20px;">
            <a href="${baseUrl}/webhook/approve/${token}" class="btn btn-approve">✅ Schválit</a>
            <a href="${baseUrl}/webhook/reject/${token}" class="btn btn-reject">❌ Zamítnout</a>
          </div>
        ` : ''}
      </body>
      </html>
    `;

    return res.send(html);
  } catch (error) {
    serverLogger.error('Error viewing action', error);
    return res.status(500).send(renderPage('Chyba', 'Došlo k chybě při načítání akce.', 'error'));
  }
});

/**
 * Edit action (form)
 * GET /webhook/edit/:token
 */
router.get('/edit/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const action = getByToken(token);

    if (!action) {
      return res.status(404).send(renderPage('Akce nenalezena', 'Tato akce neexistuje.', 'error'));
    }

    if (action.status !== 'pending') {
      return res.status(400).send(renderPage('Nelze upravit', 'Tuto akci již nelze upravit.', 'error'));
    }

    if (action.type !== 'create_post') {
      return res.status(400).send(renderPage('Nepodporováno', 'Úprava tohoto typu akce není podporována.', 'error'));
    }

    const html = `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upravit akci</title>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
          textarea { width: 100%; min-height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
          .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; font-size: 16px; }
          .btn-primary { background: #4F46E5; color: white; }
          .btn-secondary { background: #e9ecef; color: #333; }
        </style>
      </head>
      <body>
        <h1>Upravit příspěvek</h1>
        <form method="POST">
          <p>
            <label>Obsah příspěvku:</label><br>
            <textarea name="content">${action.payload.content || ''}</textarea>
          </p>
          <p>
            <button type="submit" class="btn btn-primary">Uložit a schválit</button>
            <a href="javascript:history.back()" class="btn btn-secondary">Zrušit</a>
          </p>
        </form>
      </body>
      </html>
    `;

    return res.send(html);
  } catch (error) {
    serverLogger.error('Error loading edit form', error);
    return res.status(500).send(renderPage('Chyba', 'Došlo k chybě.', 'error'));
  }
});

/**
 * Edit action (submit)
 * POST /webhook/edit/:token
 */
router.post('/edit/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { content } = req.body;

  try {
    const action = getByToken(token);

    if (!action || action.status !== 'pending') {
      return res.status(404).send(renderPage('Akce nenalezena', 'Tato akce neexistuje nebo ji nelze upravit.', 'error'));
    }

    // Update payload and approve
    action.payload.content = content;

    const approved = approve(token, 'email-edit');
    if (!approved) {
      return res.status(400).send(renderPage('Chyba', 'Nepodařilo se schválit akci.', 'error'));
    }

    // Execute with modified payload
    const result = await executeAction({ ...approved, payload: { ...approved.payload, content } });

    if (result.success) {
      return res.send(renderPage('Úspěch', 'Upravený příspěvek byl publikován.', 'success'));
    } else {
      return res.send(renderPage('Chyba', `Publikace selhala: ${result.error}`, 'error'));
    }
  } catch (error) {
    serverLogger.error('Error processing edit', error);
    return res.status(500).send(renderPage('Chyba', 'Došlo k chybě.', 'error'));
  }
});

/**
 * Render simple HTML page
 */
function renderPage(title: string, message: string, type: 'success' | 'error' | 'info'): string {
  const colors = {
    success: { bg: '#D1FAE5', border: '#10B981', icon: '✅' },
    error: { bg: '#FEE2E2', border: '#EF4444', icon: '❌' },
    info: { bg: '#DBEAFE', border: '#3B82F6', icon: 'ℹ️' },
  };

  const color = colors[type];

  return `
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .card {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .message {
          background: ${color.bg};
          border-left: 4px solid ${color.border};
          padding: 15px;
          margin: 20px 0;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${color.icon}</div>
        <h1>${title}</h1>
        <div class="message">
          ${message}
        </div>
        <p style="color: #666; font-size: 14px;">Toto okno můžete zavřít.</p>
      </div>
    </body>
    </html>
  `;
}

export default router;
