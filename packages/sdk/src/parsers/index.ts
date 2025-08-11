/**
 * Parser module - maintains backward compatibility while using the new unified strategies
 */

// Re-export frontmatter utilities (still used directly)
export * from './frontmatter';

// Export parser types for backward compatibility
export * from './types';

// Import and adapt the new unified strategies
import {
  findStrategy as findUnifiedStrategy,
  strategies as unifiedStrategies,
} from '../strategies';
import type { TranslationStrategy } from './types';

// Convert unified strategies to parser interface for backward compatibility
export const strategies: TranslationStrategy[] = unifiedStrategies.map((strategy) => ({
  canHandle: (filePath: string) => strategy.canHandle(filePath),
  getName: () => strategy.getName(),
  translate: async (content, source, target, config, aiClient, model, provider) => {
    const result = await strategy.translate(
      content,
      source,
      target,
      config,
      aiClient,
      model,
      provider
    );
    return {
      content: result.content,
      usage: result.usage,
    };
  },
}));

// Helper to find appropriate strategy for a file
export function findStrategy(filePath: string): TranslationStrategy | undefined {
  const unifiedStrategy = findUnifiedStrategy(filePath);
  if (!unifiedStrategy) return undefined;

  // Return adapter that matches the parser interface
  return {
    canHandle: (filePath: string) => unifiedStrategy.canHandle(filePath),
    getName: () => unifiedStrategy.getName(),
    translate: async (content, source, target, config, aiClient, model, provider) => {
      const result = await unifiedStrategy.translate(
        content,
        source,
        target,
        config,
        aiClient,
        model,
        provider
      );
      return {
        content: result.content,
        usage: result.usage,
      };
    },
  };
}

// Alias for SDK compatibility
export const getFileStrategy: any = findStrategy;
