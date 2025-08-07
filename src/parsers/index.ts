import { MDXStrategy } from './mdx';
import type { TranslationStrategy } from './types';
import { JsonStrategyAdapter } from './json-adapter';
import { YamlStrategyAdapter } from './yaml-adapter';

export * from './frontmatter';
export * from './mdx';
// Export all parser types and utilities
export * from './types';

// Strategy registry - add new strategies here
export const strategies: TranslationStrategy[] = [
  new MDXStrategy(),
  new JsonStrategyAdapter(),
  new YamlStrategyAdapter(),
  // Future strategies can be added here:
  // new HTMLStrategy(),
  // new XMLStrategy(),
  // new CSVStrategy(),
  // new JavaScriptStrategy(),
];

// Helper to find appropriate strategy for a file
export function findStrategy(filePath: string): TranslationStrategy | undefined {
  return strategies.find((strategy) => strategy.canHandle(filePath));
}

// Alias for SDK compatibility
export const getFileStrategy = findStrategy;
