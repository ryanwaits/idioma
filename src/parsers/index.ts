import { MDXStrategy } from './mdx';
import type { TranslationStrategy } from './types';

export * from './frontmatter';
export * from './mdx';
// Export all parser types and utilities
export * from './types';

// Strategy registry - add new strategies here
export const strategies: TranslationStrategy[] = [
  new MDXStrategy(),
  // Future strategies can be added here:
  // new JSONStrategy(),
  // new YAMLStrategy(),
  // new HTMLStrategy(),
];

// Helper to find appropriate strategy for a file
export function findStrategy(filePath: string): TranslationStrategy | undefined {
  return strategies.find((strategy) => strategy.canHandle(filePath));
}

// Alias for SDK compatibility
export const getFileStrategy = findStrategy;
