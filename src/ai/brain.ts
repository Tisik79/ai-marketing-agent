/**
 * AI Brain - Main AI logic for marketing decisions
 */

import { sendMessage, generateJSON, type Message } from './client.js';
import {
  getMainSystemPrompt,
  getAnalysisPrompt,
  getContentPrompt,
  getBudgetOptimizationPrompt,
  getDailyReportPrompt,
  getChatSystemPrompt,
  getDecisionPrompt,
} from './prompts/system.js';
import { getConfig, getGoalsProgress } from '../database/repositories/config.js';
import { getContextMessages, saveMessage } from '../database/repositories/chat.js';
import { getBudgetStatus } from '../database/repositories/budget.js';
import { aiLogger } from '../utils/logger.js';
import { queueAction, formatActionForDisplay } from '../approval/queue.js';
import type {
  AgentConfig,
  AIDecision,
  CampaignPerformance,
  CreatePostPayload,
  AdjustBudgetPayload,
} from '../agent/types.js';

/**
 * Get the current agent configuration
 */
function getAgentConfig(): AgentConfig {
  const config = getConfig();
  if (!config) {
    throw new Error('Agent configuration not found. Please initialize the configuration first.');
  }
  return config;
}

/**
 * Analyze campaign performance and generate recommendations
 */
export async function analyzePerformance(
  campaigns: CampaignPerformance[]
): Promise<{
  summary: string;
  problems: string[];
  opportunities: string[];
  recommendations: AIDecision[];
}> {
  const config = getAgentConfig();
  const goals = getGoalsProgress();

  const systemPrompt = getMainSystemPrompt(config);
  const userPrompt = getAnalysisPrompt(campaigns, goals);

  aiLogger.info('Analyzing campaign performance', { campaignCount: campaigns.length });

  const response = await sendMessage(systemPrompt, [{ role: 'user', content: userPrompt }]);

  // Parse the response to extract structured data
  try {
    const analysis = await generateJSON<{
      summary: string;
      problems: string[];
      opportunities: string[];
      recommendations: Array<{
        action: string;
        payload: Record<string, any>;
        reasoning: string;
        expectedImpact: string;
        confidence: string;
        priority: string;
      }>;
    }>(
      systemPrompt,
      userPrompt + '\n\nOdpověz ve formátu JSON s klíči: summary, problems, opportunities, recommendations'
    );

    return {
      summary: analysis.summary,
      problems: analysis.problems,
      opportunities: analysis.opportunities,
      recommendations: analysis.recommendations.map((r) => ({
        action: r.action as AIDecision['action'],
        payload: r.payload,
        reasoning: r.reasoning,
        expectedImpact: r.expectedImpact,
        confidence: r.confidence as AIDecision['confidence'],
        priority: r.priority as AIDecision['priority'],
      })),
    };
  } catch {
    // Fallback to unstructured response
    aiLogger.warn('Failed to parse structured analysis, returning raw response');
    return {
      summary: response,
      problems: [],
      opportunities: [],
      recommendations: [],
    };
  }
}

/**
 * Generate content suggestion for a new post
 */
export async function generateContentSuggestion(
  recentPosts?: string[]
): Promise<{
  content: string;
  reasoning: string;
  expectedImpact: string;
  suggestedTime: string;
  hashtags: string[];
}> {
  const config = getAgentConfig();
  const systemPrompt = getMainSystemPrompt(config);
  const userPrompt = getContentPrompt(config, recentPosts);

  aiLogger.info('Generating content suggestion');

  const result = await generateJSON<{
    content: string;
    reasoning: string;
    expectedImpact: string;
    suggestedTime: string;
    hashtags: string[];
  }>(systemPrompt, userPrompt);

  return result;
}

/**
 * Generate budget optimization suggestions
 */
export async function generateBudgetOptimization(
  campaigns: CampaignPerformance[]
): Promise<
  Array<{
    campaignId: string;
    action: 'increase' | 'decrease' | 'pause' | 'resume';
    currentBudget: number;
    newBudget: number;
    reason: string;
  }>
