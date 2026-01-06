/**
 * Audit Log Repository - Logging all actions and events
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index.js';
import type { AuditLogEntry } from '../../agent/types.js';

interface AuditRow {
  id: string;
  timestamp: string;
  action_id: string | null;
  event_type: string;
  details: string | null;
  user_id: string | null;
}

function rowToEntry(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp),
    actionId: row.action_id || undefined,
    eventType: row.event_type as AuditLogEntry['eventType'],
    details: row.details ? JSON.parse(row.details) : {},
    userId: row.user_id || undefined,
  };
}

/**
 * Log an event
 */
export function logEvent(data: {
  actionId?: string;
  eventType: AuditLogEntry['eventType'];
  details?: Record<string, any>;
  userId?: string;
}): AuditLogEntry {
  const db = getDatabase();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO audit_log (id, action_id, event_type, details, user_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.actionId || null,
    data.eventType,
    data.details ? JSON.stringify(data.details) : null,
    data.userId || null
  );

  return getLogById(id)!;
}

/**
 * Get log entry by ID
 */
export function getLogById(id: string): AuditLogEntry | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM audit_log WHERE id = ?');
  const row = stmt.get(id) as AuditRow | undefined;
  return row ? rowToEntry(row) : null;
}

/**
 * Get logs for a specific action
 */
export function getLogsForAction(actionId: string): AuditLogEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM audit_log
    WHERE action_id = ?
    ORDER BY timestamp ASC
  `);
  const rows = stmt.all(actionId) as AuditRow[];
  return rows.map(rowToEntry);
}

/**
 * Get recent logs
 */
export function getRecentLogs(limit: number = 50): AuditLogEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM audit_log
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as AuditRow[];
  return rows.map(rowToEntry);
}

/**
 * Get logs by event type
 */
export function getLogsByEventType(eventType: AuditLogEntry['eventType'], limit: number = 50): AuditLogEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM audit_log
    WHERE event_type = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const rows = stmt.all(eventType, limit) as AuditRow[];
  return rows.map(rowToEntry);
}

/**
 * Get logs for a date range
 */
export function getLogsByDateRange(since: Date, until: Date): AuditLogEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM audit_log
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC
  `);
  const rows = stmt.all(since.toISOString(), until.toISOString()) as AuditRow[];
  return rows.map(rowToEntry);
}

/**
 * Get logs for today
 */
export function getTodayLogs(): AuditLogEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLogsByDateRange(today, tomorrow);
}

/**
 * Log action created
 */
export function logActionCreated(actionId: string, details?: Record<string, any>): AuditLogEntry {
  return logEvent({
    actionId,
    eventType: 'created',
    details: details || { message: 'Action created' },
  });
}

/**
 * Log action approved
 */
export function logActionApproved(actionId: string, approvedBy?: string): AuditLogEntry {
  return logEvent({
    actionId,
    eventType: 'approved',
    details: { message: 'Action approved', approvedBy },
    userId: approvedBy,
  });
}

/**
 * Log action rejected
 */
export function logActionRejected(actionId: string, rejectedBy?: string, reason?: string): AuditLogEntry {
  return logEvent({
    actionId,
    eventType: 'rejected',
    details: { message: 'Action rejected', rejectedBy, reason },
    userId: rejectedBy,
  });
}

/**
 * Log action executed
 */
export function logActionExecuted(actionId: string, result?: Record<string, any>): AuditLogEntry {
  return logEvent({
    actionId,
    eventType: 'executed',
    details: { message: 'Action executed successfully', result },
  });
}

/**
 * Log action failed
 */
export function logActionFailed(actionId: string, error: string | Error): AuditLogEntry {
  return logEvent({
    actionId,
    eventType: 'failed',
    details: {
      message: 'Action execution failed',
      error: error instanceof Error ? error.message : error,
    },
  });
}

/**
 * Log system event
 */
export function logSystemEvent(message: string, details?: Record<string, any>): AuditLogEntry {
  return logEvent({
    eventType: 'system',
    details: { message, ...details },
  });
}

/**
 * Clean old logs (older than X days)
 */
export function cleanOldLogs(daysToKeep: number = 90): number {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const stmt = db.prepare('DELETE FROM audit_log WHERE timestamp < ?');
  const result = stmt.run(cutoffDate.toISOString());
  return result.changes;
}

/**
 * Get log statistics
 */
export function getLogStats(): {
  total: number;
  byEventType: Record<string, number>;
  today: number;
  thisWeek: number;
} {
  const db = getDatabase();

  // Total count
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log');
  const total = (totalStmt.get() as { count: number }).count;

  // By event type
  const byTypeStmt = db.prepare(`
    SELECT event_type, COUNT(*) as count
    FROM audit_log
    GROUP BY event_type
  `);
  const byTypeRows = byTypeStmt.all() as Array<{ event_type: string; count: number }>;
  const byEventType: Record<string, number> = {};
  for (const row of byTypeRows) {
    byEventType[row.event_type] = row.count;
  }

  // Today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= ?');
  const todayCount = (todayStmt.get(today.toISOString()) as { count: number }).count;

  // This week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= ?');
  const weekCount = (weekStmt.get(weekAgo.toISOString()) as { count: number }).count;

  return {
    total,
    byEventType,
    today: todayCount,
    thisWeek: weekCount,
  };
}
