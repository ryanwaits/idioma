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
  ai/
    index.ts
    translate.ts
  cli/
    commands.ts
    index.ts
  core/
    index.ts
    process-files.ts
    translate-file.ts
  parsers/
    frontmatter.ts
    index.ts
    mdx.ts
    types.ts
  utils/
    config.ts
    crypto.ts
    index.ts
    lockfile.ts
    paths.ts
  cli.ts
.gitignore
.repomixignore
ARCHITECTURE.md
openlocale.json
openlocale.lock
package.json
plan.md
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
      "Bash(bun:*)",
      "Bash(mkdir:*)",
      "Bash(mv:*)"
    ],
    "deny": []
  }
}
````

## File: src/ai/index.ts
````typescript
export * from './translate';
````

## File: src/ai/translate.ts
````typescript
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

// AI Provider factory - returns configured AI client
export function createAiClient(provider: string, apiKey?: string): any {
  switch (provider) {
    case 'anthropic':
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
      }
      return createAnthropic({ apiKey: anthropicKey });
    
    // Future providers can be added here
    // case 'openai':
    //   const openaiKey = apiKey || process.env.OPENAI_API_KEY;
    //   return createOpenAI({ apiKey: openaiKey });
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Translation function with dependency injection for AI client
export async function translateText(
  text: string, 
  source: string, 
  target: string, 
  client: any,
  model?: string
): Promise<string> {
  // Preserve leading/trailing whitespace
  const leadingWhitespace = text.match(/^\s*/)?.[0] || '';
  const trailingWhitespace = text.match(/\s*$/)?.[0] || '';
  const trimmedText = text.trim();
  
  // Skip empty text
  if (!trimmedText) {
    return text;
  }
  
  const { text: translated } = await generateText({
    model: client(model || 'claude-3-5-sonnet-20240620'),
    system: 'You are a translation assistant. You MUST return ONLY the translated text without any additional commentary, explanations, or phrases like "Here is the translation". Do not add any text before or after the translation.',
    prompt: `Translate the following text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links, code blocks).

Text to translate:
${trimmedText}`,
  });
  
  // Re-apply the original whitespace
  return leadingWhitespace + translated.trim() + trailingWhitespace;
}

// Batch translation helper for performance
export async function translateBatch(
  texts: string[],
  source: string,
  target: string,
  client: any,
  model?: string
): Promise<string[]> {
  // Process translations in parallel for better performance
  return Promise.all(
    texts.map(text => translateText(text, source, target, client, model))
  );
}
````

## File: src/cli/commands.ts
````typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Config, loadConfig, saveConfig, loadLock, saveLock } from '../utils';
import { processFiles } from '../core';

// Init command - create config file
export async function initCommand(): Promise<void> {
  const configPath = path.resolve('openlocale.json');
  
  try {
    await fs.access(configPath);
    console.log('Configuration file already exists.');
  } catch {
    const defaultConfig: Config = {
      projectId: `prj_${crypto.randomBytes(16).toString('hex').slice(0, 20)}`,
      locale: {
        source: 'en',
        targets: [],
      },
      files: {
        mdx: {
          include: ['content/docs/**/*.mdx'],
        },
      },
      translation: {
        frontmatterFields: ['title', 'description', 'sidebarTitle'],
        jsxAttributes: ['title', 'description', 'tag', 'alt', 'placeholder', 'label'],
        provider: 'anthropic',
        rules: {
          patternsToSkip: ['^type:\\s*\\w+$'],
        },
      },
    };
    
    await saveConfig(defaultConfig);
    console.log('✓ Created openlocale.json');
    console.log('\nNext steps:');
    console.log('1. Add target locales: openlocale locale add <locale>');
    console.log('2. Configure your file patterns in openlocale.json');
    console.log('3. Run translation: openlocale translate');
  }
}

