/**
 * Config Repository - Agent configuration and goals management
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index.js';
import type { AgentConfig, Goal, ActionType } from '../../agent/types.js';

interface ConfigRow {
  id: string;
  name: string;
  facebook_page_id: string | null;
  facebook_account_id: string | null;
  budget_total: number;
  budget_period: string;
  budget_daily_limit: number;
  budget_alert_threshold: number;
  strategy_target_audience: string | null;
  strategy_tone: string | null;
  strategy_topics: string | null;
  strategy_post_frequency: string;
  strategy_preferred_times: string | null;
  approval_email: string | null;
  approval_require_for: string | null;
  approval_auto_approve_below: number;
  approval_timeout_hours: number;
  notifications_daily: number;
  notifications_weekly: number;
  notifications_instant: number;
  created_at: string;
  updated_at: string;
}

interface GoalRow {
  id: string;
  type: string;
  target: number;
  current: number;
  period: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    type: row.type as Goal['type'],
    target: row.target,
    current: row.current,
    period: row.period as Goal['period'],
    priority: row.priority as Goal['priority'],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToConfig(row: ConfigRow, goals: Goal[]): AgentConfig {
  return {
    id: row.id,
    name: row.name,
    facebookPageId: row.facebook_page_id || '',
    facebookAccountId: row.facebook_account_id || '',
    budget: {
      total: row.budget_total,
      period: row.budget_period as 'monthly' | 'weekly',
      dailyLimit: row.budget_daily_limit,
      alertThreshold: row.budget_alert_threshold,
    },
    goals,
    strategy: {
      targetAudience: row.strategy_target_audience || '',
      tone: row.strategy_tone || '',
      topics: row.strategy_topics ? JSON.parse(row.strategy_topics) : [],
      postFrequency: row.strategy_post_frequency as AgentConfig['strategy']['postFrequency'],
      preferredPostTimes: row.strategy_preferred_times ? JSON.parse(row.strategy_preferred_times) : [],
    },
    approval: {
      email: row.approval_email || '',
      requireApprovalFor: row.approval_require_for ? JSON.parse(row.approval_require_for) : [],
      autoApproveBelow: row.approval_auto_approve_below,
      timeoutHours: row.approval_timeout_hours,
    },
    notifications: {
      dailyReport: row.notifications_daily === 1,
      weeklyReport: row.notifications_weekly === 1,
      instantAlerts: row.notifications_instant === 1,
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get agent configuration
 */
export function getConfig(id: string = 'default'): AgentConfig | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agent_config WHERE id = ?');
  const row = stmt.get(id) as ConfigRow | undefined;

  if (!row) return null;

  const goals = getAllGoals();
  return rowToConfig(row, goals);
}

/**
 * Create or update agent configuration
 */
