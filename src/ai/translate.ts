import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { TokenUsage } from "../utils/cost";

// Result types that include usage metadata
export interface TranslationResult {
  text: string;
  usage: TokenUsage;
}

// Get default model for each provider
export function getDefaultModel(provider: string): string {
  switch (provider) {
    case "anthropic":
      return "claude-3-5-sonnet-20240620";
    case "openai":
      return "gpt-4o-2024-08-06";
    default:
      return "claude-3-5-sonnet-20240620";
  }
}

// AI Provider factory - returns configured AI client
export function createAiClient(provider: string, apiKey?: string): any {
  switch (provider) {
    case "anthropic":
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error(
          "Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.",
        );
      }
      return createAnthropic({ apiKey: anthropicKey });

    case "openai":
      const openaiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error(
          "OpenAI API key not found. Set OPENAI_API_KEY environment variable.",
        );
      }
      return createOpenAI({ apiKey: openaiKey });

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
  model?: string,
  provider?: string,
): Promise<TranslationResult> {
  // Preserve leading/trailing whitespace
  const leadingWhitespace = text.match(/^\s*/)?.[0] || "";
  const trailingWhitespace = text.match(/\s*$/)?.[0] || "";
  const trimmedText = text.trim();

  // Skip empty text
  if (!trimmedText) {
    return {
      text,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  const result = await generateText({
    model: client(model || getDefaultModel(provider || "anthropic")),
    system:
      'You are a translation assistant. You MUST return ONLY the translated text without any additional commentary, explanations, or phrases like "Here is the translation". Do not add any text before or after the translation.',
    prompt: `Translate the following text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links, code blocks).

Text to translate:
${trimmedText}`,
  });

  // Re-apply the original whitespace
  const translatedText =
    leadingWhitespace + result.text.trim() + trailingWhitespace;

  return {
    text: translatedText,
    usage: result.usage,
  };
}

// Batch translation helper for performance
export async function translateBatch(
  texts: string[],
  source: string,
  target: string,
  client: any,
  model?: string,
  provider?: string,
): Promise<TranslationResult[]> {
  // Process translations in parallel for better performance
  return Promise.all(
    texts.map((text) => translateText(text, source, target, client, model, provider)),
  );
}

// Backward compatibility wrapper - returns just the text
export async function translateTextSimple(
  text: string,
  source: string,
  target: string,
  client: any,
  model?: string,
  provider?: string,
): Promise<string> {
  const result = await translateText(text, source, target, client, model, provider);
  return result.text;
}
