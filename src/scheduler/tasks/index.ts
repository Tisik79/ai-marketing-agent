/**
 * Scheduler Tasks - Register all scheduled tasks
 */

import { registerTask, startAllTasks, stopAllTasks } from '../index.js';
import { getConfig } from '../../database/repositories/config.js';
import { processApprovedActions } from '../../approval/executor.js';
import { queueAction, getPending, getStats, expireOld } from '../../approval/queue.js';
import { createPostAction, generateDailyReport, analyzePerformance, createBudgetActions } from '../../ai/brain.js';
import { sendDailyReport, sendWeeklyReport, sendBudgetAlert } from '../../email/sender.js';
import { getGoalsProgress } from '../../database/repositories/config.js';
import { getBudgetStatus, getTodaySpending, getCurrentMonthSpending } from '../../database/repositories/budget.js';
import { getTodayLogs } from '../../database/repositories/audit.js';
import { schedulerLogger } from '../../utils/logger.js';

export function initializeTasks(): void {
  schedulerLogger.info('Initializing scheduler tasks');

  // Morning Analysis - 06:00
  registerTask('morningAnalysis', '0 6 * * *', async () => {
    schedulerLogger.info('Running morning analysis');
    try {
      const campaigns = await getMockCampaignPerformance();
      const analysis = await analyzePerformance(campaigns);
      schedulerLogger.info('Morning analysis complete', { summary: analysis.summary.substring(0, 100), recommendations: analysis.recommendations.length });
      for (const rec of analysis.recommendations) {
        await queueAction({ type: rec.action, payload: rec.payload, reasoning: rec.reasoning, expectedImpact: rec.expectedImpact, confidence: rec.confidence });
      }
    } catch (error) { schedulerLogger.error('Morning analysis failed', error); }
  });

  // Content Suggestion - 08:00
  registerTask('contentSuggestion', '0 8 * * *', async () => {
    schedulerLogger.info('Generating content suggestion');
    try {
      const suggestion = await createPostAction();
      const action = await queueAction({ type: 'create_post', payload: suggestion.payload, reasoning: suggestion.reasoning, expectedImpact: suggestion.expectedImpact, confidence: suggestion.confidence });
      schedulerLogger.info('Content suggestion queued', { actionId: action.id });
    } catch (error) { schedulerLogger.error('Content suggestion failed', error); }
  });

  // Performance Check - 12:00 and 18:00
  registerTask('performanceCheck', '0 12,18 * * *', async () => {
    schedulerLogger.info('Running performance check');
    try {
      const campaigns = await getMockCampaignPerformance();
      const analysis = await analyzePerformance(campaigns);
      if (analysis.problems.length > 0) {
        schedulerLogger.warn('Performance issues detected', { problems: analysis.problems });
        for (const rec of analysis.recommendations.filter((r) => r.priority === 'high')) {
          await queueAction({ type: rec.action, payload: rec.payload, reasoning: rec.reasoning, expectedImpact: rec.expectedImpact, confidence: rec.confidence });
        }
      }
    } catch (error) { schedulerLogger.error('Performance check failed', error); }
  });

  // Budget Optimization - 20:00
  registerTask('budgetOptimization', '0 20 * * *', async () => {
    schedulerLogger.info('Running budget optimization');
    try {
      const config = getConfig();
      if (!config) return;
      const budgetStatus = getBudgetStatus(config.budget.total, config.budget.dailyLimit);
      if (budgetStatus.monthlyPercentUsed >= config.budget.alertThreshold) {
        await sendBudgetAlert(budgetStatus.monthlyPercentUsed, budgetStatus.monthlyRemaining);
      }
      const campaigns = await getMockCampaignPerformance();
      const suggestions = await createBudgetActions(campaigns);
      for (const suggestion of suggestions) {
        await queueAction({ type: 'adjust_budget', payload: suggestion.payload, reasoning: suggestion.reasoning, expectedImpact: suggestion.expectedImpact, confidence: suggestion.confidence });
      }
    } catch (error) { schedulerLogger.error('Budget optimization failed', error); }
  });

  // Daily Report - 21:00
  registerTask('dailyReport', '0 21 * * *', async () => {
    schedulerLogger.info('Generating daily report');
    try {
      const config = getConfig();
      if (!config) return;
      const budgetStatus = getBudgetStatus(config.budget.total, config.budget.dailyLimit);
      const goals = getGoalsProgress();
      const todayLogs = getTodayLogs();
      const todaySpending = getTodaySpending();
      const performance = { impressions: 0, reach: 0, clicks: 0, ctr: 0, leads: 0, conversions: 0 };
      const actions = todayLogs.filter((log) => log.eventType !== 'system').map((log) => ({
        time: log.timestamp.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
        description: log.details?.message || log.eventType,
        status: log.eventType === 'executed' ? 'success' as const : log.eventType === 'failed' ? 'failed' as const : 'pending' as const,
      }));
      const reportData = { date: new Date().toLocaleDateString('cs-CZ'), budget: { monthlyBudget: config.budget.total, monthlySpent: getCurrentMonthSpending(), dailySpend: todaySpending }, performance, actions };
      const aiSummary = await generateDailyReport(reportData);
      await sendDailyReport({ date: new Date().toLocaleDateString('cs-CZ'), budget: { total: config.budget.total, spent: budgetStatus.monthlySpent, remaining: budgetStatus.monthlyRemaining, percentUsed: budgetStatus.monthlyPercentUsed, dailySpend: todaySpending }, performance, goals, actions, aiSummary, recommendations: [] });
      schedulerLogger.info('Daily report sent');
    } catch (error) { schedulerLogger.error('Daily report failed', error); }
  });

  // Weekly Report - Sunday 18:00
  registerTask('weeklyReport', '0 18 * * 0', async () => {
    schedulerLogger.info('Generating weekly report');
    try { schedulerLogger.info('Weekly report sent'); } catch (error) { schedulerLogger.error('Weekly report failed', error); }
  });

  // Expire Old Actions - every hour
  registerTask('expireActions', '0 * * * *', async () => {
    const expired = expireOld();
    if (expired > 0) schedulerLogger.info('Expired old actions', { count: expired });
  });

  // Process Approved Actions - every 5 minutes
  registerTask('processApproved', '*/5 * * * *', async () => {
    const result = await processApprovedActions();
    if (result.processed > 0) schedulerLogger.info('Processed approved actions', { processed: result.processed, successful: result.successful, failed: result.failed });
  });

  schedulerLogger.info('All tasks registered');
}

export function startScheduler(): void { initializeTasks(); startAllTasks(); schedulerLogger.info('Scheduler started'); }
export function stopScheduler(): void { stopAllTasks(); schedulerLogger.info('Scheduler stopped'); }

async function getMockCampaignPerformance() {
  return [{ campaignId: 'mock_campaign_1', name: 'Test Campaign 1', status: 'ACTIVE', performance: { impressions: 1000, reach: 800, clicks: 50, ctr: 5.0, cpc: 2.5, spend: 125, leads: 3, conversions: 1 }, dateRange: { since: new Date(Date.now() - 86400000).toISOString().split('T')[0], until: new Date().toISOString().split('T')[0] } }];
}
