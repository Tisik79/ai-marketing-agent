/**
 * AI Marketing Agent - Sdílené typy
 */

// === Action Types ===
export type ActionType =
  | 'create_post'
  | 'boost_post'
  | 'create_campaign'
  | 'adjust_budget'
  | 'pause_campaign'
  | 'resume_campaign'
  | 'create_ad'
  | 'modify_targeting';

export type ActionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executed'
  | 'failed';

export type Confidence = 'high' | 'medium' | 'low';
export type Priority = 'high' | 'medium' | 'low';
export type GoalType = 'leads' | 'reach' | 'engagement' | 'followers' | 'conversions';
export type Period = 'daily' | 'weekly' | 'monthly';
export type PostFrequency = 'daily' | 'every_other_day' | 'weekly';

// === Interfaces ===

export interface Goal {
  id: string;
  type: GoalType;
  target: number;
  current: number;
  period: Period;
  priority: Priority;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PendingAction {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  type: ActionType;
  payload: Record<string, any>;
  reasoning: string;
  expectedImpact: string;
  confidence: Confidence;
  status: ActionStatus;
  approvalToken: string;
  approvedAt?: Date;
  approvedBy?: string;
  executedAt?: Date;
  executionResult?: Record<string, any>;
}

export interface BudgetConfig {
  total: number;
  period: 'monthly' | 'weekly';
  dailyLimit: number;
  alertThreshold: number;
}

export interface StrategyConfig {
  targetAudience: string;
  tone: string;
  topics: string[];
  postFrequency: PostFrequency;
  preferredPostTimes: string[];
}

export interface ApprovalConfig {
  email: string;
  requireApprovalFor: ActionType[];
  autoApproveBelow: number;
  timeoutHours: number;
}

export interface NotificationsConfig {
  dailyReport: boolean;
  weeklyReport: boolean;
  instantAlerts: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  facebookPageId: string;
  facebookAccountId: string;
  budget: BudgetConfig;
  goals: Goal[];
  strategy: StrategyConfig;
  approval: ApprovalConfig;
  notifications: NotificationsConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actionId?: string;
  eventType: 'created' | 'approved' | 'rejected' | 'executed' | 'failed' | 'system';
  details: Record<string, any>;
  userId?: string;
}

export interface BudgetTracking {
  id: string;
  date: Date;
  spent: number;
  campaignId?: string;
  description?: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
}

// === Payloads ===

export interface CreatePostPayload {
  content: string;
  imageUrl?: string;
  link?: string;
  scheduledTime?: string;
}

export interface BoostPostPayload {
  postId: string;
  budget: number;
  duration: number;
  targeting?: Record<string, any>;
}

export interface AdjustBudgetPayload {
  campaignId: string;
  currentBudget: number;
  newBudget: number;
  reason: string;
}

export interface CreateCampaignPayload {
  name: string;
  objective: string;
  dailyBudget: number;
  targeting?: Record<string, any>;
}

export interface PauseCampaignPayload {
  campaignId: string;
  reason: string;
}

// === AI Brain Types ===

export interface AIDecision {
  action: ActionType;
  payload: Record<string, any>;
  reasoning: string;
  expectedImpact: string;
  confidence: Confidence;
  priority: Priority;
}

export interface PerformanceData {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  leads: number;
  conversions: number;
}

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  status: string;
  performance: PerformanceData;
  dateRange: {
    since: string;
    until: string;
  };
}

// === Email Types ===

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ApprovalEmailData {
  action: PendingAction;
  approveUrl: string;
  rejectUrl: string;
  editUrl?: string;
}

export interface ReportEmailData {
  date: string;
  budget: {
    total: number;
    spent: number;
    remaining: number;
    dailySpend: number;
  };
  performance: PerformanceData;
  goals: Array<Goal & { progress: number }>;
  actions: Array<{
    time: string;
    description: string;
    status: 'success' | 'failed' | 'pending';
  }>;
  aiRecommendations: string[];
}
