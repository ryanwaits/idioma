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

  const translatedLines = await Promise.all(
    lines.map(async (line) => {
      const match = line.match(/^(\s*)([\w-]+):\s*(.+)$/);
      if (match) {
        const [, indent, key, value] = match;
        // Only translate if the key is in the translatable fields list
        if (!translatableFields.includes(key!)) {
          return line;
        }
        // Don't translate boolean values or numbers
        if (value === 'true' || value === 'false' || !Number.isNaN(Number(value))) {
          return line;
        }
        const result = await translateText(value!, source, target, aiClient, model, provider);
        usages.push(result.usage);
        return `${indent}${key}: ${result.text}`;
      }
      return line;
    })
  );

  return {
    content: translatedLines.join('\n'),
    usage: aggregateUsage(usages),
  };
}
