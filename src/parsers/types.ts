import type { Config } from '../utils/config';
import type { TokenUsage } from '../utils/cost';

// Result of a translation strategy
export interface StrategyTranslationResult {
  content: string;
  usage: TokenUsage;
}

// Strategy interface for translation parsers
export interface TranslationStrategy {
  // Check if this strategy can handle the given file
  canHandle(filePath: string): boolean;

  // Translate the content using this strategy
  translate(
    content: string,
    source: string,
    target: string,
    config: Config,
    aiClient: any,
    model?: string,
    provider?: string
  ): Promise<StrategyTranslationResult>;

  // Optional: Get strategy name for logging
  getName?(): string;
}