> {
  const config = getAgentConfig();
  const budgetStatus = getBudgetStatus(config.budget.total, config.budget.dailyLimit);

  const systemPrompt = getMainSystemPrompt(config);
  const userPrompt = getBudgetOptimizationPrompt(campaigns, budgetStatus);

  aiLogger.info('Generating budget optimization suggestions');

  const result = await generateJSON<
    Array<{
      campaignId: string;
      action: 'increase' | 'decrease' | 'pause' | 'resume';
      currentBudget: number;
      newBudget: number;
      reason: string;
    }>
  >(systemPrompt, userPrompt);

  return result;
}

/**
 * Generate daily report
 */
export async function generateDailyReport(data: {
  date: string;
  budget: {
    monthlyBudget: number;
    monthlySpent: number;
    dailySpend: number;
  };
  performance: {
    impressions: number;
    reach: number;
    clicks: number;
    leads: number;
  };
  actions: Array<{ time: string; description: string; status: string }>;
}): Promise<string> {
  const config = getAgentConfig();
  const goals = getGoalsProgress();

  const systemPrompt = getMainSystemPrompt(config);
  const userPrompt = getDailyReportPrompt({ ...data, goals });

  aiLogger.info('Generating daily report', { date: data.date });

  const report = await sendMessage(systemPrompt, [{ role: 'user', content: userPrompt }]);

  return report;
}

/**
 * Parse action from AI response
 */
function parseActionFromResponse(response: string): {
  type: 'create_post' | 'adjust_budget' | 'create_campaign' | 'boost_post' | null;
  payload: Record<string, unknown> | null;
  cleanResponse: string;
} {
  // Try to find JSON in the response
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const plainJsonMatch = response.match(/\{[\s\S]*?"(content|action|campaignId|post_data|message)"[\s\S]*?\}/);

  const jsonStr = jsonMatch?.[1] || plainJsonMatch?.[0];

  if (!jsonStr) {
    return { type: null, payload: null, cleanResponse: response };
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Format 1: AI generates {"action": "create_post/create_organic_post", "post_data": {"message": ...}}
    if (parsed.action && (parsed.action.includes('post') || parsed.action.includes('organic')) && parsed.post_data?.message) {
      return {
        type: 'create_post',
        payload: {
          content: parsed.post_data.message,
          scheduledTime: parsed.post_data.scheduled_publish_time,
          reasoning: parsed.reasoning || 'Požadavek z chatu',
          expectedImpact: 'Organický příspěvek na Facebook stránce',
        },
        cleanResponse: response,
      };
    }

    // Format 2: Simple {"content": ..., "hashtags": [...]}
    if (parsed.content && (parsed.hashtags || parsed.suggestedTime || parsed.reasoning)) {
      return {
        type: 'create_post',
        payload: {
          content: parsed.content + (parsed.hashtags?.length > 0 ? '\n\n' + parsed.hashtags.map((h: string) => `#${h}`).join(' ') : ''),
          scheduledTime: parsed.suggestedTime,
          reasoning: parsed.reasoning,
          expectedImpact: parsed.expectedImpact,
        },
        cleanResponse: response,
      };
    }

    // Format 3: Budget adjustment
    if (parsed.campaignId && parsed.action && (parsed.newBudget !== undefined || parsed.budget !== undefined)) {
      return {
        type: 'adjust_budget',
        payload: {
          campaignId: parsed.campaignId,
          currentBudget: parsed.currentBudget,
          newBudget: parsed.newBudget || parsed.budget,
          reason: parsed.reason || parsed.reasoning,
        },
        cleanResponse: response,
      };
    }

    return { type: null, payload: null, cleanResponse: response };
  } catch {
    return { type: null, payload: null, cleanResponse: response };
  }
}

/**
 * Chat with the AI agent
 */
