/**
 * Actions Repository - CRUD operations for pending actions
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index.js';
import type { PendingAction, ActionType, ActionStatus, Confidence } from '../../agent/types.js';

interface ActionRow {
  id: string;
  created_at: string;
  expires_at: string;
  type: string;
  payload: string;
  reasoning: string | null;
  expected_impact: string | null;
  confidence: string | null;
  status: string;
  approval_token: string | null;
  approved_at: string | null;
  approved_by: string | null;
  executed_at: string | null;
  execution_result: string | null;
}

function rowToAction(row: ActionRow): PendingAction {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    type: row.type as ActionType,
    payload: JSON.parse(row.payload),
    reasoning: row.reasoning || '',
    expectedImpact: row.expected_impact || '',
    confidence: (row.confidence || 'medium') as Confidence,
    status: row.status as ActionStatus,
    approvalToken: row.approval_token || '',
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    approvedBy: row.approved_by || undefined,
    executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
    executionResult: row.execution_result ? JSON.parse(row.execution_result) : undefined,
  };
}

/**
 * Create a new pending action
 */
export function createAction(data: {
  type: ActionType;
  payload: Record<string, any>;
  reasoning: string;
  expectedImpact: string;
  confidence: Confidence;
  timeoutHours?: number;
}): PendingAction {
  const db = getDatabase();
  const id = uuidv4();
  const approvalToken = uuidv4();
  const timeoutHours = data.timeoutHours || 24;
  const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT INTO pending_actions (
      id, expires_at, type, payload, reasoning, expected_impact, confidence, approval_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    expiresAt.toISOString(),
    data.type,
    JSON.stringify(data.payload),
    data.reasoning,
    data.expectedImpact,
    data.confidence,
    approvalToken
  );

  return getActionById(id)!;
}

/**
 * Get action by ID
 */
export function getActionById(id: string): PendingAction | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM pending_actions WHERE id = ?');
  const row = stmt.get(id) as ActionRow | undefined;
  return row ? rowToAction(row) : null;
}

/**
 * Get action by approval token
 */
export function getActionByToken(token: string): PendingAction | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM pending_actions WHERE approval_token = ?');
  const row = stmt.get(token) as ActionRow | undefined;
  return row ? rowToAction(row) : null;
}

/**
 * Get all pending actions
 */
export function getPendingActions(): PendingAction[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM pending_actions
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `);
  const rows = stmt.all() as ActionRow[];
  return rows.map(rowToAction);
}

/**
 * Get actions by status
 */
export function getActionsByStatus(status: ActionStatus): PendingAction[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM pending_actions WHERE status = ? ORDER BY created_at DESC');
  const rows = stmt.all(status) as ActionRow[];
  return rows.map(rowToAction);
}

/**
 * Get expired pending actions
 */
export function getExpiredActions(): PendingAction[] {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT * FROM pending_actions
    WHERE status = 'pending' AND expires_at < ?
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(now) as ActionRow[];
  return rows.map(rowToAction);
}

/**
 * Update action status
 */
export function updateActionStatus(
  id: string,
  status: ActionStatus,
  extra?: {
    approvedBy?: string;
    executionResult?: Record<string, any>;
  }
): boolean {
  const db = getDatabase();
  let sql = 'UPDATE pending_actions SET status = ?';
  const params: any[] = [status];

  if (status === 'approved') {
    sql += ', approved_at = ?';
    params.push(new Date().toISOString());
    if (extra?.approvedBy) {
      sql += ', approved_by = ?';
      params.push(extra.approvedBy);
    }
  }

  if (status === 'executed' || status === 'failed') {
    sql += ', executed_at = ?';
    params.push(new Date().toISOString());
    if (extra?.executionResult) {
      sql += ', execution_result = ?';
      params.push(JSON.stringify(extra.executionResult));
    }
  }

  sql += ' WHERE id = ?';
  params.push(id);

  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes > 0;
}

/**
 * Approve action by token
 */
export function approveAction(token: string, approvedBy?: string): PendingAction | null {
  const action = getActionByToken(token);
  if (!action) return null;
  if (action.status !== 'pending') return null;
  if (new Date() > action.expiresAt) {
    updateActionStatus(action.id, 'expired');
    return null;
  }

  updateActionStatus(action.id, 'approved', { approvedBy });
  return getActionById(action.id);
}

/**
 * Reject action by token
 */
export function rejectAction(token: string, rejectedBy?: string): PendingAction | null {
  const action = getActionByToken(token);
  if (!action) return null;
  if (action.status !== 'pending') return null;

  updateActionStatus(action.id, 'rejected', { approvedBy: rejectedBy });
  return getActionById(action.id);
}

/**
 * Mark action as executed
 */
export function markActionExecuted(id: string, result: Record<string, any>): boolean {
  return updateActionStatus(id, 'executed', { executionResult: result });
}

/**
 * Mark action as failed
 */
export function markActionFailed(id: string, error: Record<string, any>): boolean {
  return updateActionStatus(id, 'failed', { executionResult: error });
}

/**
 * Expire old pending actions
 */
export function expireOldActions(): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE pending_actions
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < ?
  `);
  const result = stmt.run(now);
  return result.changes;
}

/**
 * Get recent actions (last N)
 */
export function getRecentActions(limit: number = 10): PendingAction[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM pending_actions
    ORDER BY created_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as ActionRow[];
  return rows.map(rowToAction);
}

/**
 * Get actions statistics
 */
export function getActionsStats(): {
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
  failed: number;
  expired: number;
} {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM pending_actions
    GROUP BY status
  `);
  const rows = stmt.all() as Array<{ status: string; count: number }>;

  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    executed: 0,
    failed: 0,
    expired: 0,
  };

  for (const row of rows) {
    if (row.status in stats) {
      stats[row.status as keyof typeof stats] = row.count;
    }
  }

  return stats;
}
