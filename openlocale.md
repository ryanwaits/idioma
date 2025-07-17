This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.claude/
  settings.local.json
src/
  cli.ts
.gitignore
.repomixignore
openlocale.json
openlocale.lock
package.json
README.md
repomix.config.json
tsconfig.json
```

# Files

## File: .claude/settings.local.json
````json
{
  "permissions": {
    "allow": [
      "Bash(bun:*)"
    ],
    "deny": []
  }
}
````

## File: .repomixignore
````
node_modules
content/docs
````

## File: repomix.config.json
````json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "openlocale.md",
    "style": "markdown",
    "parsableStyle": false,
    "compress": false,
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "includeEmptyDirectories": true,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false
    }
  },
  "include": [],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true
  }
}
````

## File: src/cli.ts
````typescript
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import type { Node, Parent } from "unist";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import { generateText, Output } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import yaml from "js-yaml";
import crypto from "crypto";

const program = new Command();
const configPath = path.resolve("openlocale.json");
const lockPath = path.resolve("openlocale.lock");
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Config Schema (unchanged)
const ConfigSchema = z.object({
  projectId: z.string().optional(),
  locale: z.object({
    source: z.string().default("en"),
    targets: z.array(z.string()).default([]),
  }),
  files: z.record(
    z.string(),
    z.object({
      include: z.array(z.string()),
    }),
  ),
  translation: z
    .object({
      frontmatterFields: z
        .array(z.string())
        .default(["title", "description", "sidebarTitle"]),
      jsxAttributes: z
        .array(z.string())
        .default([
          "title",
          "description",
          "tag",
          "alt",
          "placeholder",
          "label",
        ]),
      skipPatterns: z.array(z.string()).default([]),
    })
    .optional(),
});
type Config = z.infer<typeof ConfigSchema>;

async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(configPath, "utf-8");
    let config = ConfigSchema.parse(JSON.parse(data));
    if (!config.projectId) {
      config.projectId = `prj_${crypto.randomBytes(16).toString("hex").slice(0, 20)}`;
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
    const data = await fs.readFile(lockPath, "utf-8");
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
function generateOutputPath(
  sourcePath: string,
  sourceLocale: string,
  targetLocale: string,
): string {
  // Check if the path already contains the target locale to avoid double nesting
  if (sourcePath.includes(`/${targetLocale}/`)) {
    return sourcePath; // Already has the target locale, return as-is
  }

  // Replace sourceLocale with targetLocale in the path
  const regex = new RegExp(`/${sourceLocale}/`, "g");
  let outputPath = sourcePath.replace(regex, `/${targetLocale}/`);

  // If no replacement happened, the source locale wasn't in the path
  // In this case, insert the target locale before the filename
  if (outputPath === sourcePath) {
    const dir = path.dirname(sourcePath);
    const fileName = path.basename(sourcePath);

    // Check if we're already in a locale directory
    const dirParts = dir.split("/");
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
async function translateText(
  text: string,
  source: string,
  target: string,
): Promise<string> {
  // Preserve leading/trailing whitespace
  const leadingWhitespace = text.match(/^\s*/)?.[0] || "";
  const trailingWhitespace = text.match(/\s*$/)?.[0] || "";
  const trimmedText = text.trim();

  const { text: translated } = await generateText({
    model: anthropic("claude-3-5-sonnet-20240620"),
    system:
      'You are a translation assistant. You MUST return ONLY the translated text without any additional commentary, explanations, or phrases like "Here is the translation". Do not add any text before or after the translation.',
    prompt: `Translate the following text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links, code blocks).

