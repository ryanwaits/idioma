import * as path from 'node:path';
import type { TranslationStrategy } from '../strategies/base.js';

export class FormatDetector {
  private strategies = new Map<string, TranslationStrategy>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Strategies will be registered dynamically as they're implemented
    // For now, we'll import them conditionally when they exist
    await this.registerDefaultStrategies();
    this.initialized = true;
  }

  private async registerDefaultStrategies(): Promise<void> {
    // These imports will be added as we implement each strategy
    // For now, we'll check if the files exist before importing

    const strategyModules = [
      { extensions: ['.json'], module: '../strategies/json.js' },
      { extensions: ['.yaml', '.yml'], module: '../strategies/yaml.js' },
      { extensions: ['.html', '.htm'], module: '../strategies/html.js' },
      { extensions: ['.csv'], module: '../strategies/csv.js' },
      { extensions: ['.xml'], module: '../strategies/xml.js' },
      {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'],
        module: '../strategies/javascript.js',
      },
    ];

    for (const { extensions, module } of strategyModules) {
      try {
        const strategyModule = await import(module);
        const StrategyClass =
          strategyModule.default || strategyModule[Object.keys(strategyModule)[0]];

        if (StrategyClass) {
          const strategy = new StrategyClass();
          for (const ext of extensions) {
            this.strategies.set(ext, strategy);
          }
        }
      } catch (error) {
        // Strategy not implemented yet, skip
        console.error(`Strategy not yet implemented: ${error}`);
      }
    }
  }

  register(extension: string, strategy: TranslationStrategy): void {
    this.strategies.set(extension.toLowerCase(), strategy);
  }

  detectFormat(filePath: string): TranslationStrategy | null {
    const ext = path.extname(filePath).toLowerCase();
    return this.strategies.get(ext) || null;
  }

  async detectFromContent(content: string): Promise<TranslationStrategy | null> {
    // Try to detect format from content
    if (this.looksLikeJson(content)) {
      return this.strategies.get('.json') || null;
    }
    if (this.looksLikeYaml(content)) {
      return this.strategies.get('.yaml') || null;
    }
    if (this.looksLikeHtml(content)) {
      return this.strategies.get('.html') || null;
    }
    if (this.looksLikeXml(content)) {
      return this.strategies.get('.xml') || null;
    }
    if (this.looksLikeCsv(content)) {
      return this.strategies.get('.csv') || null;
    }
    if (this.looksLikeJavaScript(content)) {
      return this.strategies.get('.js') || null;
    }

    return null;
  }

  private looksLikeJson(content: string): boolean {
    const trimmed = content.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    );
  }

  private looksLikeYaml(content: string): boolean {
    return /^---\n/.test(content) || /^\w+:\s/.test(content);
  }

  private looksLikeHtml(content: string): boolean {
    return /<html|<body|<div|<!DOCTYPE/i.test(content);
  }

  private looksLikeXml(content: string): boolean {
    return /^<\?xml/.test(content) || /<\/\w+>$/.test(content.trim());
  }

  private looksLikeCsv(content: string): boolean {
    const lines = content.split('\n').slice(0, 2);
    return lines.some((line) => {
      const commaCount = (line.match(/,/g) || []).length;
      const tabCount = (line.match(/\t/g) || []).length;
      const semicolonCount = (line.match(/;/g) || []).length;
      return commaCount > 1 || tabCount > 1 || semicolonCount > 1;
    });
  }

  private looksLikeJavaScript(content: string): boolean {
    return (
      /^(import|export|const|let|var|function|class)\s/.test(content) ||
      /^\/\/ |^\/\*/.test(content) || // Comments
      /^['"]use strict['"]/.test(content)
    );
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.strategies.keys());
  }

  getStrategyForExtension(extension: string): TranslationStrategy | null {
    return this.strategies.get(extension.toLowerCase()) || null;
  }
}

// Singleton instance
let detector: FormatDetector | null = null;

export function getFormatDetector(): FormatDetector {
  if (!detector) {
    detector = new FormatDetector();
  }
  return detector;
}

export async function initializeFormatDetector(): Promise<FormatDetector> {
  const det = getFormatDetector();
  await det.initialize();
  return det;
}
