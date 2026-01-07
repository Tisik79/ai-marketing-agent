/**
 * Orchestrator - Centrální řízení agentů
 */

import {
  AgentType,
  AgentInput,
  AgentOutput,
  AgentContext,
  IAgent,
  SuggestedAction,
} from '../base/agent.interface';
import { intentClassifier } from './classifier';
import { contextStore } from '../../shared/memory/context-store';
import { queueAction } from '../../approval/queue';
import { createComponentLogger } from '../../utils/logger';

const logger = createComponentLogger('Orchestrator');

// Import agentů (budou implementováni)
import { ContentAgent } from '../content';
import { AnalyticsAgent } from '../analytics';
import { BudgetAgent } from '../budget';

interface OrchestratorConfig {
  maxChainDepth: number;
  timeoutMs: number;
}

interface ProcessResult {
  response: string;
  actionsQueued: SuggestedAction[];
  agentsUsed: AgentType[];
  totalProcessingTime: number;
}

/**
 * Orchestrator - Dirigent všech agentů
 */
export class Orchestrator {
  private agents: Map<AgentType, IAgent>;
  private config: OrchestratorConfig;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      maxChainDepth: 5,
      timeoutMs: 60000,
      ...config,
    };

    // Inicializace agentů
    this.agents = new Map();
    this.initializeAgents();
  }

  /**
   * Inicializace dostupných agentů
   */
  private initializeAgents(): void {
    // Registrace agentů
    this.registerAgent(new ContentAgent());
    this.registerAgent(new AnalyticsAgent());
    this.registerAgent(new BudgetAgent());

    // TODO: Přidat další agenty
    // this.registerAgent(new TargetingAgent());
    // this.registerAgent(new CampaignAgent());
    // this.registerAgent(new StrategyAgent());

    logger.info(`[Orchestrator] Initialized with ${this.agents.size} agents`);
  }

  /**
   * Registrace agenta
   */
  registerAgent(agent: IAgent): void {
    this.agents.set(agent.type, agent);
    logger.debug(`[Orchestrator] Registered agent: ${agent.type}`);
  }

  /**
   * Hlavní metoda pro zpracování zprávy od uživatele
   * @param message User message (may contain [UPLOADED_IMAGE: path] marker)
   * @param uploadedImagePath Optional direct path to uploaded image
   */
  async process(message: string, uploadedImagePath?: string): Promise<ProcessResult> {
    const startTime = Date.now();
    const agentsUsed: AgentType[] = [];
    const actionsQueued: SuggestedAction[] = [];

    try {
      // Extract uploaded image path from message if present
      let cleanMessage = message;
      let imagePath = uploadedImagePath;

      const imageMatch = message.match(/\[UPLOADED_IMAGE:\s*([^\]]+)\]/);
      if (imageMatch) {
        imagePath = imageMatch[1].trim();
        cleanMessage = message.replace(/\n*\[UPLOADED_IMAGE:\s*[^\]]+\]/, '').trim();
        logger.info(`[Orchestrator] Extracted uploaded image path: ${imagePath}`);
      }

      logger.info(`[Orchestrator] Processing: "${cleanMessage.substring(0, 100)}..."`, {
        hasUploadedImage: !!imagePath,
      });

      // Načtení kontextu
      const context = await contextStore.getContext();

      // Klasifikace záměru
      const classification = intentClassifier.classify(cleanMessage);
      logger.info(`[Orchestrator] Classified as: ${classification.agentType} (confidence: ${classification.confidence.toFixed(2)})`);

      // Detekce multi-agent dotazu
      const requiredAgents = intentClassifier.detectMultiAgentQuery(message);

      let finalResponse = '';
      let currentChainData: Record<string, unknown> = {};
      let chainDepth = 0;

      // Zpracování prvním agentem
      const primaryAgent = this.agents.get(classification.agentType);
      if (!primaryAgent) {
        logger.warn(`[Orchestrator] Agent ${classification.agentType} not found, falling back to content`);
        const fallbackAgent = this.agents.get('content');
        if (!fallbackAgent) {
          throw new Error('No agents available');
        }
      }

      let currentAgent = primaryAgent || this.agents.get('content')!;
      let input: AgentInput = {
        message: cleanMessage,
        context,
        chainData: currentChainData,
        uploadedImagePath: imagePath,
      };

      // Řetězení agentů
      while (currentAgent && chainDepth < this.config.maxChainDepth) {
        agentsUsed.push(currentAgent.type);

        logger.debug(`[Orchestrator] Running agent: ${currentAgent.type} (chain depth: ${chainDepth})`);

        const output = await currentAgent.process(input);

        // Akumulace odpovědi
        if (output.response) {
          finalResponse += (finalResponse ? '\n\n---\n\n' : '') + output.response;
        }

        // Zpracování navržených akcí
        if (output.suggestedActions.length > 0) {
          for (const action of output.suggestedActions) {
            // Zařazení akce do fronty ke schválení
            await this.queueSuggestedAction(action, context);
            actionsQueued.push(action);
          }
        }

        // Aktualizace chain dat
        if (output.chainData) {
          currentChainData = {
            ...currentChainData,
            ...output.chainData,
          };
        }

        // Kontrola, zda pokračovat s dalším agentem
        if (output.needsChaining && output.nextAgent) {
          const nextAgent = this.agents.get(output.nextAgent);
          if (nextAgent) {
            currentAgent = nextAgent;
            input = {
              message: `Pokračuj na základě předchozí analýzy`,
              context,
              chainData: currentChainData,
              uploadedImagePath: imagePath, // Preserve uploaded image through chain
            };
            chainDepth++;
            continue;
          }
        }

        // Konec řetězení
        break;
      }

      // Přidání informace o zařazených akcích
      if (actionsQueued.length > 0) {
        finalResponse += '\n\n---\n';
        finalResponse += `✅ **${actionsQueued.length} akce zařazeny ke schválení**\n`;
        for (const action of actionsQueued) {
          finalResponse += `- ${this.getActionTypeName(action.type)}: ${action.reasoning.substring(0, 50)}...\n`;
        }
      }

      const totalProcessingTime = Date.now() - startTime;

      logger.info(`[Orchestrator] Completed in ${totalProcessingTime}ms, agents used: ${agentsUsed.join(' → ')}`);

      return {
        response: finalResponse,
        actionsQueued,
        agentsUsed,
        totalProcessingTime,
      };
    } catch (error) {
      logger.error('[Orchestrator] Error processing message:', error);

      return {
        response: `Omlouvám se, došlo k chybě při zpracování požadavku: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
        actionsQueued: [],
        agentsUsed,
        totalProcessingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Zpracování více agentů paralelně
   */
  async processParallel(message: string, agentTypes: AgentType[]): Promise<ProcessResult> {
    const startTime = Date.now();
    const context = await contextStore.getContext();

    const promises = agentTypes.map(async (agentType) => {
      const agent = this.agents.get(agentType);
      if (!agent) return null;

      return agent.process({
        message,
        context,
      });
    });

    const results = await Promise.all(promises);
    const validResults = results.filter((r): r is AgentOutput => r !== null);

    // Agregace výsledků
    const responses = validResults.map(r => r.response).filter(Boolean);
    const allActions = validResults.flatMap(r => r.suggestedActions);
    const actionsQueued: SuggestedAction[] = [];

    for (const action of allActions) {
      await this.queueSuggestedAction(action, context);
      actionsQueued.push(action);
    }

    return {
      response: responses.join('\n\n---\n\n'),
      actionsQueued,
      agentsUsed: agentTypes,
      totalProcessingTime: Date.now() - startTime,
    };
  }

  /**
   * Zařadí navrženu akci do fronty ke schválení
   */
  private async queueSuggestedAction(action: SuggestedAction, context: AgentContext): Promise<void> {
    try {
      await queueAction({
        type: action.type,
        payload: action.payload,
        reasoning: action.reasoning,
        expectedImpact: action.expectedImpact,
        confidence: action.confidence,
      });

      logger.info(`[Orchestrator] Queued action: ${action.type}`);
    } catch (error) {
      logger.error(`[Orchestrator] Failed to queue action: ${action.type}`, error);
    }
  }

  /**
   * Získá lidsky čitelný název typu akce
   */
  private getActionTypeName(type: string): string {
    const names: Record<string, string> = {
      create_post: 'Nový příspěvek',
      boost_post: 'Propagace příspěvku',
      create_campaign: 'Nová kampaň',
      adjust_budget: 'Úprava rozpočtu',
      pause_campaign: 'Pozastavení kampaně',
      resume_campaign: 'Obnovení kampaně',
      create_ad: 'Nová reklama',
      modify_targeting: 'Změna cílení',
      analyze: 'Analýza',
      report: 'Report',
      plan: 'Plánování',
    };

    return names[type] || type;
  }

  /**
   * Získá seznam dostupných agentů
   */
  getAvailableAgents(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Získá informace o konkrétním agentovi
   */
  getAgentInfo(type: AgentType): { name: string; description: string } | null {
    const agent = this.agents.get(type);
    if (!agent) return null;

    return {
      name: agent.name,
      description: agent.description,
    };
  }
}

// Export singleton instance
let orchestratorInstance: Orchestrator | null = null;

export function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
  }
  return orchestratorInstance;
}

export { intentClassifier } from './classifier';
