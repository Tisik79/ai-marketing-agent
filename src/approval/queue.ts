/**
 * Approval Queue - Managing pending actions workflow
 */

import {
  createAction,
  getActionById,
  getActionByToken,
  getPendingActions,
  getActionsByStatus,
  approveAction as dbApproveAction,
  rejectAction as dbRejectAction,
  markActionExecuted,
  markActionFailed,
  expireOldActions,
  getRecentActions,
  getActionsStats,
} from '../database/repositories/actions.js';
import {
  logActionCreated,
  logActionApproved,
  logActionRejected,
  logActionExecuted,
  logActionFailed,
} from '../database/repositories/audit.js';
import { getConfig } from '../database/repositories/config.js';
import { approvalLogger } from '../utils/logger.js';
import { sendApprovalEmail } from '../email/sender.js';
import type {
  PendingAction,
  ActionType,
  Confidence,
} from '../agent/types.js';

export async function queueAction(data: {
  type: ActionType;
  payload: Record<string, any>;
  reasoning: string;
  expectedImpact: string;
  confidence: Confidence;
}): Promise<PendingAction> {
  const config = getConfig();
  const timeoutHours = config?.approval.timeoutHours || 24;

  approvalLogger.info('Queueing new action', { type: data.type });

  const action = createAction({ ...data, timeoutHours });
  logActionCreated(action.id, { type: data.type, reasoning: data.reasoning });

  try {
    await sendApprovalEmail(action);
  } catch (error) {
    approvalLogger.error('Failed to send approval email', error);
  }

  return action;
}

export function requiresApproval(type: ActionType, amount?: number): boolean {
  const config = getConfig();
  if (!config) return true;
  if (config.approval.requireApprovalFor.includes(type)) {
    if (amount !== undefined && config.approval.autoApproveBelow > 0) {
      return amount >= config.approval.autoApproveBelow;
    }
    return true;
  }
  return false;
}

export function approve(token: string, approvedBy?: string): PendingAction | null {
  const action = dbApproveAction(token, approvedBy);
  if (action) logActionApproved(action.id, approvedBy);
  return action;
}

export function reject(token: string, rejectedBy?: string, reason?: string): PendingAction | null {
  const action = dbRejectAction(token, rejectedBy);
  if (action) logActionRejected(action.id, rejectedBy, reason);
  return action;
}

export function markExecuted(actionId: string, result: Record<string, any>): boolean {
  const success = markActionExecuted(actionId, result);
  if (success) logActionExecuted(actionId, result);
  return success;
}

export function markFailed(actionId: string, error: string | Error): boolean {
  const errorMessage = error instanceof Error ? error.message : error;
  const success = markActionFailed(actionId, { error: errorMessage });
  if (success) logActionFailed(actionId, error);
  return success;
}

export function getPending(): PendingAction[] { return getPendingActions(); }
export function getApprovedActions(): PendingAction[] { return getActionsByStatus('approved'); }
export function getById(id: string): PendingAction | null { return getActionById(id); }
export function getByToken(token: string): PendingAction | null { return getActionByToken(token); }
export function expireOld(): number { return expireOldActions(); }
export function getRecent(limit: number = 10): PendingAction[] { return getRecentActions(limit); }
export function getStats() { return getActionsStats(); }

export function getApprovalUrl(action: PendingAction): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:6081';
  return `${baseUrl}/webhook/approve/${action.approvalToken}`;
}

export function getRejectionUrl(action: PendingAction): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:6081';
  return `${baseUrl}/webhook/reject/${action.approvalToken}`;
}

export function getActionTypeName(type: ActionType): string {
  const names: Record<ActionType, string> = {
    create_post: 'Nov\u00fd p\u0159\u00edsp\u011bvek',
    boost_post: 'Propagace p\u0159\u00edsp\u011bvku',
    create_campaign: 'Nov\u00e1 kampan\u011b',
    adjust_budget: '\u00daprava rozpo\u010dtu',
    pause_campaign: 'Pozastaven\u00ed kampan\u011b',
    resume_campaign: 'Obnoven\u00ed kampan\u011b',
    create_ad: 'Nov\u00e1 reklama',
    modify_targeting: 'Zm\u011bna c\u00edlen\u00ed',
  };
  return names[type] || type;
}

export function formatActionForDisplay(action: PendingAction) {
  return {
    id: action.id,
    token: action.approvalToken,
    type: action.type,
    typeName: getActionTypeName(action.type),
    status: action.status,
    createdAt: action.createdAt.toISOString(),
    expiresAt: action.expiresAt.toISOString(),
    reasoning: action.reasoning,
    expectedImpact: action.expectedImpact,
    confidence: action.confidence,
    payload: action.payload,
  };
}