export async function chat(userMessage: string): Promise<string> {
  const config = getAgentConfig();

  // Save user message
  saveMessage('user', userMessage);

  // Get conversation context
  const context = getContextMessages(20);
  const messages: Message[] = context.length > 0 ? context : [];
  messages.push({ role: 'user', content: userMessage });

  const systemPrompt = getChatSystemPrompt(config);

  aiLogger.info('Processing chat message', { messageLength: userMessage.length });

  const response = await sendMessage(systemPrompt, messages);

  // Try to parse and queue any action from the response
  const { type, payload } = parseActionFromResponse(response);

  let finalResponse = response;

  if (type && payload) {
    try {
      const action = await queueAction({
        type,
        payload,
        reasoning: payload.reasoning as string || 'Požadavek z chatu',
        expectedImpact: payload.expectedImpact as string || 'Dle návrhu AI',
        confidence: 'medium',
      });

      aiLogger.info('Action queued from chat', { actionId: action.id, type });

      const formattedAction = formatActionForDisplay(action);
      finalResponse += `\n\n---\n✅ **Akce byla zařazena ke schválení**\nID: ${action.id}\nTyp: ${formattedAction.typeName}\nStav: Čeká na schválení\n\nMůžete ji schválit v dashboardu nebo pomocí odkazu v emailu.`;
    } catch (error) {
      aiLogger.error('Failed to queue action from chat', error);
    }
  }

  // Save assistant response
  saveMessage('assistant', finalResponse);

  return finalResponse;
}

/**
 * Make a decision based on context and options
 */
export async function makeDecision(
  context: string,
  options: string[]
): Promise<{
  selectedOption: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  alternativeConsiderations: string;
}> {
  const config = getAgentConfig();
  const systemPrompt = getMainSystemPrompt(config);
  const userPrompt = getDecisionPrompt(context, options);

  aiLogger.info('Making decision', { optionCount: options.length });

  const result = await generateJSON<{
    selectedOption: number;
    reasoning: string;
    confidence: 'high' | 'medium' | 'low';
    alternativeConsiderations: string;
  }>(systemPrompt, userPrompt);

  return result;
}

/**
 * Create a post action from content suggestion
 */
export async function createPostAction(): Promise<{
  payload: CreatePostPayload;
  reasoning: string;
  expectedImpact: string;
  confidence: 'high' | 'medium' | 'low';
}> {
  const suggestion = await generateContentSuggestion();

  return {
    payload: {
      content: suggestion.content + (suggestion.hashtags.length > 0 ? '\n\n' + suggestion.hashtags.map((h) => `#${h}`).join(' ') : ''),
      scheduledTime: suggestion.suggestedTime,
    },
    reasoning: suggestion.reasoning,
    expectedImpact: suggestion.expectedImpact,
    confidence: 'medium',
  };
}

/**
 * Create budget adjustment actions from optimization suggestions
 */
export async function createBudgetActions(
  campaigns: CampaignPerformance[]
): Promise<
  Array<{
    payload: AdjustBudgetPayload;
    reasoning: string;
    expectedImpact: string;
    confidence: 'high' | 'medium' | 'low';
  }>
> {
  const suggestions = await generateBudgetOptimization(campaigns);

  return suggestions
    .filter((s) => s.action === 'increase' || s.action === 'decrease')
    .map((s) => ({
      payload: {
        campaignId: s.campaignId,
        currentBudget: s.currentBudget,
        newBudget: s.newBudget,
        reason: s.reason,
      },
      reasoning: s.reason,
      expectedImpact: `Změna rozpočtu z ${s.currentBudget} na ${s.newBudget} Kč`,
      confidence: 'medium' as const,
    }));
}

/**
 * Quick health check for the AI system
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await sendMessage(
      'You are a health check system.',
      [{ role: 'user', content: 'Respond with just "OK" if you are working.' }],
      { maxTokens: 10 }
    );
    return response.toLowerCase().includes('ok');
  } catch (error) {
    aiLogger.error('AI health check failed', error);
    return false;
  }
}
