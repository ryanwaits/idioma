import { Config } from '../utils/config';
import { translateText } from '../ai/translate';

// Translate frontmatter values only, not keys
export async function translateFrontmatter(
  frontmatter: string,
  source: string,
  target: string,
  config: Config,
  aiClient: any
): Promise<string> {
  const translatableFields = config.translation?.frontmatterFields || ['title', 'description', 'sidebarTitle'];
  const lines = frontmatter.split('\n');
  
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
      const translatedValue = await translateText(value, source, target, aiClient);
      return `${indent}${key}: ${translatedValue}`;
    }
    return line;
  }));
  
  return translatedLines.join('\n');
}