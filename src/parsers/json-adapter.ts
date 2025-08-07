import type { TranslationStrategy, StrategyTranslationResult } from './types';
import type { Config } from '../utils/config';
import type { TokenUsage } from '../utils/cost';
import { JsonTranslationStrategy } from '../core/strategies/json';
import { translateText } from '../ai/translate';

export class JsonStrategyAdapter implements TranslationStrategy {
  private coreStrategy: JsonTranslationStrategy;
  
  constructor() {
    this.coreStrategy = new JsonTranslationStrategy({
      skipEmptyStrings: true
    });
  }
  
  canHandle(filePath: string): boolean {
    return this.coreStrategy.canHandle(filePath);
  }
  
  async translate(
    content: string,
    source: string,
    target: string,
    config: Config,
    aiClient: any,
    model?: string,
    provider?: string
  ): Promise<StrategyTranslationResult> {
    // Parse the JSON content
    const parseResult = await this.coreStrategy.parse(content);
    
    // Collect all translations
    const translations = new Map<string, string>();
    const allUsages: TokenUsage[] = [];
    
    // Translate each translatable string
    for (const [path, node] of parseResult.translatableContent) {
      const result = await translateText(
        node.value,
        source,
        target,
        provider || config.translation?.provider || 'anthropic',
        model || config.translation?.model
      );
      
      translations.set(path, result.text);
      allUsages.push(result.usage);
    }
    
    // Reconstruct the JSON with translations
    const translatedContent = await this.coreStrategy.reconstruct(translations, parseResult.metadata);
    
    // Aggregate usage
    const totalUsage = allUsages.reduce(
      (acc, usage) => ({
        promptTokens: acc.promptTokens + usage.promptTokens,
        completionTokens: acc.completionTokens + usage.completionTokens,
        totalTokens: acc.totalTokens + usage.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
    
    return {
      content: translatedContent,
      usage: totalUsage,
    };
  }
  
  getName(): string {
    return 'JSON';
  }
}