// Translate command - process all files
export async function translateCommand(): Promise<void> {
  try {
    // Load configuration
    const config = await loadConfig();
    const lock = await loadLock();
    
    // Process all files
    console.log('Starting translation...');
    const updatedLock = await processFiles(config, lock);
    
    // Save updated lock file
    await saveLock(updatedLock);
    console.log('Translation complete. Lockfile updated.');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

// Locale add command
export async function localeAddCommand(locale: string): Promise<void> {
  try {
    const config = await loadConfig();
    
    if (config.locale.targets.includes(locale)) {
      console.log(`Locale '${locale}' already exists.`);
      return;
    }
    
    config.locale.targets.push(locale);
    await saveConfig(config);
    console.log(`✓ Added locale: ${locale}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

// Locale remove command
export async function localeRemoveCommand(locale: string): Promise<void> {
  try {
    const config = await loadConfig();
    
    const index = config.locale.targets.indexOf(locale);
    if (index === -1) {
      console.log(`Locale '${locale}' not found.`);
      return;
    }
    
    config.locale.targets.splice(index, 1);
    await saveConfig(config);
    console.log(`✓ Removed locale: ${locale}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

// Locale list command
export async function localeListCommand(): Promise<void> {
  try {
    const config = await loadConfig();
    
    console.log('Source locale:', config.locale.source);
    console.log('Target locales:', config.locale.targets.length ? config.locale.targets.join(', ') : 'None');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}
````

## File: src/cli/index.ts
````typescript
#!/usr/bin/env bun
import { Command } from 'commander';
import { 
  initCommand, 
  translateCommand, 
  localeAddCommand, 
  localeRemoveCommand, 
  localeListCommand 
} from './commands';

const program = new Command();

program
  .name('openlocale')
  .description('AI-powered internationalization for MDX documentation')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize OpenLocale configuration')
  .action(initCommand);

// Translate command
program
  .command('translate')
  .description('Translate files based on configuration')
  .action(translateCommand);

// Locale commands
const localeCmd = program
  .command('locale')
  .description('Manage target locales');

localeCmd
  .command('add <locale>')
  .description('Add a target locale')
  .action(localeAddCommand);

localeCmd
  .command('remove <locale>')
  .description('Remove a target locale')
  .action(localeRemoveCommand);

localeCmd
  .command('list')
  .description('List all configured locales')
  .action(localeListCommand);

// Parse command line arguments
program.parse();
````

## File: src/core/index.ts
````typescript
export * from './translate-file';
export * from './process-files';
````

## File: src/core/process-files.ts
````typescript
import { glob } from 'glob';
import { Config, LockFile, replaceLocaleInPattern } from '../utils';
import { translateFile } from './translate-file';

export async function processFiles(
  config: Config,
  lock: LockFile
): Promise<LockFile> {
  const sourceLocale = config.locale.source;
  const targetLocales = config.locale.targets;
  
  if (targetLocales.length === 0) {
    throw new Error('No target locales configured. Run "openlocale locale add <locale>" first.');
  }
  
  // Process each file type defined in config
  for (const [fileType, fileConfig] of Object.entries(config.files)) {
    for (const pattern of fileConfig.include) {
      // Replace [locale] placeholder with source locale to find actual files
      const sourcePattern = pattern.replace(/\[locale\]/g, sourceLocale);
      
      // Get all files matching the source pattern
      const files = await glob(sourcePattern);
      
      // Process each file for each target locale
      for (const file of files) {
        for (const targetLocale of targetLocales) {
          try {
            await translateFile(file, sourceLocale, targetLocale, lock, config);
          } catch (error) {
            console.error(`Error translating ${file} to ${targetLocale}:`, error);
            // Continue with other files
          }
        }
      }
    }
  }
  
  return lock;
}

export async function getFilesToTranslate(
  config: Config,
  patterns?: string[]
): Promise<string[]> {
  const filesToProcess: string[] = [];
  
  if (patterns && patterns.length > 0) {
    // Use provided patterns
    for (const pattern of patterns) {
      const files = await glob(pattern);
      filesToProcess.push(...files);
    }
  } else {
    // Use patterns from config
    for (const [fileType, fileConfig] of Object.entries(config.files)) {
      for (const pattern of fileConfig.include) {
        const files = await glob(pattern);
        filesToProcess.push(...files);
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(filesToProcess)];
}
````

## File: src/core/translate-file.ts
````typescript
import fs from 'fs/promises';
import path from 'path';
import { Config, LockFile, generateHash, generateOutputPath } from '../utils';
import { createAiClient } from '../ai';
import { findStrategy, translateFrontmatter } from '../parsers';

export async function translateFile(
  filePath: string,
  source: string,
  target: string,
  lock: LockFile,
  config: Config
): Promise<void> {
  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');
  const currentHash = generateHash(content);

  // Check if file has changed
  if (lock.files[filePath] && lock.files[filePath].content === currentHash) {
    console.log(`Skipped (unchanged): ${filePath} -> ${target}`);
    return;
  }

  // Create AI client based on config
  const provider = config.translation?.provider || 'anthropic';
  const aiClient = createAiClient(provider);

  let translatedContent = '';

  // Check if content has frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const mainContent = frontmatterMatch[2];
    
    // Translate frontmatter
    const translatedFrontmatter = await translateFrontmatter(
      frontmatter,
      source,
      target,
      config,
      aiClient
    );
    
    // Find appropriate strategy for the file type
    const strategy = findStrategy(filePath);
    if (!strategy) {
      throw new Error(`No translation strategy found for file: ${filePath}`);
    }
    
    // Translate main content using strategy
    const translatedMain = await strategy.translate(
      mainContent,
      source,
      target,
      config,
      aiClient
    );
    
    translatedContent = `---\n${translatedFrontmatter}\n---\n${translatedMain}`;
  } else {
    // No frontmatter, translate entire content
    const strategy = findStrategy(filePath);
    if (!strategy) {
      throw new Error(`No translation strategy found for file: ${filePath}`);
    }
    
    translatedContent = await strategy.translate(
      content,
      source,
      target,
      config,
      aiClient
    );
  }

  // Generate output path and write translated content
  const outputPath = generateOutputPath(filePath, source, target);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, translatedContent);

  // Update lock file
  lock.files[filePath] = { content: currentHash };
  
  console.log(`Translated: ${filePath} -> ${outputPath}`);
}
````

## File: src/parsers/frontmatter.ts
````typescript
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
````

## File: src/parsers/index.ts
````typescript
import { TranslationStrategy } from './types';
import { MDXStrategy } from './mdx';

// Export all parser types and utilities
export * from './types';
export * from './frontmatter';
export * from './mdx';

// Strategy registry - add new strategies here
export const strategies: TranslationStrategy[] = [
  new MDXStrategy(),
  // Future strategies can be added here:
  // new JSONStrategy(),
  // new YAMLStrategy(),
  // new HTMLStrategy(),
];

// Helper to find appropriate strategy for a file
export function findStrategy(filePath: string): TranslationStrategy | undefined {
  return strategies.find(strategy => strategy.canHandle(filePath));
}
````

## File: src/parsers/types.ts
````typescript
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
````

## File: src/utils/crypto.ts
````typescript
import crypto from 'crypto';

export function generateHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}
````

## File: src/utils/index.ts
````typescript
export * from './config';
export * from './lockfile';
export * from './paths';
export * from './crypto';
````

## File: src/utils/lockfile.ts
````typescript
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export interface LockFile {
  version: number;
  files: Record<string, { content: string }>;
}

const lockPath = path.resolve('openlocale.lock');

export async function loadLock(): Promise<LockFile> {
  try {
    const data = await fs.readFile(lockPath, 'utf-8');
    return yaml.load(data) as LockFile;
  } catch {
    return { version: 1, files: {} };
  }
}

export async function saveLock(lock: LockFile): Promise<void> {
  const yamlStr = yaml.dump(lock);
  await fs.writeFile(lockPath, yamlStr);
}
````

## File: src/utils/paths.ts
````typescript
import path from 'path';

export function replaceLocaleInPattern(pattern: string, oldLocale: string, newLocale: string): string {
  // Replace [locale] placeholder
  if (pattern.includes('[locale]')) {
    return pattern.replace(/\[locale\]/g, newLocale);
  }
  
  // Replace /oldLocale/ with /newLocale/ in path
  const regex = new RegExp(`/${oldLocale}/`, 'g');
  return pattern.replace(regex, `/${newLocale}/`);
}

export function generateOutputPath(sourcePath: string, sourceLocale: string, targetLocale: string): string {
  // Check if the source path has [locale] placeholder
  if (sourcePath.includes('[locale]')) {
    return sourcePath.replace(/\[locale\]/g, targetLocale);
  }

  // If source and target are the same, return the original path
  if (sourceLocale === targetLocale) {
    return sourcePath;
  }

  // Replace sourceLocale with targetLocale in the path
  const regex = new RegExp(`/${sourceLocale}/`, 'g');
  let outputPath = sourcePath.replace(regex, `/${targetLocale}/`);

  // If no replacement happened, the source locale wasn't in the path
  // In this case, we should not add a locale directory
  if (outputPath === sourcePath) {
    // For files without locale in path, we shouldn't translate to the same directory
    console.warn(`Warning: File ${sourcePath} doesn't contain source locale '${sourceLocale}' in its path`);
  }

  return outputPath;
}
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

## File: .repomixignore
````
node_modules
content/docs
````

## File: ARCHITECTURE.md
````markdown
# OpenLocale Architecture

## Overview

OpenLocale follows a modular architecture with clear separation of concerns. The codebase is organized into distinct modules that handle specific responsibilities.

## Directory Structure

```
src/
├── cli/           # Command-line interface
│   ├── index.ts   # CLI entry point and command definitions
│   └── commands.ts # Command implementations
├── core/          # Core business logic
│   ├── translate-file.ts  # Single file translation orchestration
│   └── process-files.ts   # Batch file processing
├── parsers/       # File format parsers (Strategy Pattern)
│   ├── types.ts   # TranslationStrategy interface
│   ├── mdx.ts     # MDX/Markdown strategy implementation
│   └── frontmatter.ts # Frontmatter translation logic
├── ai/            # AI provider integration (Factory Pattern)
│   └── translate.ts # Translation service with provider factory
└── utils/         # Shared utilities
    ├── config.ts  # Configuration management
    ├── lockfile.ts # Lock file operations
    ├── paths.ts   # Path manipulation utilities
    └── crypto.ts  # Hashing utilities
```

## Design Patterns

### Strategy Pattern (Parsers)
- **Purpose**: Handle different file formats with specific translation logic
- **Implementation**: `TranslationStrategy` interface with `canHandle()` and `translate()` methods
- **Benefits**: Easy to add new file formats without modifying existing code

### Factory Pattern (AI Providers)
- **Purpose**: Create AI clients based on configuration
- **Implementation**: `createAiClient()` function that returns provider-specific clients
- **Benefits**: Switch between AI providers (Anthropic, OpenAI, etc.) via configuration

## Key Features

### Configurable Translation Rules
- Skip patterns can be defined in `openlocale.json`
- Rules are applied during parsing to exclude specific content
- Default pattern: `^type:\\s*\\w+$` (for backward compatibility)

### Extensibility Points
1. **New File Formats**: Implement `TranslationStrategy` and register in `parsers/index.ts`
2. **New AI Providers**: Add case in `createAiClient()` factory
3. **Custom Rules**: Extend `translation.rules` in config schema

## Configuration Schema

```json
{
  "translation": {
    "provider": "anthropic",  // AI provider selection
    "rules": {
      "patternsToSkip": ["^type:\\s*\\w+$"]  // Regex patterns to skip
    },
    "frontmatterFields": ["title", "description"],
    "jsxAttributes": ["alt", "title", "placeholder"]
  }
}
```

## Data Flow

1. **CLI** receives command → calls appropriate command function
2. **Command** loads config/lockfile → calls core functions
3. **Core** orchestrates translation → finds appropriate strategy
4. **Strategy** parses content → applies rules → collects translatable text
5. **AI Service** translates text → preserves formatting
6. **Core** writes output → updates lockfile

## Adding New Features

### Adding a New File Format
1. Create new strategy in `src/parsers/[format].ts`
2. Implement `TranslationStrategy` interface
3. Register in `src/parsers/index.ts` strategies array

### Adding a New AI Provider
1. Install provider SDK
2. Add case in `createAiClient()` in `src/ai/translate.ts`
3. Add provider config option documentation

### Adding New Translation Rules
1. Extend `ConfigSchema` in `src/utils/config.ts`
2. Implement rule logic in appropriate strategy
3. Document new rule in README
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

## File: plan.md
````markdown
# OpenLocale Refactor PRD and Implementation Plan

Below is a comprehensive **Product Requirements Document (PRD) and Implementation Plan** for refactoring the OpenLocale library based on your feedback. This builds directly on the context from `openlocale.md` (the merged codebase), focusing on splitting the monolithic `src/cli.ts` into the proposed modular structure, while incorporating the **Strategy Pattern** for file translators/parsers (to handle extensibility for formats like MDX) and a **light Factory Pattern** for AI clients (to enable provider switching, e.g., Anthropic to OpenAI).

The goal is to make the library more production-ready: modular, testable, extensible (e.g., users can add custom strategies via config or extensions), and maintainable as an open-source tool. We'll prioritize backward compatibility (e.g., existing commands and config still work) and incremental migration to minimize breakage.

This PRD is structured for clarity:
- **Overview and Assumptions**
- **High-Level Requirements**
- **Design Patterns in Detail**
- **Implementation Plan** (with phased task lists, including specific code changes)
- **Testing Recommendations**
- **Timeline and MVP Scope**
- **Risks and Mitigations**

By following the task lists sequentially, you'll end up with a refactored codebase. Each task includes approximate effort (e.g., "30-60 min") and pseudocode/diffs where helpful. Assume you're working in the existing project (with Bun/TypeScript setup).

---

## Overview and Assumptions

**Overview**: This refactor addresses the monolithic nature of `src/cli.ts` by modularizing logic into separate files/directories. We'll implement the Strategy Pattern for translation strategies (e.g., MDX-specific parsing with configurable directive filtering) and a Factory for AI clients. This enables features like user-configurable rules (e.g., skipping directive-specific content without hardcoding "type:") and easy provider switching (e.g., via config). The end result: A cleaner CLI that orchestrates modules, ready for expansion (e.g., SDK/API as in README.md).

**Assumptions**:
- MVP Focus: Refactor existing MDX support; add hooks for future formats (e.g., JSON).
- Config Extensions: We'll extend `ConfigSchema` slightly (e.g., add `translation.provider` and `translation.rules` for flexibility).
- Dependencies: No new installs needed (reuse existing like `remark`, `ai`, `zod`).
- Backward Compatibility: Existing `openlocale.json`, commands, and lockfile remain functional.
- Scope Exclusions: No new features (e.g., no OpenAI support yet—just factory hooks); no full unit tests (but recommendations included).

**Success Criteria**: After refactor, running `bun src/cli.ts translate` works identically, but code is split, testable, and extensible (e.g., add a rule to skip directives via config).

---

## High-Level Requirements (MVP)

- **Modularity**: Split `src/cli.ts` into the proposed structure (ai/, parsers/, utils/, core/, cli/).
- **Extensibility**:
  - Users can configure rules for skipping content (e.g., patterns in directives) via `openlocale.json`.
  - Support strategy-based translation (e.g., MDX strategy handles Remark parsing, JSX, directives).
  - AI provider switching via factory (e.g., config `"translation.provider": "anthropic"` defaults; hooks for others).
- **Configurability**: Extend config with `translation.rules` (e.g., `{ patternsToSkip: ["^type:\\s*"] }`) to generalize directive filtering.
- **Performance/Maintainability**: Keep async operations (e.g., batch translations); add basic error handling.
- **Open-Source Readiness**: No hardcodes (e.g., replace "type:" check with rule-based); document in README.md updates.

---

## Design Patterns in Detail

### Strategy Pattern (for File Translators/Parsers)
- **Purpose**: Allows different translation "strategies" per file type (e.g., MDXStrategy for Markdown/MDX files).
- **Interface**: `interface TranslationStrategy { canHandle(filePath: string): boolean; translate(content: string, source: string, target: string, config: Config): Promise<string>; }`
- **Implementation**: Registry in `core/translateFile.ts` (e.g., array of strategies; pick first that `canHandle` matches).
- **Pros (as discussed)**: Extensible (add JSONStrategy later); testable; aligns with open-source (users can register custom strategies).
- **Cons**: Slight overhead (interface + registry); mitigated by keeping it lightweight.
- **Usage Example**: For MDX, the strategy will handle Remark parsing, collect translatable texts/attributes, apply rules (e.g., skip nodes matching config patterns), batch AI calls, and reassemble.

### Light Factory Pattern (for AI Clients)
- **Purpose**: Creates AI clients based on config (e.g., return Anthropic instance; hooks for others).
- **Implementation**: Simple function `createAiClient(provider: string, apiKey: string)` in `ai/translate.ts` that switches on provider.
- **Pros**: Decouples AI logic (easy swap/mocking); configurable via `config.translation.provider`.
- **Cons**: Minimal (just a switch statement for MVP); expand to full class factory if needed.
- **Usage Example**: `const client = createAiClient(config.translation.provider || 'anthropic', process.env.ANTHROPIC_API_KEY);` then use in `translateText`.

---

## Implementation Plan

The plan is phased by directory/module for incremental development. Each phase has a **task list** with specific steps. Total estimated effort: 4-6 hours (spread over sessions). Start with utils/ (least dependent), end with cli/.

### Phase 1: Utils (Config, Lockfile, Paths, Crypto) – Foundation Layer
**Goal**: Move I/O and helper utils; extend config schema.
**Task List**:
1. **Create src/utils/config.ts (30 min)**:
   - Export `ConfigSchema` (extend with `translation.provider: z.string().default('anthropic')` and `translation.rules: z.object({ patternsToSkip: z.array(z.string()).default([]) }).optional()`).
   - Move `loadConfig` and `saveConfig` functions.
   - Add default rules in schema (e.g., `patternsToSkip.default(['^type:\\s*\\w+$'])` for backward compat).
   - Pseudocode Diff:
     ```typescript
     // From cli.ts -> utils/config.ts
     export const ConfigSchema = z.object({
       // ... existing
       translation: z.object({
         // ... existing
         provider: z.string().default('anthropic'),
         rules: z.object({
           patternsToSkip: z.array(z.string()).default(['^type:\\s*\\w+$']),
         }).optional(),
       }).optional(),
     });
     // Move loadConfig, saveConfig as-is
     ```

2. **Create src/utils/lockfile.ts (20 min)**:
   - Move `LockFile` interface, `loadLock`, `saveLock`.
   - No changes needed.

3. **Create src/utils/paths.ts (15 min)**:
   - Move `replaceLocaleInPattern` and `generateOutputPath`.
   - No changes.

4. **Create src/utils/crypto.ts (10 min)**:
   - Export `generateHash(content: string): string` (move MD5 hash logic from `translateFile`).

### Phase 2: AI (Translation Logic) – Integrate Factory
**Goal**: Isolate AI calls with factory for provider switching.
**Task List**:
1. **Create src/ai/translate.ts (45 min)**:
   - Move `translateText` function.
   - Add factory: `export function createAiClient(provider: string, apiKey: string) { if (provider === 'anthropic') return createAnthropic({ apiKey }); /* else throw or fallback */ }`
   - Update `translateText` to accept `client` param (dependency injection): `async function translateText(text: string, source: string, target: string, client: any): Promise<string> { /* use client in generateText */ }`
   - Preserve whitespace logic.
   - Pseudocode Diff:
     ```typescript
     // New factory
     export function createAiClient(provider: string, apiKey: string) {
       switch (provider) {
         case 'anthropic': return createAnthropic({ apiKey });
         // Future: case 'openai': return createOpenAI({ apiKey });
         default: throw new Error(`Unsupported provider: ${provider}`);
       }
     }
     // Updated translateText
     export async function translateText(text: string, source: string, target: string, client: any) {
       // ... existing logic with client in generateText({ model: client('claude-3-5-sonnet-20240620'), ... })
     }
     ```

### Phase 3: Parsers (MDX, Frontmatter) – Integrate Strategy Pattern
**Goal**: Implement Strategy for MDX; make directive filtering rule-based.
**Task List**:
1. **Create src/parsers/frontmatter.ts (30 min)**:
   - Move `translateFrontmatter`.
   - No major changes; use `config.translation.frontmatterFields`.

2. **Create src/parsers/mdx.ts (60 min)**:
   - Define `interface TranslationStrategy { ... }` (move to src/core/types.ts if you add a types file; else here).
   - Implement `export class MDXStrategy implements TranslationStrategy { canHandle(filePath: string) { return filePath.endsWith('.mdx') || filePath.endsWith('.md'); } async translate(content: string, source: string, target: string, config: Config) { /* move translateMDXContent logic */ } }`
   - In `translate`: Move parsing logic; add `shouldTranslateNode(node: Node, parent: Parent | undefined, config: Config): boolean { /* traverse parents for directives; check if text matches config.rules.patternsToSkip.map(p => new RegExp(p)) */ }`
   - Collect texts/attributes only if `shouldTranslateNode` returns true.
   - Batch translations with `Promise.all` (pass AI client if needed).
   - Move `addParentReferences`, visitors for text/JSX/images.
   - Pseudocode Diff:
     ```typescript
     // New shouldTranslateNode
     function shouldTranslateNode(node: any, parent: any, config: Config): boolean {
       if (node.type !== 'text' || !node.value.trim()) return false;
       const patterns = config.translation?.rules?.patternsToSkip.map(p => new RegExp(p)) || [];
       if (patterns.some(p => p.test(node.value.trim()))) return false;
       // Traverse parent for directive check (as existing)
       let curr = parent;
       while (curr) {
         if (['containerDirective', 'leafDirective', 'textDirective'].includes(curr.type)) {
           // Additional logic: e.g., only translate if not a 'key-value' line
           return !patterns.some(p => p.test(node.value)); // Flexible
         }
         curr = curr.parent;
       }
       return true;
     }
     // In visitor: if (shouldTranslateNode(node, parent, config)) textsToTranslate.push(...);
     ```

### Phase 4: Core (Orchestration)
**Goal**: Tie together strategies, AI, parsers.
**Task List**:
1. **Create src/core/translateFile.ts (45 min)**:
   - Move `translateFile` logic.
   - Add strategy registry: `const strategies: TranslationStrategy[] = [new MDXStrategy()];`
   - In function: Find strategy with `strategies.find(s => s.canHandle(filePath))?.translate(...)` or throw error.
   - Handle frontmatter separately (call `translateFrontmatter`), then main content via strategy.
   - Inject AI client: Create via factory, pass to strategy/translateText.
   - Update lock with hash.

### Phase 5: CLI (Commands and Entrypoint)
**Goal**: Slim down CLI to orchestration.
**Task List**:
1. **Create src/cli/commands.ts (30 min)**:
   - Move command actions (e.g., `export async function initCommand() { /* move init logic, use utils/config */ }`)
   - Similar for `translateCommand`, `localeAddCommand` (use core/translateFile in translate).

2. **Rename/Move src/cli.ts to src/cli/index.ts (20 min)**:
   - Import from all modules (e.g., `import { translateFile } from '../core/translateFile';`)
   - Wire Commander: `program.command('init').action(initCommand);` etc.
   - Remove all moved functions; keep only Commander setup.

### Phase 6: Polish and Integration
**Task List**:
1. **Update Imports Across Files (15 min)**: Fix all imports (e.g., in cli/index.ts: `import { loadConfig } from '../utils/config';`).
2. **Extend openlocale.json Schema in Code (10 min)**: Ensure new fields are optional/defaulted.
3. **Update README.md (15 min)**: Add section on new config options (e.g., rules, provider) and modular structure.

---

## Testing Recommendations

- **Incremental**: After each phase, run `bun src/cli.ts init` and `bun src/cli.ts translate` on a sample file (e.g., existing `content/docs/en/test.mdx`).
- **Unit Tests**: Add a `tests/` dir with Bun's test runner (e.g., `bun test`). Test examples:
  - `shouldTranslateNode` with mock nodes/config.
  - Factory: `expect(createAiClient('anthropic', 'key')).toBeDefined();`
  - Strategy: Mock AI, test MDXStrategy.translate on sample MDX.
- **Edge Cases**: Test with directives (ensure skips patterns), unchanged files (lockfile), new locales.
- **Tools**: Use code_execution tool if needed to verify snippets, but manual runs suffice for MVP.

---

## Timeline and MVP Scope

- **Timeline**: 1-2 days (phases 1-3 Day 1; 4-6 Day 2). Each task is bite-sized.
- **MVP Scope**: Fully refactored CLI with Strategy (MDX only) and Factory (Anthropic only). Future: Add more strategies/providers.
- **Metrics**: Code lines per file <150; all commands work; config rules skip "type:" by default.

---

## Risks and Mitigations

- **Breakage During Migration**: Mitigate with incremental testing; git commit after each phase.
- **Over-Abstraction**: Keep Strategy/Factory light (no over-engineering).
- **Config Compatibility**: Defaults ensure old configs work.
- **Performance**: Batch AI calls remain; monitor for 400+ files (add progress bar if needed).

This plan gets you to a refactored MVP. If you encounter issues (e.g., need to verify a library update), let me know—I can use tools like web_search for confirmation!
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

## File: src/parsers/mdx.ts
````typescript
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { Config } from '../utils/config';
import { translateText, translateBatch } from '../ai/translate';
import { TranslationStrategy } from './types';

// Add parent references to all nodes in the tree
function addParentReferences(tree: any) {
  visit(tree, (node, index, parent) => {
    if (node !== tree) {
      node.parent = parent;
    }
  });
}

// Check if a text node should be translated based on config rules
function shouldTranslateNode(node: any, parent: any, config: Config, nodeIndex?: number): boolean {
  if (node.type !== 'text' || !node.value.trim()) return false;
  
  const trimmedValue = node.value.trim();
  
  // Check if this is a directive pseudo-attribute (first line of directive content)
  // This handles patterns like "type: help" that appear as the first content in directives
  if (parent && parent.type === 'paragraph' && nodeIndex === 0) {
    // Check if the paragraph's parent is a directive
    let paragraphParent = parent.parent;
    if (paragraphParent && (
      paragraphParent.type === 'containerDirective' || 
      paragraphParent.type === 'leafDirective' || 
      paragraphParent.type === 'textDirective'
    )) {
      // Check if this paragraph is the first child of the directive
      const firstChild = paragraphParent.children[0];
      if (firstChild === parent) {
        // Check if the text matches a key-value pattern (e.g., "type: help", "variant: warning")
        if (/^[\w-]+:\s*[\w-]+(\n|$)/.test(trimmedValue)) {
          return false; // Skip directive pseudo-attributes
        }
      }
    }
  }
  
  // Get skip patterns from config for other cases
  const patterns = config.translation?.rules?.patternsToSkip?.map(p => new RegExp(p)) || 
                   config.translation?.skipPatterns?.map(p => new RegExp(p)) || 
                   [];
  
  // Check if text matches any skip pattern
  if (patterns.some(p => p.test(trimmedValue))) {
    return false;
  }
  
  return true;
}

export class MDXStrategy implements TranslationStrategy {
  canHandle(filePath: string): boolean {
    return filePath.endsWith('.mdx') || filePath.endsWith('.md');
  }
  
  getName(): string {
    return 'MDX';
  }
  
  async translate(
    content: string,
    source: string,
    target: string,
    config: Config,
    aiClient: any
  ): Promise<string> {
    // Parse MDX content with directive support
    const tree = remark()
      .use(remarkMdx)
      .use(remarkDirective)
      .parse(content);
    
    // Add parent references to enable directive checking
    addParentReferences(tree);
    
    // Get translatable attributes from config
    const translatableAttrs = config.translation?.jsxAttributes || 
      ['title', 'description', 'tag', 'alt', 'placeholder', 'label'];
    
    // Collect all translatable text
    const textsToTranslate: { 
      node: any; 
      type: 'text' | 'attribute' | 'imageAlt'; 
      attributeName?: string; 
      parent?: any;
      originalText: string;
    }[] = [];
    
    // Visit text nodes
    visit(tree, 'text', (node, index, parent) => {
      if (shouldTranslateNode(node, parent, config, index)) {
        textsToTranslate.push({ 
          node, 
          type: 'text', 
          parent,
          originalText: node.value 
        });
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
                attributeName: attr.name,
                originalText: attr.value
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
          type: 'imageAlt',
          attributeName: 'alt',
          originalText: node.alt
        });
      }
    });
    
    // Batch translate all texts for performance
    const textsToTranslateArray = textsToTranslate.map(item => item.originalText);
    const translations = await translateBatch(
      textsToTranslateArray,
      source,
      target,
      aiClient
    );
    
    // Apply translations
    textsToTranslate.forEach((item, index) => {
      if (item.type === 'text') {
        item.node.value = translations[index];
      } else if (item.type === 'imageAlt') {
        item.node.alt = translations[index];
      } else if (item.type === 'attribute') {
        item.node.value = translations[index];
      }
    });
    
    // Stringify back to MDX with directive support
    return remark()
      .use(remarkMdx)
      .use(remarkDirective)
      .stringify(tree);
  }
}
````

## File: src/utils/config.ts
````typescript
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// Extended config schema with provider and rules
export const ConfigSchema = z.object({
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
    // New fields for extensibility
    provider: z.string().default('anthropic'),
    rules: z.object({
      patternsToSkip: z.array(z.string()).default([]), // No default patterns - intelligent detection instead
    }).optional(),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const configPath = path.resolve('openlocale.json');

export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return ConfigSchema.parse(JSON.parse(data));
  } catch {
    throw new Error('Configuration file not found. Run "openlocale init" first.');
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
````

## File: openlocale.json
````json
{
  "projectId": "prj_53b8dc3dfc3160334916",
  "locale": {
    "source": "en",
    "targets": ["es"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/[locale]/**/*.mdx"]
    }
  },
  "translation": {
    "frontmatterFields": ["title", "description", "sidebarTitle"]
  }
}
````

## File: openlocale.lock
````
version: 1
files:
  content/docs/en/test.mdx:
    content: 2b7c1c210ad85ab529ddf2a3231eadb5
  content/docs/en/tools/clarinet/index.mdx:
    content: 90d8c7441c095b156d922047f24fce00
````

## File: src/cli.ts
````typescript
#!/usr/bin/env bun
// This file is kept for backward compatibility
// The actual CLI implementation is in src/cli/index.ts
import './cli/index';
````
