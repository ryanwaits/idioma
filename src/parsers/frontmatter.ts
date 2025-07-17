import { Config } from '../utils/config';
import { translateText, TranslationResult } from '../ai/translate';
import { TokenUsage, aggregateUsage } from '../utils/cost';

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
  aiClient: any
): Promise<FrontmatterTranslationResult> {
  const translatableFields = config.translation?.frontmatterFields || ['title', 'description', 'sidebarTitle'];
  const lines = frontmatter.split('\n');
  const usages: TokenUsage[] = [];
  
  const translatedLines = await Promise.all(lines.map(async (line) => {
    const match = line.match(/^(\s*)([\w-]+):\s*(.+)$/);
    if (match) {
      const [, indent, key, value] = match;
      // Only translate if the key is in the translatable fields list
      if (!translatableFields.includes(key)) {
        return line;
      }
      // Don't translate boolean values or numbers
      if (value === 'true' || value === 'false' || !isNaN(Number(value))) {
        return line;
      }
      const result = await translateText(value, source, target, aiClient);
      usages.push(result.usage);
      return `${indent}${key}: ${result.text}`;
    }
    return line;
  }));
  
  return {
    content: translatedLines.join('\n'),
    usage: aggregateUsage(usages)
  };
}