/**
 * Content Agent - Kreativní tvorba obsahu
 */

import { BaseAgent } from '../base/base-agent';
import {
  AgentType,
  AgentContext,
  AgentInput,
  AgentOutput,
  SuggestedAction,
} from '../base/agent.interface';
import { getContentAgentSystemPrompt } from './prompts';
import { generateImage } from '../../tools/image-tools';
import { createComponentLogger } from '../../utils/logger';

const logger = createComponentLogger('ContentAgent');

/**
 * Content Agent - Specializovaný agent pro tvorbu obsahu
 */
export class ContentAgent extends BaseAgent {
  constructor() {
    super({
      type: 'content',
      name: 'Content Agent',
      description: 'Kreativní copywriter a content creator pro Facebook marketing',
      temperature: 0.8, // Vyšší kreativita
    });
  }

  /**
   * Vrátí system prompt pro Content Agenta
   */
  getSystemPrompt(context: AgentContext): string {
    return getContentAgentSystemPrompt(context);
  }

  /**
   * Kontroluje, zda Content Agent může zpracovat daný požadavek
   */
  canHandle(message: string): boolean {
    const contentPatterns = [
      /vytvo[řr]\s*(příspěvek|post|obsah|text)/i,
      /napiš\s*(příspěvek|post|text)/i,
      /vygeneruj\s*(příspěvek|post|obsah)/i,
      /nový\s*(příspěvek|post)/i,
      /připrav\s*(příspěvek|post|obsah)/i,
      /s\s*obrázkem/i,
      /příspěvek\s*(o|na téma|pro)/i,
      /content|copy|kreativ/i,
    ];

    return contentPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Zpracuje vstup a vytvoří obsah
   */
  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      logger.info('[ContentAgent] Processing content request');

      // Získání system promptu
      const systemPrompt = this.getSystemPrompt(input.context);

      // Příprava zpráv
      const messages = this.prepareMessages(input);

      // Volání Claude API
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: messages,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const rawResponse = content.text;

      // Parsování odpovědi (s předáním případného nahraného obrázku)
      const parsed = await this.parseContentResponse(rawResponse, input.context, input.uploadedImagePath);

      const processingTime = Date.now() - startTime;

      logger.info(`[ContentAgent] Generated content in ${processingTime}ms`);

      return {
        response: parsed.response,
        suggestedActions: parsed.suggestedActions,
        chainData: parsed.chainData,
        needsChaining: false,
        metadata: {
          agentType: 'content' as AgentType,
          processingTime,
          tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
        },
      };
    } catch (error) {
      logger.error('[ContentAgent] Error processing request:', error);
      throw error;
    }
  }

  /**
   * Parsování odpovědi specifické pro Content Agenta
   * @param rawResponse Response from Claude
   * @param context Agent context
   * @param uploadedImagePath Optional path to user-uploaded image (takes precedence over generation)
   */
  private async parseContentResponse(
    rawResponse: string,
    context: AgentContext,
    uploadedImagePath?: string
  ): Promise<{
    response: string;
    suggestedActions: SuggestedAction[];
    chainData?: Record<string, unknown>;
  }> {
    // Pokusíme se najít JSON v odpovědi
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
    const plainJsonMatch = rawResponse.match(/\{[\s\S]*?"(content|action)"[\s\S]*?\}/);

    const jsonStr = jsonMatch?.[1] || plainJsonMatch?.[0];

    if (!jsonStr) {
      return {
        response: rawResponse,
        suggestedActions: [],
      };
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const suggestedActions: SuggestedAction[] = [];

      // Zpracování create_post akce
      if (parsed.action === 'create_post' || parsed.content) {
        const postContent = this.removeMarkdownFormatting(parsed.content || '');
        const hashtags = parsed.hashtags || [];
        const hashtagsStr = hashtags.length > 0
          ? '\n\n' + hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')
          : '';

        const payload: Record<string, unknown> = {
          content: postContent + hashtagsStr,
          scheduledTime: parsed.suggestedTime,
        };

        // Použití nahraného obrázku nebo generování nového
        if (uploadedImagePath) {
          // User uploaded an image - use it instead of generating
          payload.imagePath = uploadedImagePath;
          payload.imageSource = 'upload';
          logger.info('[ContentAgent] Using user-uploaded image', {
            imagePath: uploadedImagePath,
          });
        } else if (parsed.generateImage && parsed.imagePrompt) {
          // No uploaded image - generate one if AI requested it
          logger.info('[ContentAgent] Generating image with Nano Banana');

          const imageResult = await generateImage(parsed.imagePrompt);

          if (imageResult.success && imageResult.imagePath) {
            payload.imagePath = imageResult.imagePath;
            payload.imageSource = 'dalle'; // Pro zpětnou kompatibilitu
            payload.imagePrompt = parsed.imagePrompt;

            logger.info('[ContentAgent] Image generated successfully', {
              imagePath: imageResult.imagePath,
            });
          } else {
            logger.warn('[ContentAgent] Image generation failed', {
              error: imageResult.error,
            });
          }
        }

        suggestedActions.push({
          type: 'create_post',
          payload,
          reasoning: parsed.reasoning || 'Návrh příspěvku od Content Agenta',
          expectedImpact: parsed.expectedImpact || 'Zvýšení engagementu',
          confidence: parsed.confidence || 'medium',
        });
      }

      // Sestavení textové odpovědi
      let response = this.formatContentResponse(parsed);

      // Přidání informace o variantách
      if (parsed.variants && Array.isArray(parsed.variants) && parsed.variants.length > 0) {
        response += '\n\n**Alternativní varianty:**\n';
        parsed.variants.forEach((v: { content: string; reasoning: string }, i: number) => {
          response += `\n${i + 1}. ${v.content}\n   _${v.reasoning}_\n`;
        });
      }

      // Přidání informace o obrázku do odpovědi
      if (uploadedImagePath) {
        response += '\n\n📷 **Použit váš nahraný obrázek**';
      } else if (parsed.generateImage) {
        response += '\n\n🖼️ **Obrázek bude vygenerován pomocí AI**';
      }

      return {
        response,
        suggestedActions,
        chainData: {
          generatedContent: parsed.content,
          hasImage: !!uploadedImagePath || !!parsed.generateImage,
          imageSource: uploadedImagePath ? 'upload' : (parsed.generateImage ? 'generated' : undefined),
        },
      };
    } catch (error) {
      logger.warn('[ContentAgent] Failed to parse JSON response', { error });
      return {
        response: rawResponse,
        suggestedActions: [],
      };
    }
  }

  /**
   * Odstraní markdown formátování z textu
   */
  private removeMarkdownFormatting(text: string): string {
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`(.*?)`/g, '$1');
  }

  /**
   * Formátuje odpověď pro uživatele
   */
  private formatContentResponse(parsed: Record<string, unknown>): string {
    const parts: string[] = [];

    if (parsed.content) {
      parts.push('**Navrhovaný příspěvek:**\n');
      parts.push(this.removeMarkdownFormatting(parsed.content as string));
    }

    if (parsed.hashtags && Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0) {
      const hashtags = (parsed.hashtags as string[])
        .map(h => h.startsWith('#') ? h : `#${h}`)
        .join(' ');
      parts.push(`\n\n${hashtags}`);
    }

    if (parsed.suggestedTime) {
      parts.push(`\n\n⏰ **Doporučený čas publikace:** ${parsed.suggestedTime}`);
    }

    if (parsed.generateImage) {
      parts.push('\n\n🖼️ **Obrázek:** Bude vygenerován pomocí Nano Banana');
    }

    if (parsed.reasoning) {
      parts.push(`\n\n**Zdůvodnění:** ${parsed.reasoning}`);
    }

    if (parsed.expectedImpact) {
      parts.push(`\n\n**Očekávaný dopad:** ${parsed.expectedImpact}`);
    }

    return parts.join('');
  }
}
