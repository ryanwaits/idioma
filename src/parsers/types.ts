import { Config } from '../utils/config';

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
    aiClient: any
  ): Promise<string>;
  
  // Optional: Get strategy name for logging
  getName?(): string;
}