export function saveConfig(config: Partial<AgentConfig> & { id?: string }): AgentConfig {
  const db = getDatabase();
  const id = config.id || 'default';

  const existing = getConfig(id);

  if (existing) {
    // Update
    const stmt = db.prepare(`
      UPDATE agent_config SET
        name = COALESCE(?, name),
        facebook_page_id = COALESCE(?, facebook_page_id),
        facebook_account_id = COALESCE(?, facebook_account_id),
        budget_total = COALESCE(?, budget_total),
        budget_period = COALESCE(?, budget_period),
        budget_daily_limit = COALESCE(?, budget_daily_limit),
        budget_alert_threshold = COALESCE(?, budget_alert_threshold),
        strategy_target_audience = COALESCE(?, strategy_target_audience),
        strategy_tone = COALESCE(?, strategy_tone),
        strategy_topics = COALESCE(?, strategy_topics),
        strategy_post_frequency = COALESCE(?, strategy_post_frequency),
        strategy_preferred_times = COALESCE(?, strategy_preferred_times),
        approval_email = COALESCE(?, approval_email),
        approval_require_for = COALESCE(?, approval_require_for),
        approval_auto_approve_below = COALESCE(?, approval_auto_approve_below),
        approval_timeout_hours = COALESCE(?, approval_timeout_hours),
        notifications_daily = COALESCE(?, notifications_daily),
        notifications_weekly = COALESCE(?, notifications_weekly),
        notifications_instant = COALESCE(?, notifications_instant),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      config.name,
      config.facebookPageId,
      config.facebookAccountId,
      config.budget?.total,
      config.budget?.period,
      config.budget?.dailyLimit,
      config.budget?.alertThreshold,
      config.strategy?.targetAudience,
      config.strategy?.tone,
      config.strategy?.topics ? JSON.stringify(config.strategy.topics) : null,
      config.strategy?.postFrequency,
      config.strategy?.preferredPostTimes ? JSON.stringify(config.strategy.preferredPostTimes) : null,
      config.approval?.email,
      config.approval?.requireApprovalFor ? JSON.stringify(config.approval.requireApprovalFor) : null,
      config.approval?.autoApproveBelow,
      config.approval?.timeoutHours,
      config.notifications?.dailyReport !== undefined ? (config.notifications.dailyReport ? 1 : 0) : null,
      config.notifications?.weeklyReport !== undefined ? (config.notifications.weeklyReport ? 1 : 0) : null,
      config.notifications?.instantAlerts !== undefined ? (config.notifications.instantAlerts ? 1 : 0) : null,
      id
    );
  } else {
    // Insert
    const stmt = db.prepare(`
      INSERT INTO agent_config (
        id, name, facebook_page_id, facebook_account_id,
        budget_total, budget_period, budget_daily_limit, budget_alert_threshold,
        strategy_target_audience, strategy_tone, strategy_topics, strategy_post_frequency, strategy_preferred_times,
        approval_email, approval_require_for, approval_auto_approve_below, approval_timeout_hours,
        notifications_daily, notifications_weekly, notifications_instant
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      config.name || 'Marketing Agent',
      config.facebookPageId || null,
      config.facebookAccountId || null,
      config.budget?.total || 0,
      config.budget?.period || 'monthly',
      config.budget?.dailyLimit || 0,
      config.budget?.alertThreshold || 80,
      config.strategy?.targetAudience || null,
      config.strategy?.tone || null,
      config.strategy?.topics ? JSON.stringify(config.strategy.topics) : null,
      config.strategy?.postFrequency || 'daily',
      config.strategy?.preferredPostTimes ? JSON.stringify(config.strategy.preferredPostTimes) : null,
      config.approval?.email || null,
      config.approval?.requireApprovalFor ? JSON.stringify(config.approval.requireApprovalFor) : null,
      config.approval?.autoApproveBelow || 0,
      config.approval?.timeoutHours || 24,
      config.notifications?.dailyReport !== false ? 1 : 0,
      config.notifications?.weeklyReport !== false ? 1 : 0,
      config.notifications?.instantAlerts !== false ? 1 : 0
    );
  }

  return getConfig(id)!;
}

/**
 * Initialize default configuration from environment
 */
export function initConfigFromEnv(): AgentConfig {
  const config = saveConfig({
    id: 'default',
    name: process.env.AGENT_NAME || 'Marketing Agent',
    facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
    facebookAccountId: process.env.FACEBOOK_ACCOUNT_ID || '',
    budget: {
      total: parseInt(process.env.MONTHLY_BUDGET || '0', 10),
      period: 'monthly',
      dailyLimit: parseInt(process.env.DAILY_LIMIT || '0', 10),
      alertThreshold: parseInt(process.env.BUDGET_ALERT_THRESHOLD || '80', 10),
    },
    approval: {
      email: process.env.APPROVAL_EMAIL || '',
      requireApprovalFor: ['create_post', 'create_campaign', 'boost_post', 'adjust_budget'] as ActionType[],
      autoApproveBelow: parseInt(process.env.AUTO_APPROVE_BELOW || '0', 10),
      timeoutHours: parseInt(process.env.APPROVAL_TIMEOUT_HOURS || '24', 10),
    },
    notifications: {
      dailyReport: process.env.NOTIFICATIONS_DAILY !== 'false',
      weeklyReport: process.env.NOTIFICATIONS_WEEKLY !== 'false',
      instantAlerts: process.env.NOTIFICATIONS_INSTANT !== 'false',
    },
  });

  return config;
}

// === Goals Management ===

/**
 * Get all goals
 */
export function getAllGoals(): Goal[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM goals ORDER BY priority DESC, created_at ASC');
  const rows = stmt.all() as GoalRow[];
  return rows.map(rowToGoal);
}

/**
 * Get goal by ID
 */
export function getGoalById(id: string): Goal | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM goals WHERE id = ?');
  const row = stmt.get(id) as GoalRow | undefined;
  return row ? rowToGoal(row) : null;
}

/**
 * Create a new goal
 */
export function createGoal(data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
  const db = getDatabase();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO goals (id, type, target, current, period, priority)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.type, data.target, data.current || 0, data.period, data.priority || 'medium');

  return getGoalById(id)!;
}

/**
 * Update goal
 */
export function updateGoal(id: string, data: Partial<Goal>): Goal | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE goals SET
      type = COALESCE(?, type),
      target = COALESCE(?, target),
      current = COALESCE(?, current),
      period = COALESCE(?, period),
      priority = COALESCE(?, priority),
      updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(data.type, data.target, data.current, data.period, data.priority, id);

  return getGoalById(id);
}

/**
 * Update goal progress
 */
export function updateGoalProgress(id: string, current: number): Goal | null {
  return updateGoal(id, { current });
}

/**
 * Increment goal progress
 */
export function incrementGoalProgress(id: string, amount: number = 1): Goal | null {
  const goal = getGoalById(id);
  if (!goal) return null;
  return updateGoal(id, { current: goal.current + amount });
}

/**
 * Delete goal
 */
export function deleteGoal(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Reset goals for new period
 */
export function resetGoalsForPeriod(period: Goal['period']): number {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE goals SET current = 0, updated_at = datetime('now')
    WHERE period = ?
  `);
  const result = stmt.run(period);
  return result.changes;
}

/**
 * Get goals progress summary
 */
export function getGoalsProgress(): Array<Goal & { progress: number; onTrack: boolean }> {
  const goals = getAllGoals();
  const now = new Date();

  return goals.map((goal) => {
    const progress = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;

    // Determine if on track based on period progress
    let expectedProgress = 0;
    if (goal.period === 'daily') {
      expectedProgress = 100;
    } else if (goal.period === 'weekly') {
      const dayOfWeek = now.getDay() || 7; // 1-7
      expectedProgress = Math.round((dayOfWeek / 7) * 100);
    } else if (goal.period === 'monthly') {
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      expectedProgress = Math.round((dayOfMonth / daysInMonth) * 100);
    }

    const onTrack = progress >= expectedProgress * 0.8; // 80% tolerance

    return { ...goal, progress, onTrack };
  });
}
