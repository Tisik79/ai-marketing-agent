/**
 * Email Sender - High-level email sending functions
 */

import { sendEmail } from './client.js';
import { generateApprovalEmail, generateApprovalEmailText } from './templates/approval.js';
import { generateDailyReportEmail, generateWeeklyReportEmail } from './templates/report.js';
import { getApprovalUrl, getRejectionUrl, getEditUrl } from '../approval/queue.js';
import { getConfig } from '../database/repositories/config.js';
import { emailLogger } from '../utils/logger.js';
import type { PendingAction, Goal } from '../agent/types.js';

/**
 * Send approval request email
 */
export async function sendApprovalEmail(action: PendingAction): Promise<boolean> {
  const config = getConfig();
  if (!config?.approval.email) {
    emailLogger.warn('No approval email configured');
    return false;
  }

  const data = {
    action,
    approveUrl: getApprovalUrl(action),
    rejectUrl: getRejectionUrl(action),
    editUrl: getEditUrl(action),
    agentName: config.name || 'AI Marketing Agent',
  };

  const html = generateApprovalEmail(data);
  const text = generateApprovalEmailText(data);

  const result = await sendEmail({
    to: config.approval.email,
    subject: `🤖 [${config.name}] Nový návrh ke schválení: ${getActionTypeName(action.type)}`,
    html,
    text,
  });

  return result.success;
}

/**
 * Send confirmation email after action execution
 */
export async function sendConfirmationEmail(
  action: PendingAction,
  success: boolean,
  details?: string
): Promise<boolean> {
  const config = getConfig();
  if (!config?.approval.email || !config.notifications.instantAlerts) {
    return false;
  }

  const status = success ? '✅ Provedeno' : '❌ Selhalo';
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2>${status}: ${getActionTypeName(action.type)}</h2>
      <p><strong>ID akce:</strong> ${action.id}</p>
      ${details ? `<p><strong>Detail:</strong> ${details}</p>` : ''}
      <hr>
      <p style="color: #666; font-size: 12px;">${config.name}</p>
    </div>
  `;

  const result = await sendEmail({
    to: config.approval.email,
    subject: `${status} - ${getActionTypeName(action.type)}`,
    html,
  });

  return result.success;
}

/**
 * Send daily report email
 */
export async function sendDailyReport(data: {
  date: string;
  budget: {
    total: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    dailySpend: number;
  };
  performance: {
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    leads: number;
    conversions: number;
  };
  previousDay?: {
    impressions: number;
    reach: number;
    clicks: number;
    leads: number;
  };
  goals: Array<Goal & { progress: number; onTrack: boolean }>;
  actions: Array<{
    time: string;
    description: string;
    status: 'success' | 'failed' | 'pending';
  }>;
  aiSummary: string;
  recommendations: string[];
}): Promise<boolean> {
  const config = getConfig();
  if (!config?.approval.email || !config.notifications.dailyReport) {
    emailLogger.info('Daily report not sent - disabled or no email configured');
    return false;
  }

  const html = generateDailyReportEmail({
    ...data,
    agentName: config.name || 'AI Marketing Agent',
  });

  const result = await sendEmail({
    to: config.approval.email,
    subject: `📊 [${config.name}] Denní report - ${data.date}`,
    html,
  });

  if (result.success) {
    emailLogger.info('Daily report sent', { date: data.date });
  }

  return result.success;
}

/**
 * Send weekly report email
 */
export async function sendWeeklyReport(data: {
  weekNumber: number;
  date: string;
  budget: {
    total: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    dailySpend: number;
  };
  performance: {
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    leads: number;
    conversions: number;
  };
  weeklyTotals: {
    impressions: number;
    reach: number;
    clicks: number;
    leads: number;
    spent: number;
  };
  goals: Array<Goal & { progress: number; onTrack: boolean }>;
  actions: Array<{
    time: string;
    description: string;
    status: 'success' | 'failed' | 'pending';
  }>;
  aiSummary: string;
  recommendations: string[];
}): Promise<boolean> {
  const config = getConfig();
  if (!config?.approval.email || !config.notifications.weeklyReport) {
    emailLogger.info('Weekly report not sent - disabled or no email configured');
    return false;
  }

  const html = generateWeeklyReportEmail({
    ...data,
    agentName: config.name || 'AI Marketing Agent',
  });

  const result = await sendEmail({
    to: config.approval.email,
    subject: `📊 [${config.name}] Týdenní report - Týden ${data.weekNumber}`,
    html,
  });

  if (result.success) {
    emailLogger.info('Weekly report sent', { weekNumber: data.weekNumber });
  }

  return result.success;
}

/**
 * Send alert email
 */
export async function sendAlert(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'error' = 'info'
): Promise<boolean> {
  const config = getConfig();
  if (!config?.approval.email || !config.notifications.instantAlerts) {
    return false;
  }

  const colors = {
    info: '#4F46E5',
    warning: '#F59E0B',
    error: '#EF4444',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨',
  };

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="border-left: 4px solid ${colors[severity]}; padding-left: 15px;">
        <h2>${icons[severity]} ${title}</h2>
        <p>${message}</p>
      </div>
      <hr>
      <p style="color: #666; font-size: 12px;">${config.name} - ${new Date().toLocaleString('cs-CZ')}</p>
    </div>
  `;

  const result = await sendEmail({
    to: config.approval.email,
    subject: `${icons[severity]} [${config.name}] ${title}`,
    html,
  });

  return result.success;
}

/**
 * Send budget alert
 */
export async function sendBudgetAlert(
  percentUsed: number,
  remaining: number
): Promise<boolean> {
  return sendAlert(
    'Upozornění na rozpočet',
    `Bylo vyčerpáno ${percentUsed}% měsíčního rozpočtu. Zbývá ${remaining} Kč.`,
    percentUsed >= 90 ? 'error' : 'warning'
  );
}

/**
 * Get action type display name
 */
function getActionTypeName(type: string): string {
  const names: Record<string, string> = {
    create_post: 'Nový příspěvek',
    boost_post: 'Propagace příspěvku',
    create_campaign: 'Nová kampaň',
    adjust_budget: 'Úprava rozpočtu',
    pause_campaign: 'Pozastavení kampaně',
    resume_campaign: 'Obnovení kampaně',
    create_ad: 'Nová reklama',
    modify_targeting: 'Změna cílení',
  };
  return names[type] || type;
}