Text to translate:
${trimmedText}`,
  });

  // Re-apply the original whitespace
  return leadingWhitespace + translated.trim() + trailingWhitespace;
}

// Translate frontmatter values only, not keys
async function translateFrontmatter(
  frontmatter: string,
  source: string,
  target: string,
  config: Config,
): Promise<string> {
  const translatableFields = config.translation?.frontmatterFields || [
    "title",
    "description",
    "sidebarTitle",
  ];
  const lines = frontmatter.split("\n");
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
        if (value === "true" || value === "false" || !isNaN(Number(value))) {
          return line;
        }
        const translatedValue = await translateText(value!, source, target);
        return `${indent}${key}: ${translatedValue}`;
      }
      return line;
    }),
  );
  return translatedLines.join("\n");
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
async function translateMDXContent(
  content: string,
  source: string,
  target: string,
  config: Config,
): Promise<string> {
  // Parse MDX content with directive support
  const tree = remark().use(remarkMdx).use(remarkDirective).parse(content);

  // Add parent references to enable directive checking
  addParentReferences(tree);

  // Get translatable attributes from config
  const translatableAttrs = config.translation?.jsxAttributes || [
    "title",
    "description",
    "tag",
    "alt",
    "placeholder",
    "label",
  ];

  // Collect all translatable text
  const textsToTranslate: {
    node: any;
    type: "text" | "attribute";
    attributeName?: string;
    parent?: any;
  }[] = [];

  // Visit text nodes
  visit(tree, "text", (node, index, parent) => {
    // Only translate text nodes that have meaningful content (not just whitespace)
    if (node.value.trim()) {
      // Skip text nodes that are part of directive type declarations
      // Only skip if this is exactly "type: value" pattern and the parent is inside a directive
      if (node.value.trim().match(/^type:\s*\w+$/)) {
        // Check if we're inside a directive by looking up the tree
        let currentParent = parent as Parent | undefined;
        while (currentParent) {
          const nodeType = (currentParent as Node).type;
          if (
            nodeType === "containerDirective" ||
            nodeType === "leafDirective" ||
            nodeType === "textDirective"
          ) {
            return; // Skip type declarations inside directives
          }
          currentParent = (currentParent as any).parent;
        }
      }

      textsToTranslate.push({ node, type: "text", parent });
    }
  });

  // Visit JSX elements to find string attributes
  visit(tree, ["mdxJsxFlowElement", "mdxJsxTextElement"], (node: Node) => {
    const mdxNode = node as { attributes?: MdxJsxAttribute[] };
    if (mdxNode.attributes) {
      mdxNode.attributes.forEach((attr: MdxJsxAttribute) => {
        if (
          attr.type === "mdxJsxAttribute" &&
          attr.value &&
          typeof attr.value === "string"
        ) {
          // Only translate configured attributes
          if (translatableAttrs.includes(attr.name)) {
            textsToTranslate.push({
              node: attr,
              type: "attribute",
              attributeName: attr.name,
            });
          }
        }
      });
    }
  });

  // Visit image nodes to translate alt text
  visit(tree, "image", (node: any) => {
    if (node.alt && node.alt.trim()) {
      textsToTranslate.push({
        node,
        type: "attribute",
        attributeName: "alt",
      });
    }
  });

  // Translate all texts
  const translations = await Promise.all(
    textsToTranslate.map((item) => {
      if (item.type === "text") {
        return translateText(item.node.value, source, target);
      } else if (item.attributeName === "alt" && item.node.type === "image") {
        return translateText(item.node.alt, source, target);
      } else {
        return translateText(item.node.value, source, target);
      }
    }),
  );

  // Apply translations
  textsToTranslate.forEach((item, index) => {
    if (item.type === "text") {
      item.node.value = translations[index];
    } else if (item.attributeName === "alt" && item.node.type === "image") {
      item.node.alt = translations[index];
    } else {
      item.node.value = translations[index];
    }
  });

  // Stringify back to MDX with directive support
  return remark().use(remarkMdx).use(remarkDirective).stringify(tree);
}

// File Translation (updated with generateOutputPath)
async function translateFile(
  filePath: string,
  source: string,
  target: string,
  lock: LockFile,
  config: Config,
) {
  const content = await fs.readFile(filePath, "utf-8");
  const currentHash = crypto.createHash("md5").update(content).digest("hex");

  if (lock.files[filePath] && lock.files[filePath].content === currentHash) {
    console.log(`Skipped (unchanged): ${filePath} -> ${target}`);
    return;
  }

  // Split frontmatter and content
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let translatedContent = "";

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]!;
    const mainContent = frontmatterMatch[2]!;

    // Translate only frontmatter values, not keys
    const translatedFrontmatter = await translateFrontmatter(
      frontmatter,
      source,
      target,
      config,
    );

    // For MDX content, we need to translate JSX attributes too
    const translatedMain = await translateMDXContent(
      mainContent,
      source,
      target,
      config,
    );

    translatedContent = `---\n${translatedFrontmatter}\n---\n${translatedMain}`;
  } else {
    // No frontmatter, translate entire content
    translatedContent = await translateMDXContent(
      content,
      source,
      target,
      config,
    );
  }

  const outputPath = generateOutputPath(filePath, source, target);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, translatedContent);

  lock.files[filePath] = { content: currentHash };
}

// Commands (updated translate for placeholder support)
program.command("init").action(async () => {
  const defaultConfig: Config = {
    projectId: `prj_${crypto.randomBytes(16).toString("hex").slice(0, 20)}`,
    locale: { source: "en", targets: [] },
    files: { mdx: { include: ["content/docs/[locale]/**/*.mdx"] } }, // Sample with placeholder
    translation: {
      frontmatterFields: ["title", "description", "sidebarTitle"],
      jsxAttributes: [
        "title",
        "description",
        "tag",
        "alt",
        "placeholder",
        "label",
      ],
      skipPatterns: [],
    },
  };
  await saveConfig(defaultConfig);
  console.log("Config initialized at openlocale.json");
});

program.command("translate").action(async () => {
  const config = await loadConfig();
  const lock = await loadLock();

  let allFiles: string[] = [];
  for (const format in config.files) {
    const patterns = config.files?.[format]?.include ?? [];
    const sourcePatterns = patterns.map((p) =>
      replaceLocaleInPattern(p, config.locale.source),
    );
    const files = (
      await Promise.all(sourcePatterns.map((pattern) => glob(pattern)))
    ).flat();
    allFiles = [...allFiles, ...files];
  }

  for (const file of allFiles) {
    for (const target of config.locale.targets) {
      await translateFile(file, config.locale.source, target, lock, config);
    }
  }

  await saveLock(lock);
  console.log("Translation complete. Lockfile updated.");
});

program
  .command("locale")
  .command("add")
  .argument("<locales>", "Comma-separated locales")
  .action(async (localesStr) => {
    const config = await loadConfig();
    const newLocales = localesStr.split(",");
    config.locale.targets = [
      ...new Set([...config.locale.targets, ...newLocales]),
    ];
    await saveConfig(config);
  });

// Similar for remove, overrides (stub)

program.parse();
````

## File: .gitignore
````
# dependencies (bun install)
node_modules

# output
out
dist
*.tgz

# code coverage
coverage
*.lcov

# logs
logs
_.log
report.[0-9]_.[0-9]_.[0-9]_.[0-9]_.json

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# caches
.eslintcache
.cache
*.tsbuildinfo

# IntelliJ based IDEs
.idea

# Finder (MacOS) folder config
.DS_Store
````

## File: openlocale.json
````json
{
  "projectId": "prj_53b8dc3dfc3160334916",
  "locale": {
    "source": "en",
    "targets": [
      "es"
    ]
  },
  "files": {
    "mdx": {
      "include": [
        "content/docs/**/*.mdx"
      ]
    }
  },
  "translation": {
    "frontmatterFields": [
      "title",
      "description",
      "sidebarTitle"
    ]
  }
}
````

## File: openlocale.lock
````
version: 1
files:
  content/docs/en/test.mdx:
    content: 2b7c1c210ad85ab529ddf2a3231eadb5
  content/docs/es/test.mdx:
    content: 7651d9deb2365cf2514d8339618d7cc9
  content/docs/en/tools/clarinet/index.mdx:
    content: 90d8c7441c095b156d922047f24fce00
````

## File: package.json
````json
{
  "name": "openlocale",
  "module": "index.ts",
  "type": "module",
  "private": true,
  "devDependencies": {
    "@types/bun": "latest",
    "@types/glob": "^9.0.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^24.0.14"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^1.2.12",
    "ai": "^4.3.19",
    "commander": "^14.0.0",
    "glob": "^11.0.3",
    "js-yaml": "^4.1.0",
    "remark": "^15.0.1",
    "remark-directive": "^4.0.0",
    "remark-frontmatter": "^5.0.0",
    "remark-mdx": "^3.1.0",
    "remark-parse": "^11.0.0",
    "remark-stringify": "^11.0.0",
    "zod": "^4.0.5"
  }
}
````

## File: README.md
````markdown
Below is a comprehensive **Product Requirements Document (PRD) and Implementation Plan** for building "OpenLocale" — an open-source, Languine-like localization tool. OpenLocale will provide automated, AI-powered translations for files (focusing on documentation like Markdown/HTML for your use case of 400+ pages), with support for multiple languages, format preservation, caching, and overrides. It will be 90% cheaper by leveraging self-hosted AI calls (e.g., via Anthropic) instead of a SaaS subscription, with costs primarily from AI API usage (~$0.01-0.05 per page translation, scaling to ~$20-50 one-time for 400 pages × 2-3 languages).

To keep this structured and actionable, I've broken it into **3 distinct parts** (CLI, SDK, API), as you suggested. Each part functions as a mini-PRD with:
- **High-Level Requirements**: What it needs to do (MVP scope).
- **Step-by-Step Implementation Instructions**: Detailed, code-inclusive guide to build a working prototype. These are designed to be followed sequentially in a Bun/TypeScript project.
- **Assumptions and MVP Focus**: For simplicity, MVP targets Markdown docs (using Remark for parsing to extract/translat text while preserving structure). Expandable later to other formats (e.g., JSON, HTML via additional parsers like Rehype). We'll use a `openlocale.json` config file (mirroring Languine's `languine.json`), with fields like `{ "sourceLocale": "en", "targetLocales": ["es", "fr"], "files": ["docs/**/*.md"], "apiKey": "your_anthropic_key" }`.
- **Tech Stack Integration**:
  - **Bun**: For fast runtime, CLI scripting, and potential server (for API).
  - **Remark**: For parsing Markdown AST (Abstract Syntax Tree) to translate text nodes without breaking formatting.
  - **AI/SDK (Vercel)**: For AI integration with Anthropic (Claude) as the default model for context-aware translations. We'll use `generateText` for simple translations, `tool` if needed for advanced (e.g., structured output), and Zod for schema validation (e.g., ensuring translation outputs match expected formats).
  - **Other Libs**: Glob for file matching, Node's fs for I/O, a simple cache (JSON file-based).

**Project Setup (Common to All Parts)**:
- Create a new directory: `mkdir openlocale && cd openlocale`.
- Initialize Bun project: `bun init -y`.
- Install dependencies: `bun add remark remark-parse remark-stringify glob zod ai @ai-sdk/anthropic`.
- Add types: `bun add -D @types/node @types/glob`.
- For AI: Set `ANTHROPIC_API_KEY` in `.env` (load via `process.env`).

By the end of Part 1 (CLI), you'll have a working MVP prototype: Run CLI commands to init config, translate files, and generate localized versions (e.g., duplicate `docs/en/page.md` to `docs/es/page.md` with translated content).

---

### Part 1: CLI Implementation Plan

#### High-Level Requirements (MVP)
- A command-line interface (CLI) binary named `openlocale` (runnable via `bun run cli.ts` or globally via symlinks).
- Commands mirroring Languine: `init` (create config), `translate` (scan files, translate to targets, save outputs), `locale add/remove` (update config), `overrides pull` (stub for future dashboard integration; MVP uses local JSON overrides).
- Config: `openlocale.json` with source/target locales, file globs, API key.
- Translation Logic: Parse files (e.g., MD via Remark), extract translatable text, call AI to translate (with context like "preserve Markdown format and brand tone"), reassemble, cache results (file-hash based).
- MVP Scope: Translate Markdown docs to 2-3 languages; handle 400+ files via batching; no auth (local only); basic caching.

#### Step-by-Step Implementation Instructions
1. **Create CLI Entry File**:
   - Create `src/cli.ts`.
   - Parse args using Bun's built-in (or add `commander` if needed: `bun add commander`).
   - Code:
     ```typescript
     import { Command } from 'commander';
     import fs from 'fs/promises';
     import path from 'path';
     import glob from 'glob';
     import { remark } from 'remark';
     import { visit } from 'unist-util-visit'; // Add: bun add unist-util-visit
     import { generateText } from 'ai';
     import { createAnthropic } from '@ai-sdk/anthropic';
     import { z } from 'zod';

     const program = new Command();
     const configPath = path.resolve('openlocale.json');
     const cachePath = path.resolve('.openlocale-cache.json');
     const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

     // Config Schema (Zod for validation)
     const ConfigSchema = z.object({
       sourceLocale: z.string().default('en'),
       targetLocales: z.array(z.string()).default([]),
       files: z.array(z.string()).default([]),
       apiKey: z.string().optional(), // For overrides or future
     });
     type Config = z.infer<typeof ConfigSchema>;

     async function loadConfig(): Promise<Config> {
       try {
         const data = await fs.readFile(configPath, 'utf-8');
         return ConfigSchema.parse(JSON.parse(data));
       } catch {
         throw new Error('Config not found. Run "openlocale init" first.');
       }
     }

     async function saveConfig(config: Config) {
       await fs.writeFile(configPath, JSON.stringify(config, null, 2));
     }

     // Cache Functions
     async function loadCache(): Promise<Record<string, Record<string, string>>> {
       try {
         const data = await fs.readFile(cachePath, 'utf-8');
         return JSON.parse(data);
       } catch {
         return {};
       }
     }

     async function saveCache(cache: Record<string, Record<string, string>>) {
       await fs.writeFile(cachePath, JSON.stringify(cache));
     }

     // Translation Function (using AI/SDK and Zod for output validation)
     async function translateText(text: string, source: string, target: string): Promise<string> {
       const { text: translated } = await generateText({
         model: anthropic('claude-3-5-sonnet-20240620'),
         prompt: `Translate this text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links). Text: ${text}`,
       });
       // Validate with Zod (simple string for MVP)
       return z.string().parse(translated);
     }

     // File Translation with Remark
     async function translateFile(filePath: string, source: string, target: string, cache: Record<string, Record<string, string>>) {
       const content = await fs.readFile(filePath, 'utf-8');
       const fileHash = content; // Simple hash for MVP (use crypto later)
       const cacheKey = `${filePath}-${target}`;
       if (cache[cacheKey] && cache[cacheKey] === fileHash) {
         console.log(`Cached: ${filePath} -> ${target}`);
         return; // Assume output already exists; MVP skips re-write
       }

       const tree = remark().parse(content);
       visit(tree, 'text', (node) => {
         // Translate text nodes asynchronously? For MVP, collect and batch
         // But simple: Replace in-place (note: async visit not default, so collect first)
       });

       // Collect translatable texts
       const texts: string[] = [];
       visit(tree, 'text', (node) => texts.push(node.value));

       // Batch translate (for efficiency)
       const translatedTexts = await Promise.all(texts.map(t => translateText(t, source, target)));
       let index = 0;
       visit(tree, 'text', (node) => { node.value = translatedTexts[index++]; });

       const translatedContent = remark().stringify(tree);
       const outputPath = filePath.replace(`/${source}/`, `/${target}/`); // Assume structure like docs/en/page.md
       await fs.mkdir(path.dirname(outputPath), { recursive: true });
       await fs.writeFile(outputPath, translatedContent);

       cache[cacheKey] = fileHash;
     }

     // Commands
     program.command('init').action(async () => {
       const defaultConfig: Config = { sourceLocale: 'en', targetLocales: [], files: [] };
       await saveConfig(defaultConfig);
       console.log('Config initialized at openlocale.json');
     });

     program.command('translate').action(async () => {
       const config = await loadConfig();
       const cache = await loadCache();
       const files = (await Promise.all(config.files.map(pattern => glob(pattern)))).flat();
       for (const file of files) {
         for (const target of config.targetLocales) {
           await translateFile(file, config.sourceLocale, target, cache);
         }
       }
       await saveCache(cache);
       console.log('Translation complete');
     });

     program.command('locale').command('add').argument('<locales>', 'Comma-separated locales').action(async (localesStr) => {
       const config = await loadConfig();
       const newLocales = localesStr.split(',');
       config.targetLocales = [...new Set([...config.targetLocales, ...newLocales])];
       await saveConfig(config);
     });

     // Similar for remove, overrides (stub: console.log for MVP)

     program.parse();
     ```

2. **Run and Test MVP**:
   - Run `bun src/cli.ts init` to create `openlocale.json`.
   - Edit `openlocale.json`: Add `"targetLocales": ["es"]`, `"files": ["docs/**/*.md"]`.
   - Create sample file: `mkdir -p docs/en && echo "# Hello\nWorld" > docs/en/test.md`.
   - Run `bun src/cli.ts translate` — it should create `docs/es/test.md` with translated content (e.g., "# Hola\nMundo").
   - For 400+ files: It batches automatically; add parallelism with `Promise.all` if slow.

3. **Polish for Prototype**:
   - Add error handling (e.g., Zod validation errors).
   - Make global: `bun link` or package as bin in package.json.
   - Test with caching: Change file, re-run (should re-translate only changed).

This gives a working CLI MVP. Expand to more commands/formats later.

---

### Part 2: SDK Implementation Plan

#### High-Level Requirements (MVP)
- An NPM-publishable package `@openlocale/sdk` with TypeScript support.
- Core class: `OpenLocale` initialized with API key (for AI).
- Methods: `translate({ sourceText, sourceLocale, targetLocale, format })` — mirrors Languine, with caching.
- Supports 'md' format via Remark; returns translated text.
- Zod for input/output validation.
- MVP Scope: Programmatic translation for single strings/files; integrate into apps/scripts for batching 400+ pages.

#### Step-by-Step Implementation Instructions
1. **Setup Package**:
   - Create `sdk` subdir: `mkdir sdk && cd sdk && bun init -y`.
   - Update package.json: `"name": "@openlocale/sdk", "main": "dist/index.js", "types": "dist/index.d.ts"`.
   - Install deps: Same as CLI (remark, ai, etc.).
   - Build: Add `tsc` or Bun build script.

2. **Implement Core SDK**:
   - Create `src/index.ts`.
   - Code:
     ```typescript
     import { generateText } from 'ai';
     import { createAnthropic } from '@ai-sdk/anthropic';
     import { z } from 'zod';
     import { remark } from 'remark';
     import { visit } from 'unist-util-visit';

     const TranslateSchema = z.object({
       sourceText: z.string(),
       sourceLocale: z.string(),
       targetLocale: z.string(),
       format: z.enum(['md', 'string']).default('string'),
       cache: z.boolean().default(true),
     });

     export class OpenLocale {
       private anthropic;
       private cache: Map<string, string> = new Map(); // In-memory for MVP

       constructor({ apiKey }: { apiKey: string }) {
         this.anthropic = createAnthropic({ apiKey });
       }

       async translate(params: z.infer<typeof TranslateSchema>) {
         const validated = TranslateSchema.parse(params);
         const cacheKey = `${validated.sourceText}-${validated.targetLocale}`;
         if (validated.cache && this.cache.has(cacheKey)) {
           return { translatedText: this.cache.get(cacheKey)!, cached: true };
         }

         let translated: string;
         if (validated.format === 'md') {
           const tree = remark().parse(validated.sourceText);
           const texts: string[] = [];
           visit(tree, 'text', (node) => texts.push(node.value));
           const translatedTexts = await Promise.all(texts.map(t => this.translateText(t, validated.sourceLocale, validated.targetLocale)));
           let index = 0;
           visit(tree, 'text', (node) => { node.value = translatedTexts[index++]; });
           translated = remark().stringify(tree);
         } else {
           translated = await this.translateText(validated.sourceText, validated.sourceLocale, validated.targetLocale);
         }

         this.cache.set(cacheKey, translated);
         return { translatedText: translated, cached: false };
       }

       private async translateText(text: string, source: string, target: string) {
         const { text: result } = await generateText({
           model: this.anthropic('claude-3-5-sonnet-20240620'),
           prompt: `Translate from ${source} to ${target}, preserve tone: ${text}`,
         });
         return z.string().parse(result);
       }
     }
     ```

3. **Test MVP**:
   - Build: `bun build src/index.ts --outdir dist`.
   - In a test script: `import { OpenLocale } from './dist/index'; const ol = new OpenLocale({ apiKey: process.env.ANTHROPIC_API_KEY }); const res = await ol.translate({ sourceText: '# Hello', format: 'md', sourceLocale: 'en', targetLocale: 'es' }); console.log(res);`.
   - For batch: Loop over files, call `translate` for each.

This SDK can be used in scripts for custom workflows.

---

### Part 3: API Implementation Plan

#### High-Level Requirements (MVP)
- A REST API server (using Bun's built-in HTTP) at e.g., `http://localhost:3000/api/translate`.
- Endpoint: POST /api/translate with body mirroring SDK (sourceText, locales, format).
- Auth: Simple API key header (validate with Zod).
- Returns JSON { success, translatedText, cached }.
- MVP Scope: Server-side translation for remote calls; no database, in-memory cache; integrate Remark/AI as above.

