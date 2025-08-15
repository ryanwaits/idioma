import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { TokenUsage } from '../utils/cost';
import { getEffectiveProviderAndModel, getDefaultModelForProvider } from './defaults';

// Result types that include usage metadata
export interface TranslationResult {
  text: string;
  usage: TokenUsage;
}

// Get default model for each provider (using centralized defaults)
export function getDefaultModel(provider: string): string {
  return getDefaultModelForProvider(provider);
}

// AI Provider factory - returns configured AI client
export function createAiClient(provider: string, apiKey?: string): any {
  switch (provider) {
    case 'anthropic': {
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
      }
      return createAnthropic({ apiKey: anthropicKey });
    }

    case 'openai': {
      const openaiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
      }
      return createOpenAI({ apiKey: openaiKey });
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Translation function with dependency injection for AI client
export async function translateText(
  text: string,
  source: string,
  target: string,
  clientOrProvider: any,
  model?: string,
  provider?: string,
  preservedTerms?: string[]
): Promise<TranslationResult> {
  // Apply smart defaults if provider/model not specified
  const { provider: effectiveProvider, model: effectiveModel } = getEffectiveProviderAndModel(
    typeof clientOrProvider === 'string' ? clientOrProvider : provider,
    model
  );
  
  // Handle both client instance and provider string
  const client =
    typeof clientOrProvider === 'string' ? createAiClient(effectiveProvider) : clientOrProvider;
  const actualProvider = effectiveProvider;
  // Preserve leading/trailing whitespace
  const leadingWhitespace = text.match(/^\s*/)?.[0] || '';
  const trailingWhitespace = text.match(/\s*$/)?.[0] || '';
  const trimmedText = text.trim();

  // Skip empty text
  if (!trimmedText) {
    return {
      text,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  // Check if this looks like frontmatter content (should never happen but add safeguard)
  const looksLikeFrontmatter = trimmedText.includes('title:') || trimmedText.includes('description:');
  
  // Format preserved terms for the prompt
  const preserveInstructions = preservedTerms && preservedTerms.length > 0
    ? `\n7. NEVER translate these terms - keep them EXACTLY as written: ${preservedTerms.join(', ')}`
    : '';
  
  const result = await generateText({
    model: client(effectiveModel),
    system:
      'You are a translation assistant. You MUST return ONLY the translated text without any additional commentary, explanations, or phrases like "Here is the translation". Do not add any text before or after the translation.',
    prompt: `Translate the following text from ${source} to ${target}. 

CRITICAL RULES - MUST FOLLOW:
1. NEVER change "---" to anything else (not to "***", not to "___", not to anything)
2. If you see "---" anywhere, keep it EXACTLY as "---"
3. NEVER translate field names like "title:", "description:", "sidebarTitle:" - keep them in English
4. ONLY translate the text VALUES that come after colons
5. Preserve ALL Markdown/YAML formatting exactly as-is
6. Never change horizontal rules or delimiters${preserveInstructions}
${looksLikeFrontmatter ? '\nWARNING: This appears to be frontmatter. ONLY translate the values, NOT the field names or structure!' : ''}

Text to translate:
${trimmedText}`,
  });

  // Post-process to fix common AI translation errors
  let processedText = result.text.trim();
  
  // Fix if AI changed --- to *** or other variants
  if (trimmedText.includes('---') && !processedText.includes('---')) {
    // AI might have changed --- to *** or ___ or other variants
    processedText = processedText.replace(/^\*\*\*$/gm, '---');
    processedText = processedText.replace(/^___$/gm, '---');
    processedText = processedText.replace(/^-{5,}$/gm, '---');  // Replace 5+ dashes with ---
  }
  
  // Re-apply the original whitespace
  const translatedText = leadingWhitespace + processedText + trailingWhitespace;

  return {
    text: translatedText,
    usage: result.usage,
  };
}

export async function translateBatch(
  texts: string[],
  source: string,
  target: string,
  clientOrProvider: any,
  model?: string,
  provider?: string,
  preservedTerms?: string[]
): Promise<TranslationResult[]> {
  // Process translations sequentially to avoid rate limits
  const results: TranslationResult[] = [];
  for (const text of texts) {
    const result = await translateText(text, source, target, clientOrProvider, model, provider, preservedTerms);
    results.push(result);
    // Small delay between requests to avoid concurrent connection limits
    if (texts.indexOf(text) < texts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay (reduced from 200ms)
    }
  }
  return results;
}

// Backward compatibility wrapper - returns just the text
export async function translateTextSimple(
  text: string,
  source: string,
  target: string,
  clientOrProvider: any,
  model?: string,
  provider?: string,
  preservedTerms?: string[]
): Promise<string> {
  const result = await translateText(text, source, target, clientOrProvider, model, provider, preservedTerms);
  return result.text;
}
