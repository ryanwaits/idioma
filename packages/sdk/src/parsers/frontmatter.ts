import { translateText } from '../ai/translate';
import type { Config } from '../utils/config';
import { getEffectiveFileConfig } from '../utils/config-normalizer';
import { aggregateUsage, type TokenUsage } from '../utils/cost';

export interface FrontmatterTranslationResult {
  content: string;
  usage: TokenUsage;
}

// Translate frontmatter values only, not keys
export async function translateFrontmatter(
  frontmatter: string,
  source: string,
  target: string,
  config: Config,
  aiClient: any,
  model?: string,
  provider?: string
): Promise<FrontmatterTranslationResult> {
  // Get effective config with smart defaults
  const effectiveConfig = getEffectiveFileConfig(config, 'mdx');
  const translatableFields = effectiveConfig.frontmatterFields || [];
  const lines = frontmatter.split('\n');
  const usages: TokenUsage[] = [];

  // Process lines sequentially to avoid rate limits
  const translatedLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(\s*)([\w-]+):\s*(.+)$/);
    if (match) {
      const [, indent, key, value] = match;
      // Only translate if the key is in the translatable fields list
      if (!translatableFields.includes(key!)) {
        translatedLines.push(line);
        continue;
      }
      if (value === 'true' || value === 'false' || !Number.isNaN(Number(value))) {
        translatedLines.push(line);
        continue;
      }
      const result = await translateText(value!, source, target, aiClient, model, provider);
      usages.push(result.usage);
      translatedLines.push(`${indent}${key}: ${result.text}`);

      // Add small delay between translations to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay (reduced from 100ms)
    } else {
      translatedLines.push(line);
    }
  }

  return {
    content: translatedLines.join('\n'),
    usage: aggregateUsage(usages),
  };
}
