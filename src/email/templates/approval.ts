/**
 * Approval Email Template
 */

import type { PendingAction } from '../../agent/types.js';
import { getActionTypeName } from '../../approval/queue.js';

interface ApprovalEmailData {
  action: PendingAction;
  approveUrl: string;
  rejectUrl: string;
  editUrl?: string;
  agentName: string;
}

/**
 * Generate approval email HTML
 */
export function generateApprovalEmail(data: ApprovalEmailData): string {
  const { action, approveUrl, rejectUrl, agentName } = data;
  const typeName = getActionTypeName(action.type);
  const expiresAt = action.expiresAt.toLocaleString('cs-CZ');

  const payloadHtml = formatPayload(action.type, action.payload);

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nový návrh ke schválení</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #4F46E5;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #4F46E5;
      font-size: 24px;
    }
    .content-box {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .ai-reasoning {
      background: #E0E7FF;
      border-left: 4px solid #4F46E5;
      padding: 15px;
      margin: 20px 0;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 30px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: bold;
      text-align: center;
      flex: 1;
    }
    .btn-approve { background: #10B981; color: white; }
    .btn-reject { background: #EF4444; color: white; }
    .expires {
      background: #FEF3C7;
      border: 1px solid #F59E0B;
      border-radius: 4px;
      padding: 10px;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${typeName}</h1>
      <p>${agentName} - Návrh ke schválení</p>
    </div>
    <div class="content-box">
      <h3>Detail akce</h3>
      ${payloadHtml}
    </div>
    <div class="ai-reasoning">
      <h4>AI Zdůvodnění</h4>
      <p>${action.reasoning}</p>
    </div>
    <div class="expires">
      Platnost návrhu: do ${expiresAt}
    </div>
    <div class="buttons">
      <a href="${approveUrl}" class="btn btn-approve">Schválit</a>
      <a href="${rejectUrl}" class="btn btn-reject">Zamítnout</a>
    </div>
    <div class="footer">
      <p>ID akce: ${action.id}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function formatPayload(type: string, payload: Record<string, any>): string {
  switch (type) {
    case 'create_post':
      return `<div style="white-space: pre-wrap;">${escapeHtml(payload.content || '')}</div>`;
    case 'adjust_budget':
      return `<p>Kampan\u011b: ${payload.campaignId}</p><p>Nov\u00fd rozpo\u010det: ${payload.newBudget} K\u010d</p>`;
    default:
      return `<pre>${JSON.stringify(payload, null, 2)}</pre>`;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateApprovalEmailText(data: ApprovalEmailData): string {
  const { action, approveUrl, rejectUrl, agentName } = data;
  return `${agentName} - N\u00e1vrh ke schv\u00e1len\u00ed\n\nTyp: ${action.type}\nSchv\u00e1lit: ${approveUrl}\nZam\u00edtnout: ${rejectUrl}`;
}
