import { translateText } from '../ai/translate';
import type { Config } from '../utils/config';
import { getEffectiveFileConfig } from '../utils/config-normalizer';
import { aggregateUsage, type TokenUsage } from '../utils/cost';
import { getPreservedTerms, parsePreserveRules } from '../utils/preserve';

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
  const skipFrontmatterFields = effectiveConfig.skipAttributes?.frontmatter || [];

  // Parse preserve rules
  const preserveRules = parsePreserveRules(config.preserve || []);
  const preservedTerms = getPreservedTerms(preserveRules);

  const lines = frontmatter.split('\n');
  const usages: TokenUsage[] = [];

  // Process lines sequentially to avoid rate limits
  const translatedLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(\s*)([\w-]+):\s*(.+)$/);
    if (match) {
      const [, indent, key, value] = match;
      // Skip if the key is in the skip fields list
      if (key && skipFrontmatterFields.includes(key)) {
        translatedLines.push(line);
        continue;
      }
      if (value === 'true' || value === 'false' || !Number.isNaN(Number(value))) {
        translatedLines.push(line);
        continue;
      }
      if (!value) {
        translatedLines.push(line);
        continue;
      }
      const result = await translateText(
        value,
        source,
        target,
        aiClient,
        model,
        provider,
        preservedTerms
      );
      usages.push(result.usage);

      // Escape the translated text if it contains colons or special YAML characters
      let translatedValue = result.text;
      if (
        translatedValue.includes(':') ||
        translatedValue.includes('"') ||
        translatedValue.includes("'")
      ) {
        // Wrap in quotes and escape any existing quotes
        translatedValue = `"${translatedValue.replace(/"/g, '\\"')}"`;
      }

      translatedLines.push(`${indent}${key}: ${translatedValue}`);

      // Add small delay between translations to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay (reduced from 100ms)
    } else {
      translatedLines.push(line);
    }
  }

  return {
    content: translatedLines.join('\n'),
    usage: aggregateUsage(usages),
  };
}
