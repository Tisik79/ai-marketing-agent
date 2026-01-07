/**
 * Agent Interface - Společný interface pro všechny agenty
 */

// Import and re-export ActionType from existing types for compatibility
import type { ActionType as OriginalActionType } from '../../agent/types';
export type ActionType = OriginalActionType;

export type AgentType =
  | 'orchestrator'
  | 'content'
  | 'analytics'
  | 'budget'
  | 'targeting'
  | 'campaign'
  | 'strategy';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Kontext sdílený mezi agenty
 */
export interface AgentContext {
  // Konfigurace agenta
  config: {
    name: string;
    facebookPageId: string;
    facebookAccountId: string;
  };

  // Rozpočet
  budget: {
    total: number;
    spent: number;
    remaining: number;
    dailyLimit: number;
    todaySpent: number;
  };

  // Cíle
  goals: Array<{
    type: string;
    target: number;
    current: number;
    period: string;
    priority: string;
  }>;

  // Strategie
  strategy: {
    targetAudience: string;
    tone: string;
    topics: string[];
    postFrequency: string;
    preferredPostTimes: string[];
  };

  // Aktuální datum a čas
  currentDate: Date;

  // Historie konverzace (poslední zprávy)
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;

  // Metadata z předchozích agentů v řetězu
  chainData?: Record<string, unknown>;
}

/**
 * Vstup pro agenta
 */
export interface AgentInput {
  message: string;
  context: AgentContext;
  chainData?: Record<string, unknown>;
  /** Path to user-uploaded image (should be used instead of generating) */
  uploadedImagePath?: string;
}

/**
 * Navrhovaná akce od agenta
 */
export interface SuggestedAction {
  type: ActionType;
  payload: Record<string, unknown>;
  reasoning: string;
  expectedImpact: string;
  confidence: ConfidenceLevel;
  targetAgent?: AgentType; // Pro řetězení - který agent má převzít
}

/**
 * Výstup z agenta
 */
export interface AgentOutput {
  // Textová odpověď pro uživatele
  response: string;

  // Navrhované akce ke schválení
  suggestedActions: SuggestedAction[];

  // Data pro další agenty v řetězu
  chainData?: Record<string, unknown>;

  // Zda je potřeba pokračovat s dalším agentem
  needsChaining: boolean;
  nextAgent?: AgentType;

  // Metadata
  metadata: {
    agentType: AgentType;
    processingTime: number;
    tokensUsed?: number;
  };
}

/**
 * Interface pro agenta
 */
export interface IAgent {
  readonly type: AgentType;
  readonly name: string;
  readonly description: string;

  /**
   * Zpracuje vstup a vrátí výstup
   */
  process(input: AgentInput): Promise<AgentOutput>;

  /**
   * Vrátí system prompt pro agenta
   */
  getSystemPrompt(context: AgentContext): string;

  /**
   * Zkontroluje, zda agent může zpracovat daný požadavek
   */
  canHandle(message: string): boolean;
}

/**
 * Konfigurační typ pro agenta
 */
export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
