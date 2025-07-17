import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

// AI Provider factory - returns configured AI client
export function createAiClient(provider: string, apiKey?: string): any {
  switch (provider) {
    case 'anthropic':
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
      }
      return createAnthropic({ apiKey: anthropicKey });
    
    // Future providers can be added here
    // case 'openai':
    //   const openaiKey = apiKey || process.env.OPENAI_API_KEY;
    //   return createOpenAI({ apiKey: openaiKey });
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Translation function with dependency injection for AI client
export async function translateText(
  text: string, 
  source: string, 
  target: string, 
  client: any,
  model?: string
): Promise<string> {
  // Preserve leading/trailing whitespace
  const leadingWhitespace = text.match(/^\s*/)?.[0] || '';
  const trailingWhitespace = text.match(/\s*$/)?.[0] || '';
  const trimmedText = text.trim();
  
  // Skip empty text
  if (!trimmedText) {
    return text;
  }
  
  const { text: translated } = await generateText({
    model: client(model || 'claude-3-5-sonnet-20240620'),
    system: 'You are a translation assistant. You MUST return ONLY the translated text without any additional commentary, explanations, or phrases like "Here is the translation". Do not add any text before or after the translation.',
    prompt: `Translate the following text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links, code blocks).

Text to translate:
${trimmedText}`,
  });
  
  // Re-apply the original whitespace
  return leadingWhitespace + translated.trim() + trailingWhitespace;
}

// Batch translation helper for performance
export async function translateBatch(
  texts: string[],
  source: string,
  target: string,
  client: any,
  model?: string
): Promise<string[]> {
  // Process translations in parallel for better performance
  return Promise.all(
    texts.map(text => translateText(text, source, target, client, model))
  );
}