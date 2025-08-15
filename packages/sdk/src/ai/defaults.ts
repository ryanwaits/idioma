/**
 * Smart defaults for AI provider and model selection
 * Based on available API keys and best practices
 */

export interface SmartDefaults {
  provider: string;
  model: string;
}

/**
 * Get smart defaults for provider and model based on available API keys
 * Priority:
 * 1. If both OPENAI_API_KEY and ANTHROPIC_API_KEY exist -> anthropic (more capable)
 * 2. If only OPENAI_API_KEY -> openai 
 * 3. If only ANTHROPIC_API_KEY -> anthropic
 * 4. If neither -> anthropic (user will get error when they try to use it)
 */
export function getSmartDefaults(): SmartDefaults {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (hasAnthropic) {
    // Prefer Anthropic if available (more capable models)
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620'
    };
  } else if (hasOpenAI) {
    // Use OpenAI if only OpenAI key is available
    return {
      provider: 'openai', 
      model: 'gpt-4o'  // Using gpt-4o instead of gpt-5 as it's more available
    };
  } else {
    // Default to Anthropic (user will need to set API key)
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620'
    };
  }
}

/**
 * Get the default model for a given provider
 */
export function getDefaultModelForProvider(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-3-5-sonnet-20240620';
    case 'openai':
      return 'gpt-4o';
    default:
      return 'claude-3-5-sonnet-20240620';
  }
}

/**
 * Check if the current environment has the required API key for a provider
 */
export function hasApiKeyForProvider(provider: string): boolean {
  switch (provider) {
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    default:
      return false;
  }
}

/**
 * Get effective provider and model, applying smart defaults if not specified
 */
export function getEffectiveProviderAndModel(
  configProvider?: string,
  configModel?: string
): SmartDefaults {
  const smartDefaults = getSmartDefaults();
  
  const provider = configProvider || smartDefaults.provider;
  const model = configModel || getDefaultModelForProvider(provider);
  
  return { provider, model };
}