import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit'; // bun add unist-util-visit
import { generateText, generateObject, Output } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import yaml from 'js-yaml'; // bun add js-yaml
import crypto from 'crypto'; // Built-in for hashing

const program = new Command();
const configPath = path.resolve('openlocale.json');
const lockPath = path.resolve('openlocale.lock');
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Config Schema (unchanged)
const ConfigSchema = z.object({
  projectId: z.string().optional(),
  locale: z.object({
    source: z.string().default('en'),
    targets: z.array(z.string()).default([]),
  }),
  files: z.record(z.string(), z.object({
    include: z.array(z.string()),
  })),
  translation: z.object({
    frontmatterFields: z.array(z.string()).default(['title', 'description', 'sidebarTitle']),
    jsxAttributes: z.array(z.string()).default(['title', 'description', 'tag', 'alt', 'placeholder', 'label']),
    skipPatterns: z.array(z.string()).default([]),
  }).optional(),
});
type Config = z.infer<typeof ConfigSchema>;

async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    let config = ConfigSchema.parse(JSON.parse(data));
    if (!config.projectId) {
      config.projectId = `prj_${crypto.randomBytes(16).toString('hex').slice(0, 20)}`;
      await saveConfig(config);
    }
    return config;
  } catch {
    throw new Error('Config not found. Run "openlocale init" first.');
  }
}

async function saveConfig(config: Config) {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

// Lockfile Functions (unchanged)
interface LockFile {
  version: number;
  files: Record<string, { content: string }>;
}

async function loadLock(): Promise<LockFile> {
  try {
    const data = await fs.readFile(lockPath, 'utf-8');
    return yaml.load(data) as LockFile;
  } catch {
    return { version: 1, files: {} };
  }
}

async function saveLock(lock: LockFile) {
  const yamlStr = yaml.dump(lock, { indent: 2 });
  await fs.writeFile(lockPath, yamlStr);
}

// Helper: Replace [locale] in pattern
function replaceLocaleInPattern(pattern: string, locale: string): string {
  return pattern.replace(/\[locale\]/g, locale);
}

// Helper: Generate output path by replacing source locale with target in the file path
function generateOutputPath(sourcePath: string, sourceLocale: string, targetLocale: string): string {
  // Check if the path already contains the target locale to avoid double nesting
  if (sourcePath.includes(`/${targetLocale}/`)) {
    return sourcePath; // Already has the target locale, return as-is
  }

  // Replace sourceLocale with targetLocale in the path
  const regex = new RegExp(`/${sourceLocale}/`, 'g');
  let outputPath = sourcePath.replace(regex, `/${targetLocale}/`);

  // If no replacement happened, the source locale wasn't in the path
  // In this case, insert the target locale before the filename
  if (outputPath === sourcePath) {
    const dir = path.dirname(sourcePath);
    const fileName = path.basename(sourcePath);
    
    // Check if we're already in a locale directory
    const dirParts = dir.split('/');
    const lastDir = dirParts[dirParts.length - 1];
    
    // If the last directory is already a locale directory, replace it
    if (lastDir === sourceLocale || lastDir === targetLocale) {
      dirParts[dirParts.length - 1] = targetLocale;
      outputPath = path.join(...dirParts, fileName);
    } else {
      // Otherwise, add the locale directory
      outputPath = path.join(dir, targetLocale, fileName);
    }
  }

  return outputPath;
}

// Translation Function
async function translateText(text: string, source: string, target: string): Promise<string> {
  // Preserve leading/trailing whitespace
  const leadingWhitespace = text.match(/^\s*/)?.[0] || '';
  const trailingWhitespace = text.match(/\s*$/)?.[0] || '';
  const trimmedText = text.trim();
  
  const { text: translated } = await generateText({
    model: anthropic('claude-3-5-sonnet-20240620'),
    system: 'You are a translation assistant. You MUST return ONLY the translated text without any additional commentary, explanations, or phrases like "Here is the translation". Do not add any text before or after the translation.',
    prompt: `Translate the following text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links, code blocks).

Text to translate:
${trimmedText}`,
  });
  
  // Re-apply the original whitespace
  return leadingWhitespace + translated.trim() + trailingWhitespace;
}

// Translate frontmatter values only, not keys
async function translateFrontmatter(frontmatter: string, source: string, target: string, config: Config): Promise<string> {
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
      const translatedValue = await translateText(value, source, target);
      return `${indent}${key}: ${translatedValue}`;
    }
    return line;
  }));
  return translatedLines.join('\n');
}

// Add parent references to all nodes in the tree
function addParentReferences(tree: any) {
  visit(tree, (node, index, parent) => {
    if (node !== tree) {
      node.parent = parent;
    }
  });
}

