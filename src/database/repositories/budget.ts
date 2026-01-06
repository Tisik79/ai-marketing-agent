/**
 * Budget Repository - Budget tracking and management
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index.js';
import type { BudgetTracking } from '../../agent/types.js';

interface BudgetRow {
  id: string;
  date: string;
  spent: number;
  campaign_id: string | null;
  description: string | null;
  created_at: string;
}

function rowToTracking(row: BudgetRow): BudgetTracking {
  return {
    id: row.id,
    date: new Date(row.date),
    spent: row.spent,
    campaignId: row.campaign_id || undefined,
    description: row.description || undefined,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Record a spending entry
 */
export function recordSpending(data: {
  spent: number;
  campaignId?: string;
  description?: string;
  date?: Date;
}): BudgetTracking {
  const db = getDatabase();
  const id = uuidv4();
  const date = data.date || new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const stmt = db.prepare(`
    INSERT INTO budget_tracking (id, date, spent, campaign_id, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, dateStr, data.spent, data.campaignId || null, data.description || null);

  return getSpendingById(id)!;
}

/**
 * Get spending by ID
 */
export function getSpendingById(id: string): BudgetTracking | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM budget_tracking WHERE id = ?');
  const row = stmt.get(id) as BudgetRow | undefined;
  return row ? rowToTracking(row) : null;
}

/**
 * Get spending for a specific date
 */
export function getDailySpending(date: Date): number {
  const db = getDatabase();
  const dateStr = date.toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(spent), 0) as total
    FROM budget_tracking
    WHERE date = ?
  `);
  const result = stmt.get(dateStr) as { total: number };
  return result.total;
}

/**
 * Get spending for a date range
 */
export function getSpendingByDateRange(since: Date, until: Date): BudgetTracking[] {
  const db = getDatabase();
  const sinceStr = since.toISOString().split('T')[0];
  const untilStr = until.toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT * FROM budget_tracking
    WHERE date >= ? AND date <= ?
    ORDER BY date DESC
  `);
  const rows = stmt.all(sinceStr, untilStr) as BudgetRow[];
  return rows.map(rowToTracking);
}

/**
 * Get total spending for a date range
 */
export function getTotalSpending(since: Date, until: Date): number {
  const db = getDatabase();
  const sinceStr = since.toISOString().split('T')[0];
  const untilStr = until.toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT COALESCE(SUM(spent), 0) as total
    FROM budget_tracking
    WHERE date >= ? AND date <= ?
  `);
  const result = stmt.get(sinceStr, untilStr) as { total: number };
  return result.total;
}

/**
 * Get spending for current month
 */
export function getCurrentMonthSpending(): number {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return getTotalSpending(firstOfMonth, lastOfMonth);
}

/**
 * Get spending for current week
 */
export function getCurrentWeekSpending(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return getTotalSpending(monday, sunday);
}

/**
 * Get today's spending
 */
export function getTodaySpending(): number {
  return getDailySpending(new Date());
}

/**
 * Get spending by campaign
 */
export function getSpendingByCampaign(campaignId: string, since?: Date, until?: Date): number {
  const db = getDatabase();

  if (since && until) {
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = until.toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(spent), 0) as total
      FROM budget_tracking
      WHERE campaign_id = ? AND date >= ? AND date <= ?
    `);
    const result = stmt.get(campaignId, sinceStr, untilStr) as { total: number };
    return result.total;
  }

  const stmt = db.prepare(`
    SELECT COALESCE(SUM(spent), 0) as total
    FROM budget_tracking
    WHERE campaign_id = ?
  `);
  const result = stmt.get(campaignId) as { total: number };
  return result.total;
}

/**
 * Get daily spending breakdown for a date range
 */
export function getDailyBreakdown(since: Date, until: Date): Array<{ date: string; total: number }> {
  const db = getDatabase();
  const sinceStr = since.toISOString().split('T')[0];
  const untilStr = until.toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT date, SUM(spent) as total
    FROM budget_tracking
    WHERE date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date ASC
  `);
  return stmt.all(sinceStr, untilStr) as Array<{ date: string; total: number }>;
}

/**
 * Get campaign spending breakdown
 */
export function getCampaignBreakdown(since?: Date, until?: Date): Array<{ campaignId: string; total: number }> {
  const db = getDatabase();

  if (since && until) {
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = until.toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT campaign_id as campaignId, SUM(spent) as total
      FROM budget_tracking
      WHERE campaign_id IS NOT NULL AND date >= ? AND date <= ?
      GROUP BY campaign_id
      ORDER BY total DESC
    `);
    return stmt.all(sinceStr, untilStr) as Array<{ campaignId: string; total: number }>;
  }

  const stmt = db.prepare(`
    SELECT campaign_id as campaignId, SUM(spent) as total
    FROM budget_tracking
    WHERE campaign_id IS NOT NULL
    GROUP BY campaign_id
    ORDER BY total DESC
  `);
  return stmt.all() as Array<{ campaignId: string; total: number }>;
}

/**
 * Check if daily limit would be exceeded
 */
export function wouldExceedDailyLimit(amount: number, dailyLimit: number): boolean {
  const todaySpending = getTodaySpending();
  return (todaySpending + amount) > dailyLimit;
}

/**
 * Check if monthly budget would be exceeded
 */
export function wouldExceedMonthlyBudget(amount: number, monthlyBudget: number): boolean {
  const monthlySpending = getCurrentMonthSpending();
  return (monthlySpending + amount) > monthlyBudget;
}

/**
 * Get budget status
 */
export function getBudgetStatus(monthlyBudget: number, dailyLimit: number): {
  monthlyBudget: number;
  monthlySpent: number;
  monthlyRemaining: number;
  monthlyPercentUsed: number;
  dailyLimit: number;
  todaySpent: number;
  todayRemaining: number;
  todayPercentUsed: number;
} {
  const monthlySpent = getCurrentMonthSpending();
  const todaySpent = getTodaySpending();

  return {
    monthlyBudget,
    monthlySpent,
    monthlyRemaining: Math.max(0, monthlyBudget - monthlySpent),
    monthlyPercentUsed: monthlyBudget > 0 ? Math.round((monthlySpent / monthlyBudget) * 100) : 0,
    dailyLimit,
    todaySpent,
    todayRemaining: Math.max(0, dailyLimit - todaySpent),
    todayPercentUsed: dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : 0,
  };
}

/**
 * Clean old budget entries (older than X days)
 */
export function cleanOldEntries(daysToKeep: number = 365): number {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const stmt = db.prepare('DELETE FROM budget_tracking WHERE date < ?');
  const result = stmt.run(cutoffStr);
  return result.changes;
}
