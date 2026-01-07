/**
 * Google Gemini API Client pro Nano Banana generování obrázků
 * Používá Gemini 2.5 Flash Image (Nano Banana)
 */

import { GoogleGenAI } from '@google/genai';

let genAIClient: GoogleGenAI | null = null;

/**
 * Získá nebo vytvoří GenAI klienta
 */
export function getGenAIClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY není nastaveno v environment proměnných');
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

/**
 * Kontrola, zda je Google AI API key nastaven
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface NanoBananaImageOptions {
  aspectRatio?: ImageAspectRatio;
}

export interface NanoBananaResult {
  imageData: Buffer;
  mimeType: string;
  revisedPrompt?: string;
}

/**
 * Generuje obrázek pomocí Gemini 2.5 Flash Image (Nano Banana)
 * @param prompt Popis obrázku (anglicky pro lepší výsledky)
 * @param options Nastavení generování
 * @returns Buffer s obrázkem
 */
export async function generateNanoBananaImage(
  prompt: string,
  options: NanoBananaImageOptions = {}
): Promise<NanoBananaResult> {
  const ai = getGenAIClient();

  // Gemini 2.5 Flash Image - Nano Banana
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
      responseModalities: ['Text', 'Image'],
    },
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('Nano Banana nevrátilo žádné výsledky');
  }

  const candidate = response.candidates[0];
  if (!candidate.content || !candidate.content.parts) {
    throw new Error('Nano Banana nevrátilo žádný obsah');
  }

  // Hledáme obrázek v odpovědi
  let imageData: Buffer | null = null;
  let mimeType = 'image/png';
  let textResponse = '';

  for (const part of candidate.content.parts) {
    if (part.inlineData && part.inlineData.data) {
      imageData = Buffer.from(part.inlineData.data, 'base64');
      mimeType = part.inlineData.mimeType || 'image/png';
    } else if (part.text) {
      textResponse = part.text;
    }
  }

  if (!imageData) {
    throw new Error('Nano Banana nevrátilo obrázek. Odpověď: ' + textResponse);
  }

  return {
    imageData,
    mimeType,
    revisedPrompt: textResponse || undefined,
  };
}