// Translate MDX content including JSX attributes
async function translateMDXContent(content: string, source: string, target: string, config: Config): Promise<string> {
  // Parse MDX content with directive support
  const tree = remark()
    .use(remarkMdx)
    .use(remarkDirective)
    .parse(content);
  
  // Add parent references to enable directive checking
  addParentReferences(tree);
  
  // Get translatable attributes from config
  const translatableAttrs = config.translation?.jsxAttributes || ['title', 'description', 'tag', 'alt', 'placeholder', 'label'];
  
  // Collect all translatable text
  const textsToTranslate: { node: any, type: 'text' | 'attribute', attributeName?: string, parent?: any }[] = [];
  
  // Visit text nodes
  visit(tree, 'text', (node, index, parent) => {
    // Only translate text nodes that have meaningful content (not just whitespace)
    if (node.value.trim()) {
      // Skip text nodes that are part of directive type declarations
      // Only skip if this is exactly "type: value" pattern and the parent is inside a directive
      if (node.value.trim().match(/^type:\s*\w+$/)) {
        // Check if we're inside a directive by looking up the tree
        let currentParent = parent;
        while (currentParent) {
          if (currentParent.type === 'containerDirective' || 
              currentParent.type === 'leafDirective' || 
              currentParent.type === 'textDirective') {
            return; // Skip type declarations inside directives
          }
          currentParent = currentParent.parent;
        }
      }
      
      textsToTranslate.push({ node, type: 'text', parent });
    }
  });
  
  // Visit JSX elements to find string attributes
  visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node: any) => {
    if (node.attributes) {
      node.attributes.forEach((attr: any) => {
        if (attr.type === 'mdxJsxAttribute' && attr.value && typeof attr.value === 'string') {
          // Only translate configured attributes
          if (translatableAttrs.includes(attr.name)) {
            textsToTranslate.push({ 
              node: attr, 
              type: 'attribute',
              attributeName: attr.name
            });
          }
        }
      });
    }
  });
  
  // Visit image nodes to translate alt text
  visit(tree, 'image', (node: any) => {
    if (node.alt && node.alt.trim()) {
      textsToTranslate.push({
        node,
        type: 'attribute',
        attributeName: 'alt'
      });
    }
  });
  
  // Translate all texts
  const translations = await Promise.all(
    textsToTranslate.map(item => {
      if (item.type === 'text') {
        return translateText(item.node.value, source, target);
      } else if (item.attributeName === 'alt' && item.node.type === 'image') {
        return translateText(item.node.alt, source, target);
      } else {
        return translateText(item.node.value, source, target);
      }
    })
  );
  
  // Apply translations
  textsToTranslate.forEach((item, index) => {
    if (item.type === 'text') {
      item.node.value = translations[index];
    } else if (item.attributeName === 'alt' && item.node.type === 'image') {
      item.node.alt = translations[index];
    } else {
      item.node.value = translations[index];
    }
  });
  
  // Stringify back to MDX with directive support
  return remark()
    .use(remarkMdx)
    .use(remarkDirective)
    .stringify(tree);
}

// File Translation (updated with generateOutputPath)
async function translateFile(filePath: string, source: string, target: string, lock: LockFile, config: Config) {
  const content = await fs.readFile(filePath, 'utf-8');
  const currentHash = crypto.createHash('md5').update(content).digest('hex');

  if (lock.files[filePath] && lock.files[filePath].content === currentHash) {
    console.log(`Skipped (unchanged): ${filePath} -> ${target}`);
    return;
  }

  // Split frontmatter and content
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let translatedContent = '';

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const mainContent = frontmatterMatch[2];
    
    // Translate only frontmatter values, not keys
    const translatedFrontmatter = await translateFrontmatter(frontmatter, source, target, config);
    
    // For MDX content, we need to translate JSX attributes too
    const translatedMain = await translateMDXContent(mainContent, source, target, config);
    
    translatedContent = `---\n${translatedFrontmatter}\n---\n${translatedMain}`;
  } else {
    // No frontmatter, translate entire content
    translatedContent = await translateMDXContent(content, source, target, config);
  }

  const outputPath = generateOutputPath(filePath, source, target);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, translatedContent);

  lock.files[filePath] = { content: currentHash };
}

// Commands (updated translate for placeholder support)
program.command('init').action(async () => {
  const defaultConfig: Config = {
    projectId: `prj_${crypto.randomBytes(16).toString('hex').slice(0, 20)}`,
    locale: { source: 'en', targets: [] },
    files: { mdx: { include: ["content/docs/[locale]/**/*.mdx"] } }, // Sample with placeholder
    translation: {
      frontmatterFields: ['title', 'description', 'sidebarTitle'],
      jsxAttributes: ['title', 'description', 'tag', 'alt', 'placeholder', 'label'],
      skipPatterns: []
    }
  };
  await saveConfig(defaultConfig);
  console.log('Config initialized at openlocale.json');
});

program.command('translate').action(async () => {
  const config = await loadConfig();
  const lock = await loadLock();

  let allFiles: string[] = [];
  for (const format in config.files) {
    const patterns = config.files?.[format]?.include ?? [];
    const sourcePatterns = patterns.map(p => replaceLocaleInPattern(p, config.locale.source));
    const files = (await Promise.all(sourcePatterns.map(pattern => glob(pattern)))).flat();
    allFiles = [...allFiles, ...files];
  }

  for (const file of allFiles) {
    for (const target of config.locale.targets) {
      await translateFile(file, config.locale.source, target, lock, config);
    }
  }

  await saveLock(lock);
  console.log('Translation complete. Lockfile updated.');
});

program.command('locale').command('add').argument('<locales>', 'Comma-separated locales').action(async (localesStr) => {
  const config = await loadConfig();
  const newLocales = localesStr.split(',');
  config.locale.targets = [...new Set([...config.locale.targets, ...newLocales])];
  await saveConfig(config);
});

// Similar for remove, overrides (stub)

program.parse();