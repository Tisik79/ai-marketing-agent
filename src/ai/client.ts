/**
 * Claude API Client - Wrapper for Anthropic SDK
 */

import Anthropic from '@anthropic-ai/sdk';
import { aiLogger } from '../utils/logger.js';

let client: Anthropic | null = null;

/**
 * Get or create Anthropic client
 */
export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    client = new Anthropic({ apiKey });
    aiLogger.info('Claude API client initialized');
  }
  return client;
}

/**
 * Get model to use
 */
export function getModel(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
}

/**
 * Message role type
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message interface
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * Send a message to Claude and get a response
 */
export async function sendMessage(
  systemPrompt: string,
  messages: Message[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const anthropic = getClient();
  const model = getModel();

  try {
    aiLogger.debug('Sending message to Claude', {
      model,
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length,
    });

    const response = await anthropic.messages.create({
      model,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === 'text');
    const responseText = textContent ? textContent.text : '';

    aiLogger.debug('Received response from Claude', {
      responseLength: responseText.length,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return responseText;
  } catch (error) {
    aiLogger.error('Error calling Claude API', error);
    throw error;
  }
}

/**
 * Send a simple prompt and get a response
 */
export async function ask(
  prompt: string,
  systemPrompt?: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  return sendMessage(
    systemPrompt || 'You are a helpful AI assistant.',
    [{ role: 'user', content: prompt }],
    options
  );
}

/**
 * Generate JSON response from Claude
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    maxTokens?: number;
  }
): Promise<T> {
  const response = await sendMessage(
    systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON, no other text.',
    [{ role: 'user', content: userPrompt }],
    { ...options, temperature: 0 }
  );

  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    aiLogger.error('Failed to parse JSON response', error, { response });
    throw new Error(`Failed to parse AI response as JSON: ${error}`);
  }
}

/**
 * Check if API is configured and working
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await ask('Say "OK" and nothing else.');
    return true;
  } catch {
    return false;
  }
}
