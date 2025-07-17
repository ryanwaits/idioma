// Cost calculation utilities for AI translation services

// Pricing per million tokens (as of 2024)
export const PRICING = {
  anthropic: {
    'claude-3-5-sonnet-20240620': {
      input: 3.00,   // $3 per million input tokens
      output: 15.00, // $15 per million output tokens
    },
    'claude-3-5-sonnet-20241022': {
      input: 3.00,   // $3 per million input tokens
      output: 15.00, // $15 per million output tokens
    },
    'claude-3-opus-20240229': {
      input: 15.00,  // $15 per million input tokens
      output: 75.00, // $75 per million output tokens
    },
    'claude-3-haiku-20240307': {
      input: 0.25,   // $0.25 per million input tokens
      output: 1.25,  // $1.25 per million output tokens
    },
  },
  // Future providers can be added here
  openai: {
    'gpt-4o': {
      input: 2.50,   // $2.50 per million input tokens
      output: 10.00, // $10 per million output tokens
    },
    'gpt-4o-mini': {
      input: 0.15,   // $0.15 per million input tokens
      output: 0.60,  // $0.60 per million output tokens
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
  provider: string = 'anthropic',
  model: string = 'claude-3-5-sonnet-20240620'
): CostCalculation {
  const pricing = PRICING[provider as keyof typeof PRICING]?.[model];
  
  if (!pricing) {
    console.warn(`No pricing found for ${provider}/${model}, using default Anthropic pricing`);
    const defaultPricing = PRICING.anthropic['claude-3-5-sonnet-20240620'];
    return calculateCostWithPricing(usage, defaultPricing);
  }
  
  return calculateCostWithPricing(usage, pricing);
}

function calculateCostWithPricing(
  usage: TokenUsage,
  pricing: { input: number; output: number }
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
    return '< $0.01';
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
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
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