/**
 * Unified strategy exports
 * All translation strategies are exported from this single location
 * for cleaner imports and better developer experience
 */

import { JsonStrategy } from './json';
import { YamlStrategy } from './yaml';
import { MdxStrategy } from './mdx';
import { HtmlStrategy } from './html';
import { XmlStrategy } from './xml';
import { CSVTranslationStrategy } from './csv';
import type { BaseTranslationStrategy } from './base';

// Export base class and types for extending
export { BaseTranslationStrategy, type TranslationResult, type ParseResult, type TranslatableNode, type ValidationResult } from './base';

// Export individual strategies
export { JsonStrategy } from './json';
export { YamlStrategy } from './yaml';
export { MdxStrategy } from './mdx';
export { HtmlStrategy } from './html';
export { XmlStrategy } from './xml';
export { CSVTranslationStrategy } from './csv';

// Strategy registry - all strategies in one place
export const strategies: BaseTranslationStrategy[] = [
  new MdxStrategy(),
  new JsonStrategy({ skipEmptyStrings: true }),
  new YamlStrategy({ preserveComments: true, skipEmptyStrings: true }),
  new HtmlStrategy(),
  new XmlStrategy(),
  new CSVTranslationStrategy(),
  // Future strategies:
  // new JavaScriptStrategy(),
];

/**
 * Find the appropriate strategy for a given file
 */
export function findStrategy(filePath: string): BaseTranslationStrategy | undefined {
  return strategies.find((strategy) => strategy.canHandle(filePath));
}

/**
 * Get all registered strategies
 */
export function getAllStrategies(): BaseTranslationStrategy[] {
  return strategies;
}

/**
 * Get strategy by name
 */
export function getStrategyByName(name: string): BaseTranslationStrategy | undefined {
  return strategies.find((strategy) => strategy.getName().toLowerCase() === name.toLowerCase());
}

/**
 * Check if a file type is supported
 */
export function isFileSupported(filePath: string): boolean {
  return strategies.some((strategy) => strategy.canHandle(filePath));
}

/**
 * Get list of supported file extensions
 */
export function getSupportedExtensions(): string[] {
  const extensions = new Set<string>();
  
  // Test common extensions against strategies
  const testExtensions = [
    '.mdx', '.md', '.json', '.yaml', '.yml', 
    '.html', '.htm', '.xml', '.csv', 
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'
  ];
  
  for (const ext of testExtensions) {
    if (strategies.some(s => s.canHandle(`test${ext}`))) {
      extensions.add(ext);
    }
  }
  
  return Array.from(extensions);
}