#### Step-by-Step Implementation Instructions
1. **Setup Server**:
   - Create `src/api.ts`.
   - Use Bun.serve for HTTP.

2. **Implement API**:
   - Code (reuse SDK logic where possible; for MVP, embed):
     ```typescript
     import { serve } from 'bun'; // Bun built-in
     import { z } from 'zod';
     import { OpenLocale } from '../sdk/dist/index'; // Reuse SDK if built, or inline

     const ApiKeySchema = z.string().startsWith('org_'); // Mirror Languine

     const server = serve({
       port: 3000,
       async fetch(req) {
         if (req.method !== 'POST' || new URL(req.url).pathname !== '/api/translate') {
           return new Response('Not Found', { status: 404 });
         }

         const apiKey = req.headers.get('x-api-key');
         try {
           ApiKeySchema.parse(apiKey);
         } catch {
           return new Response(JSON.stringify({ success: false, error: 'Invalid API key' }), { status: 401 });
         }

         const body = await req.json();
         // Validate body with TranslateSchema from SDK
         // Assume OpenLocale instance
         const ol = new OpenLocale({ apiKey: process.env.ANTHROPIC_API_KEY }); // Or pass client key
         const result = await ol.translate(body);

         return new Response(JSON.stringify({ success: true, ...result }), { status: 200 });
       },
     });

     console.log('API running on http://localhost:3000');
     ```

3. **Run and Test MVP**:
   - Run `bun src/api.ts`.
   - Test with curl: `curl -X POST http://localhost:3000/api/translate -H "x-api-key: org_test" -H "Content-Type: application/json" -d '{"sourceText": "Hello", "sourceLocale": "en", "targetLocale": "es", "format": "string"}'`.
   - For docs: Send full MD as sourceText.

This completes the API prototype. For production, add rate limiting, persistent cache (e.g., Redis).

---

**Next Steps for Full Product**:
- Integrate all parts (e.g., CLI uses SDK internally).
- Add more formats (e.g., HTML via Rehype).
- GitHub repo for open-sourcing.
- Cost Validation: Use code_execution tool if needed to estimate AI tokens.
- If issues, refine with tools (e.g., web_search for AI/SDK updates). 

This plan gets you to a working MVP quickly—let me know if you need code tweaks!
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    // Environment setup & latest features
    "lib": [
      "ESNext"
    ],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    // Some stricter flags (disabled by default)
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
````
