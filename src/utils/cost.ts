// Cost calculation utilities for AI translation services
import { getDefaultModel } from "../ai/translate";

// Pricing per million tokens (as of 2024)
export const PRICING = {
  anthropic: {
    "claude-3-5-sonnet-20240620": {
      input: 3.0, // $3 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    "claude-3-7-sonnet-20250219": {
      input: 3.0, // $3 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    "claude-4-sonnet-20250514": {
      input: 3.0, // $3 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    "claude-4-opus-20250514": {
      input: 15.0, // $15 per million input tokens
      output: 75.0, // $75 per million output tokens
    },
  },
  openai: {
    "gpt-4o": {
      input: 5.0, // $5 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    "gpt-4o-2024-08-06": {
      input: 5.0, // $5 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    "gpt-4o-mini": {
      input: 0.15, // $0.15 per million input tokens
      output: 0.6, // $0.60 per million output tokens
    },
    "o3-mini": {
      input: 1.1, // $1.10 per million input tokens
      output: 4.4, // $4.40 per million output tokens
    },
    o3: {
      input: 2.0, // $2.00 per million input tokens
      output: 8.0, // $8.00 per million output tokens
    },
  },
  moonshot: {
    "kimi-k2": {
      input: 0.14, // $0.14 per million input tokens
      output: 2.49, // $2.49 per million output tokens
    },
  },
};

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  formattedCost: string;
}

/**
 * Calculate the cost of a translation based on token usage
 */
export function calculateCost(
  usage: TokenUsage,
  provider: string = "anthropic",
  model?: string,
): CostCalculation {
  const actualModel = model || getDefaultModel(provider);
  const providerPricing = PRICING[provider as keyof typeof PRICING];
  const pricing =
    providerPricing?.[actualModel as keyof typeof providerPricing];

  if (!pricing) {
    console.warn(
      `No pricing found for ${provider}/${actualModel}, using default Anthropic pricing`,
    );
    const defaultPricing = PRICING.anthropic["claude-3-5-sonnet-20240620"];
    return calculateCostWithPricing(usage, defaultPricing);
  }

  return calculateCostWithPricing(usage, pricing);
}

function calculateCostWithPricing(
  usage: TokenUsage,
  pricing: { input: number; output: number },
): CostCalculation {
  // Convert from per-million to per-token pricing
  const inputCostPerToken = pricing.input / 1_000_000;
  const outputCostPerToken = pricing.output / 1_000_000;

  const inputCost = usage.promptTokens * inputCostPerToken;
  const outputCost = usage.completionTokens * outputCostPerToken;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    formattedCost: formatCost(totalCost),
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return "< $0.01";
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Aggregate multiple token usages
 */
export function aggregateUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (total, usage) => ({
      promptTokens: total.promptTokens + usage.promptTokens,
      completionTokens: total.completionTokens + usage.completionTokens,
      totalTokens: total.totalTokens + usage.totalTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}
