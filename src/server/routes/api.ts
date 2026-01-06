/**
 * API Routes - Dashboard REST API
 */

import { Router, Request, Response } from 'express';
import { getConfig, getGoalsProgress, saveConfig, createGoal, updateGoal, deleteGoal } from '../../database/repositories/config.js';
import { getPending, getRecent, getStats, formatActionForDisplay } from '../../approval/queue.js';
import { getBudgetStatus, getDailyBreakdown, getCampaignBreakdown } from '../../database/repositories/budget.js';
import { getRecentLogs, getLogStats } from '../../database/repositories/audit.js';
import { getRecentMessages, saveMessage, clearHistory } from '../../database/repositories/chat.js';
import { chat } from '../../ai/brain.js';
import { serverLogger } from '../../utils/logger.js';
import type { Goal } from '../../agent/types.js';

const router = Router();

// === Dashboard ===

/**
 * GET /api/dashboard
 * Main dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    if (!config) {
      return res.status(500).json({ error: 'Configuration not initialized' });
    }

    const budgetStatus = getBudgetStatus(config.budget.total, config.budget.dailyLimit);
    const goals = getGoalsProgress();
    const pending = getPending();
    const recent = getRecent(5);
    const actionStats = getStats();

    res.json({
      agent: {
        name: config.name,
        status: 'active',
      },
      budget: budgetStatus,
      goals,
      pendingActions: pending.map(formatActionForDisplay),
      recentActions: recent.map(formatActionForDisplay),
      stats: actionStats,
    });
  } catch (error) {
    serverLogger.error('Error fetching dashboard data', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dashboard/stats
 * Dashboard statistics
 */
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    if (!config) {
      return res.status(500).json({ error: 'Configuration not initialized' });
    }

    const budgetStatus = getBudgetStatus(config.budget.total, config.budget.dailyLimit);
    const actionStats = getStats();
    const logStats = getLogStats();

    res.json({
      budget: budgetStatus,
      actions: actionStats,
      logs: logStats,
    });
  } catch (error) {
    serverLogger.error('Error fetching stats', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dashboard/chart/:type
 * Chart data
 */
router.get('/dashboard/chart/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { days = '7' } = req.query;

    const daysNum = parseInt(days as string, 10);
    const since = new Date();
    since.setDate(since.getDate() - daysNum);
    const until = new Date();

    switch (type) {
      case 'budget':
        const budgetData = getDailyBreakdown(since, until);
        res.json({ data: budgetData });
        break;

      case 'campaigns':
        const campaignData = getCampaignBreakdown(since, until);
        res.json({ data: campaignData });
        break;

      default:
        res.status(400).json({ error: 'Unknown chart type' });
    }
  } catch (error) {
    serverLogger.error('Error fetching chart data', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Approvals ===

/**
 * GET /api/approvals
 * List pending approvals
 */
router.get('/approvals', async (req: Request, res: Response) => {
  try {
    const pending = getPending();
    res.json({ approvals: pending.map(formatActionForDisplay) });
  } catch (error) {
    serverLogger.error('Error fetching approvals', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Goals ===

/**
 * GET /api/goals
 * List all goals
 */
router.get('/goals', async (req: Request, res: Response) => {
  try {
    const goals = getGoalsProgress();
    res.json({ goals });
  } catch (error) {
    serverLogger.error('Error fetching goals', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/goals
 * Create a new goal
 */
router.post('/goals', async (req: Request, res: Response) => {
  try {
    const { type, target, period, priority } = req.body;

    if (!type || !target || !period) {
      return res.status(400).json({ error: 'Missing required fields: type, target, period' });
    }

    const goal = createGoal({
      type,
      target: parseInt(target, 10),
      current: 0,
      period,
      priority: priority || 'medium',
    });

    res.status(201).json({ goal });
  } catch (error) {
    serverLogger.error('Error creating goal', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/goals/:id
 * Update a goal
 */
router.put('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<Goal> = {};

    if (req.body.target !== undefined) updates.target = parseInt(req.body.target, 10);
    if (req.body.current !== undefined) updates.current = parseInt(req.body.current, 10);
    if (req.body.priority !== undefined) updates.priority = req.body.priority;

    const goal = updateGoal(id, updates);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ goal });
  } catch (error) {
    serverLogger.error('Error updating goal', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/goals/:id
 * Delete a goal
 */
router.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteGoal(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ success: true });
  } catch (error) {
    serverLogger.error('Error deleting goal', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Chat ===

/**
 * GET /api/chat/history
 * Get chat history
 */
router.get('/chat/history', async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;
    const messages = getRecentMessages(parseInt(limit as string, 10));
    res.json({ messages });
  } catch (error) {
    serverLogger.error('Error fetching chat history', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chat
 * Send message to AI
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await chat(message);
    res.json({ response });
  } catch (error) {
    serverLogger.error('Error in chat', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * DELETE /api/chat/history
 * Clear chat history
 */
router.delete('/chat/history', async (req: Request, res: Response) => {
  try {
    const deleted = clearHistory();
    res.json({ deleted });
  } catch (error) {
    serverLogger.error('Error clearing chat history', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Settings ===

/**
 * GET /api/settings
 * Get agent settings
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    if (!config) {
      return res.status(500).json({ error: 'Configuration not initialized' });
    }

    // Return all configuration (don't expose API keys)
    res.json({
      name: config.name,
      facebookPageId: config.facebookPageId,
      facebookAccountId: config.facebookAccountId,
      budget: config.budget,
      strategy: config.strategy,
      approval: {
        email: config.approval.email,
        timeoutHours: config.approval.timeoutHours,
        autoApproveBelow: config.approval.autoApproveBelow,
        requireApprovalFor: config.approval.requireApprovalFor,
      },
      notifications: {
        ...config.notifications,
        email: config.approval.email, // For the notifications form
      },
    });
  } catch (error) {
    serverLogger.error('Error fetching settings', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/settings
 * Update agent settings
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const config = saveConfig(updates);
    res.json({ success: true, config: { name: config.name } });
  } catch (error) {
    serverLogger.error('Error updating settings', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Logs ===

/**
 * GET /api/logs
 * Get audit logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;
    const logs = getRecentLogs(parseInt(limit as string, 10));
    res.json({ logs });
  } catch (error) {
    serverLogger.error('Error fetching logs', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Agent Control ===

/**
 * GET /api/agent/status
 * Get agent status
 */
router.get('/agent/status', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    res.json({
      name: config?.name || 'AI Marketing Agent',
      status: 'active',
      uptime: process.uptime(),
    });
  } catch (error) {
    serverLogger.error('Error fetching agent status', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === Health Check ===

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
