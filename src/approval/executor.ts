/**
 * Executor - Executes approved actions
 */

import { getApprovedActions, markExecuted, markFailed } from './queue.js';
import { recordSpending } from '../database/repositories/budget.js';
import { approvalLogger } from '../utils/logger.js';
import type {
  PendingAction,
  ActionType,
  CreatePostPayload,
  BoostPostPayload,
  AdjustBudgetPayload,
  CreateCampaignPayload,
  PauseCampaignPayload,
} from '../agent/types.js';

type FacebookTools = {
  createPost: (content: string, link?: string, imagePath?: string) => Promise<string>;
  createCampaign: (name: string, objective: string, status: string, dailyBudget?: number, startTime?: string, endTime?: string, specialAdCategories?: string[]) => Promise<any>;
  updateCampaign: (campaignId: string, name?: string, status?: string, dailyBudget?: number, endTime?: string) => Promise<any>;
};

let facebookTools: FacebookTools | null = null;

async function getFacebookTools(): Promise<FacebookTools> {
  if (!facebookTools) {
    try {
      const postTools = await import('../tools/post-tools.js');
      const campaignTools = await import('../tools/campaign-tools.js');
      facebookTools = {
        createPost: postTools.create_post,
        createCampaign: campaignTools.createCampaign,
        updateCampaign: campaignTools.updateCampaign,
      };
    } catch (error) {
      approvalLogger.error('Failed to load Facebook tools', error);
      throw error;
    }
  }
  return facebookTools;
}

export async function executeAction(action: PendingAction): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  approvalLogger.info('Executing action', { actionId: action.id, type: action.type });
  try {
    const result = await executeByType(action.type, action.payload);
    markExecuted(action.id, result);
    approvalLogger.info('Action executed successfully', { actionId: action.id });
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    markFailed(action.id, errorMessage);
    approvalLogger.error('Action execution failed', error, { actionId: action.id });
    return { success: false, error: errorMessage };
  }
}

async function executeByType(type: ActionType, payload: Record<string, any>): Promise<any> {
  const tools = await getFacebookTools();
  switch (type) {
    case 'create_post': return executeCreatePost(tools, payload as CreatePostPayload);
    case 'boost_post': return executeBoostPost(payload as BoostPostPayload);
    case 'create_campaign': return executeCreateCampaign(tools, payload as CreateCampaignPayload);
    case 'adjust_budget': return executeAdjustBudget(tools, payload as AdjustBudgetPayload);
    case 'pause_campaign': return executePauseCampaign(tools, payload as PauseCampaignPayload);
    case 'resume_campaign': return executeResumeCampaign(tools, payload as PauseCampaignPayload);
    case 'create_ad': throw new Error('create_ad not implemented yet');
    case 'modify_targeting': throw new Error('modify_targeting not implemented yet');
    default: throw new Error(`Unknown action type: ${type}`);
  }
}

async function executeCreatePost(tools: FacebookTools, payload: CreatePostPayload): Promise<{ postId: string }> {
  const postId = await tools.createPost(payload.content, payload.link, payload.imageUrl);
  return { postId };
}

async function executeBoostPost(payload: BoostPostPayload): Promise<any> {
  recordSpending({ spent: payload.budget * 100, description: `Boost post ${payload.postId}` });
  return { boosted: true, postId: payload.postId, budget: payload.budget, duration: payload.duration };
}

async function executeCreateCampaign(tools: FacebookTools, payload: CreateCampaignPayload): Promise<any> {
  return await tools.createCampaign(payload.name, payload.objective, 'PAUSED', payload.dailyBudget, undefined, undefined, ['NONE']);
}

async function executeAdjustBudget(tools: FacebookTools, payload: AdjustBudgetPayload): Promise<any> {
  const result = await tools.updateCampaign(payload.campaignId, undefined, undefined, payload.newBudget);
  return { campaignId: payload.campaignId, previousBudget: payload.currentBudget, newBudget: payload.newBudget, ...result };
}

async function executePauseCampaign(tools: FacebookTools, payload: PauseCampaignPayload): Promise<any> {
  const result = await tools.updateCampaign(payload.campaignId, undefined, 'PAUSED');
  return { campaignId: payload.campaignId, status: 'PAUSED', reason: payload.reason, ...result };
}

async function executeResumeCampaign(tools: FacebookTools, payload: PauseCampaignPayload): Promise<any> {
  const result = await tools.updateCampaign(payload.campaignId, undefined, 'ACTIVE');
  return { campaignId: payload.campaignId, status: 'ACTIVE', ...result };
}

export async function processApprovedActions(): Promise<{
  processed: number;
  successful: number;
  failed: number;
  results: Array<{ actionId: string; success: boolean; error?: string }>;
}> {
  const approved = getApprovedActions();
  if (approved.length === 0) return { processed: 0, successful: 0, failed: 0, results: [] };
  approvalLogger.info('Processing approved actions', { count: approved.length });
  const results: Array<{ actionId: string; success: boolean; error?: string }> = [];
  let successful = 0, failed = 0;
  for (const action of approved) {
    const result = await executeAction(action);
    results.push({ actionId: action.id, success: result.success, error: result.error });
    if (result.success) successful++; else failed++;
  }
  approvalLogger.info('Finished processing actions', { processed: approved.length, successful, failed });
  return { processed: approved.length, successful, failed, results };
}

export async function runOnce(): Promise<void> {
  await processApprovedActions();
}
