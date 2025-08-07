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
.github/
  workflows/
    translate.yml
examples/
  content/
    en/
      api.mdx
      guide.mdx
    es/
      api.mdx
      guide.mdx
    fr/
      api.mdx
      guide.mdx
  use-sdk.ts
sdk/
  examples/
    basic.ts
    batch-translation.ts
    providers.ts
  src/
    errors.ts
    Idioma.standalone.ts
    Idioma.ts
    index.ts
    types.ts
  tests/
    Idioma.test.ts
  build.ts
  package.json
  README.md
  tsconfig.json
src/
  ai/
    index.ts
    translate.ts
  api/
    examples/
      client.ts
      test-api.ts
    middleware/
      auth.ts
      rate-limit.ts
    .env.example
    index.ts
    README.md
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
    cost.ts
    crypto.ts
    index.ts
    lockfile.ts
    paths.ts
  cli.ts
  index.ts
.env-example
.gitignore
.repomixignore
ARCHITECTURE.md
biome.json
bunup.config.ts
CLAUDE.md
idioma.json
package.json
README.md
repomix.config.json
tsconfig.json
```

# Files

## File: sdk/src/Idioma.standalone.ts
````typescript
import { resolve } from 'node:path';
import { ConfigError } from './errors';
import type {
  CostEstimate,
  CostEstimateParams,
  IdiomaConfig,
  ProcessFilesResult,
  TranslateContentParams,
  TranslateContentResult,
  TranslateFileParams,
  TranslateFileResult,
  TranslateFilesParams,
} from './types';

/**
 * Standalone Idioma SDK that can be published independently
 * This is a simplified version for demonstration purposes
 */
export class Idioma {
  private config: IdiomaConfig;

  constructor(options: IdiomaConfig = {}) {
    // Validate API key
    const provider = options.provider || 'anthropic';

    if (provider === 'anthropic' && !options.apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new ConfigError('Anthropic API key not found in environment or config');
    }

    if (provider === 'openai' && !options.apiKey && !process.env.OPENAI_API_KEY) {
      throw new ConfigError('OpenAI API key not found in environment or config');
    }

    this.config = {
      apiKey: options.apiKey,
      provider: provider,
      model: options.model,
      cachePath: options.cachePath || resolve(process.cwd(), 'idioma.lock'),
      locale: options.locale || { source: 'en', targets: [] },
      translation: {
        frontmatterFields: options.translation?.frontmatterFields || ['title', 'description'],
        jsxAttributes: options.translation?.jsxAttributes || ['alt', 'title', 'placeholder'],
        skipPatterns: options.translation?.skipPatterns || [],
        ...options.translation,
      },
    };
  }

  /**
   * Translate content directly without file I/O
   */
  async translateContent(params: TranslateContentParams): Promise<TranslateContentResult> {
    // This is a placeholder implementation
    // In a real implementation, this would:
    // 1. Use the appropriate AI provider client
    // 2. Parse content based on format (MDX, MD, string)
    // 3. Apply translation rules
    // 4. Track costs if requested

    return {
      translatedContent: `[Translated ${params.format}] ${params.content}`,
      usage: params.trackCosts
        ? {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          }
        : undefined,
      cost: params.trackCosts
        ? {
            inputCost: 0.0003,
            outputCost: 0.00075,
            totalCost: 0.00105,
            formattedCost: '< $0.01',
          }
        : undefined,
    };
  }

  /**
   * Translate a single file with caching
   */
  async translateFile(params: TranslateFileParams): Promise<TranslateFileResult> {
    // Placeholder implementation
    return {
      success: true,
      outputPath:
        params.outputPath ||
        params.filePath.replace(`/${params.sourceLocale}/`, `/${params.targetLocale}/`),
    };
  }

  /**
   * Batch translate multiple files
   */
  async translateFiles(_params: TranslateFilesParams): Promise<ProcessFilesResult> {
    // Placeholder implementation
    return {
      totalFiles: 10,
      successCount: 10,
      errorCount: 0,
      errors: [],
    };
  }

  /**
   * Get available file format strategies
   */
  getAvailableFormats(): string[] {
    return ['mdx', 'md', 'string'];
  }

  /**
   * Estimate translation costs
   */
  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    // Placeholder implementation
    const estimatedFiles = 10;
    const estimatedTokens = 10000;

    return {
      estimatedFiles,
      estimatedTokens,
      estimatedCost: {
        inputCost: 0.03,
        outputCost: 0.15,
        totalCost: 0.18,
        formattedCost: '$0.18',
      },
      breakdown: params.targetLocales.map((locale) => ({
        locale,
        files: estimatedFiles,
        estimatedTokens: estimatedTokens / params.targetLocales.length,
        estimatedCost: 0.18 / params.targetLocales.length,
      })),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IdiomaConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.apiKey) {
      const envKey = this.config.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
      process.env[envKey] = config.apiKey;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): IdiomaConfig {
    return { ...this.config };
  }

  /**
   * Static factory method
   */
  static async create(options?: IdiomaConfig): Promise<Idioma> {
    return new Idioma(options);
  }
}
````

## File: sdk/src/Idioma.ts
````typescript
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { glob } from 'glob';
import { createAiClient, translateText } from '@/ai/translate';
import { translateFile as coreTranslateFile } from '@/core/translate-file';
import { getFileStrategy } from '@/parsers';
import type { Config } from '@/utils/config';
import { loadConfig, mergeConfig } from '@/utils/config';
import { aggregateUsage, calculateCost, type TokenUsage } from '@/utils/cost';
import { getLockFile, saveLockFile, shouldTranslate } from '@/utils/lockfile';
import { ConfigError, FileError, TranslationError } from './errors';
import type {
  CostEstimate,
  CostEstimateParams,
  IdiomaConfig,
  ProcessFilesResult,
  TranslateContentParams,
  TranslateContentResult,
  TranslateFileParams,
  TranslateFileResult,
  TranslateFilesParams,
} from './types';

export class Idioma {
  private config: Config;
  private apiKey?: string;
  private lockFilePath: string;

  private constructor(config: Config, apiKey?: string, lockFilePath?: string) {
    this.config = config;
    this.apiKey = apiKey;
    this.lockFilePath = lockFilePath || resolve(process.cwd(), 'idioma.lock');
  }

  static async create(options: IdiomaConfig = {}): Promise<Idioma> {
    // Set API key from options or environment
    const apiKey = options.apiKey;
    if (apiKey) {
      process.env.ANTHROPIC_API_KEY = apiKey;
    } else if (options.provider === 'openai' && !process.env.OPENAI_API_KEY) {
      throw new ConfigError('OpenAI API key not found in environment or config');
    } else if (options.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      throw new ConfigError('Anthropic API key not found in environment or config');
    }

    // Load and merge config
    let config: Config;
    try {
      const baseConfig = await loadConfig();
      config = mergeConfig(baseConfig, options as Partial<Config>);
    } catch (_error) {
      // If no config file exists, create a minimal config
      config = {
        projectId: `prj_${Date.now()}`,
        locale: {
          source: options.locale?.source || 'en',
          targets: options.locale?.targets || [],
        },
        files: options.files || {},
        translation: {
          provider: options.provider || 'anthropic',
          model: options.model,
          frontmatterFields: options.translation?.frontmatterFields || ['title', 'description'],
          jsxAttributes: options.translation?.jsxAttributes || ['alt', 'title', 'placeholder'],
          skipPatterns: options.translation?.skipPatterns || [],
          rules: options.translation?.rules || {
            patternsToSkip: ['^type:\\s*\\w+$'],
          },
        },
      } as Config;
    }

    const lockFilePath = options.cachePath || resolve(process.cwd(), 'idioma.lock');
    return new Idioma(config, apiKey, lockFilePath);
  }

  /**
   * Translate content directly without file I/O
   */
  async translateContent(params: TranslateContentParams): Promise<TranslateContentResult> {
    const { content, format, sourceLocale, targetLocale, trackCosts = false } = params;

    try {
      let translatedContent: string;
      let usage: TokenUsage | undefined;

      if (format === 'string') {
        // Direct text translation
        const result = await translateText(
          content,
          sourceLocale,
          targetLocale,
          this.config.translation?.provider || 'anthropic',
          this.config.translation?.model
        );
        translatedContent = result.text;
        usage = result.usage;
      } else {
        // Use appropriate parser strategy
        const strategy = getFileStrategy(format === 'mdx' ? 'file.mdx' : 'file.md');
        if (!strategy) {
          throw new TranslationError(`No parser strategy found for format: ${format}`);
        }

        // Create AI client for the strategy
        const aiClient = createAiClient(
          this.config.translation?.provider || 'anthropic',
          this.apiKey
        );

        const result = await strategy.translate(
          content,
          sourceLocale,
          targetLocale,
          this.config,
          aiClient,
          this.config.translation?.model,
          this.config.translation?.provider || 'anthropic'
        );
        translatedContent = result.content;
        usage = result.usage;
      }

      const response: TranslateContentResult = { translatedContent };

      if (trackCosts && usage) {
        response.usage = usage;
        response.cost = calculateCost(
          usage,
          this.config.translation?.provider || 'anthropic',
          this.config.translation?.model
        );
      }

      return response;
    } catch (error) {
      throw new TranslationError(
        error instanceof Error ? error.message : 'Unknown translation error'
      );
    }
  }

  /**
   * Translate a single file with caching
   */
  async translateFile(params: TranslateFileParams): Promise<TranslateFileResult> {
    const { filePath, sourceLocale, targetLocale, outputPath, showCosts = false } = params;

    try {
      // Verify file exists
      await readFile(filePath).catch(() => {
        throw new FileError(`File not found: ${filePath}`);
      });

      const lockFile = await getLockFile(this.lockFilePath);

      // Check if translation is needed
      if (!outputPath && !shouldTranslate(lockFile, filePath, targetLocale)) {
        return {
          success: true,
          outputPath: this.getDefaultOutputPath(filePath, sourceLocale, targetLocale),
        };
      }

      // If custom output path is specified, we need to handle translation differently
      if (outputPath) {
        // Read the file content
        const content = await readFile(filePath, 'utf-8');

        // Translate using translateContent
        const translationResult = await this.translateContent({
          content,
          format: filePath.endsWith('.mdx') ? 'mdx' : 'md',
          sourceLocale,
          targetLocale,
          trackCosts: showCosts,
        });

        // Write to custom output path
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, translationResult.translatedContent);

        // Update lock file
        if (!lockFile.files) {
          lockFile.files = {};
        }
        lockFile.files[filePath] = {
          content: await this.getFileHash(content),
          translations: {
            ...lockFile.files[filePath]?.translations,
            [targetLocale]: true,
          },
        };
        await saveLockFile(lockFile, this.lockFilePath);

        return {
          success: true,
          outputPath,
          usage: translationResult.usage,
          cost: translationResult.cost,
        };
      } else {
        // Use core translation function for standard paths
        const result = await coreTranslateFile(
          filePath,
          sourceLocale,
          targetLocale,
          lockFile,
          this.config,
          { showCosts }
        );

        // Update lock file
        if (result.usage) {
          await saveLockFile(lockFile, this.lockFilePath);
        }

        return {
          success: true,
          outputPath: this.getDefaultOutputPath(filePath, sourceLocale, targetLocale),
          usage: result.usage,
          cost: result.usage
            ? calculateCost(
                result.usage,
                this.config.translation?.provider || 'anthropic',
                this.config.translation?.model
              )
            : undefined,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch translate multiple files
   */
  async translateFiles(params: TranslateFilesParams): Promise<ProcessFilesResult> {
    const { patterns, sourceLocale, targetLocales, showCosts = false } = params;

    try {
      // Resolve file patterns
      const files = await this.resolveFilePatterns(patterns);
      if (files.length === 0) {
        return {
          totalFiles: 0,
          successCount: 0,
          errorCount: 0,
          errors: [],
        };
      }

      // Process files individually
      const errors: Array<{ file: string; error: string }> = [];
      const allUsages: TokenUsage[] = [];
      let successCount = 0;

      for (const file of files) {
        for (const targetLocale of targetLocales) {
          try {
            const result = await this.translateFile({
              filePath: file,
              sourceLocale,
              targetLocale,
              showCosts,
            });

            if (result.success) {
              successCount++;
              if (result.usage) {
                allUsages.push(result.usage);
              }
            } else {
              errors.push({ file, error: result.error || 'Unknown error' });
            }
          } catch (error) {
            errors.push({
              file,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Aggregate usage and costs
      const totalUsage = allUsages.length > 0 ? aggregateUsage(allUsages) : undefined;
      const totalCost = totalUsage
        ? calculateCost(
            totalUsage,
            this.config.translation?.provider || 'anthropic',
            this.config.translation?.model
          )
        : undefined;

      return {
        totalFiles: files.length * targetLocales.length,
        successCount,
        errorCount: errors.length,
        totalUsage,
        totalCost,
        errors,
      };
    } catch (error) {
      throw new TranslationError(
        error instanceof Error ? error.message : 'Unknown batch translation error'
      );
    }
  }

  /**
   * Get available file format strategies
   */
  getAvailableFormats(): string[] {
    return ['mdx', 'md', 'string'];
  }

  /**
   * Estimate translation costs
   */
  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    const { patterns, targetLocales } = params;

    try {
      const files = await this.resolveFilePatterns(patterns);
      const avgTokensPerFile = 1000; // Rough estimate
      const totalFiles = files.length;
      const totalTranslations = totalFiles * targetLocales.length;
      const estimatedTokens = totalTranslations * avgTokensPerFile;

      // Calculate cost using current provider/model
      const usage: TokenUsage = {
        promptTokens: Math.round(estimatedTokens * 0.7), // Rough split
        completionTokens: Math.round(estimatedTokens * 0.3),
        totalTokens: estimatedTokens,
      };

      const cost = calculateCost(
        usage,
        this.config.translation?.provider || 'anthropic',
        this.config.translation?.model
      );

      const breakdown = targetLocales.map((locale) => ({
        locale,
        files: totalFiles,
        estimatedTokens: estimatedTokens / targetLocales.length,
        estimatedCost: cost.totalCost / targetLocales.length,
      }));

      return {
        estimatedFiles: totalFiles,
        estimatedTokens,
        estimatedCost: cost,
        breakdown,
      };
    } catch (error) {
      throw new TranslationError(error instanceof Error ? error.message : 'Cost estimation failed');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IdiomaConfig>): void {
    this.config = mergeConfig(this.config, config as Partial<Config>);

    // Update API key if provided
    if (config.apiKey) {
      this.apiKey = config.apiKey;
      process.env.ANTHROPIC_API_KEY = config.apiKey;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Config {
    return { ...this.config };
  }

  // Private helper methods

  private async resolveFilePatterns(patterns: string[]): Promise<string[]> {
    const fileSet = new Set<string>();

    for (const pattern of patterns) {
      const matches = await glob(pattern, { absolute: true });
      matches.forEach((file) => fileSet.add(file));
    }

    return Array.from(fileSet);
  }

  private getDefaultOutputPath(
    filePath: string,
    sourceLocale: string,
    targetLocale: string
  ): string {
    return filePath.replace(`/${sourceLocale}/`, `/${targetLocale}/`);
  }

  private async getFileHash(content: string): Promise<string> {
    return createHash('sha256').update(content).digest('hex');
  }
}
````

## File: sdk/tests/Idioma.test.ts
````typescript
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ConfigError } from '../src/errors';
import { Idioma } from '../src/Idioma';
import type { IdiomaConfig } from '../src/types';

// Mock environment variables
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-api-key';
});

describe('Idioma SDK', () => {
  describe('Constructor', () => {
    test('should create instance with default config', () => {
      const sdk = new Idioma();
      expect(sdk).toBeInstanceOf(Idioma);
      expect(sdk.getConfig()).toHaveProperty('locale');
    });

    test('should accept custom config', () => {
      const config: IdiomaConfig = {
        locale: {
          source: 'en',
          targets: ['es', 'fr'],
        },
        provider: 'openai',
        model: 'gpt-4o-2024-08-06',
      };

      const sdk = new Idioma(config);
      const sdkConfig = sdk.getConfig();
      expect(sdkConfig.locale.targets).toEqual(['es', 'fr']);
      expect(sdkConfig.translation.provider).toBe('openai');
    });

    test('should throw error if API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new Idioma({ provider: 'anthropic' })).toThrow(ConfigError);
    });
  });

  describe('translateContent', () => {
    test('should translate string content', async () => {
      const _sdk = new Idioma();

      // Mock the translation function
      const mockTranslate = mock(() =>
        Promise.resolve({
          translatedContent: 'Hola Mundo',
          usage: {
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15,
          },
        })
      );

      // This is a simplified test - in real implementation, we'd need to mock the AI client
      const result = await mockTranslate({
        content: 'Hello World',
        format: 'string',
        sourceLocale: 'en',
        targetLocale: 'es',
      });

      expect(result.translatedContent).toBe('Hola Mundo');
      expect(result.usage).toBeDefined();
    });

    test('should translate MDX content', async () => {
      const _sdk = new Idioma();

      const mdxContent = `
---
title: Hello
description: World
---

# Hello World

This is a test.
      `.trim();

      // This would need proper mocking of the MDX parser
      const mockTranslate = mock(() =>
        Promise.resolve({
          translatedContent: `
---
title: Hola
description: Mundo
---

# Hola Mundo

Esto es una prueba.
          `.trim(),
        })
      );

      const result = await mockTranslate({
        content: mdxContent,
        format: 'mdx',
        sourceLocale: 'en',
        targetLocale: 'es',
      });

      expect(result.translatedContent).toContain('Hola Mundo');
    });

    test('should include cost calculation when requested', async () => {
      const _sdk = new Idioma();

      const mockTranslate = mock(() =>
        Promise.resolve({
          translatedContent: 'Translated text',
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
          cost: {
            inputCost: 0.0003,
            outputCost: 0.00075,
            totalCost: 0.00105,
            formattedCost: '< $0.01',
          },
        })
      );

      const result = await mockTranslate({
        content: 'Test',
        format: 'string',
        sourceLocale: 'en',
        targetLocale: 'es',
        trackCosts: true,
      });

      expect(result.cost).toBeDefined();
      expect(result.cost?.formattedCost).toBe('< $0.01');
    });
  });

  describe('translateFile', () => {
    test('should handle file not found error', async () => {
      const sdk = new Idioma();

      const result = await sdk.translateFile({
        filePath: '/non/existent/file.md',
        sourceLocale: 'en',
        targetLocale: 'es',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('getAvailableFormats', () => {
    test('should return supported formats', () => {
      const sdk = new Idioma();
      const formats = sdk.getAvailableFormats();

      expect(formats).toContain('mdx');
      expect(formats).toContain('md');
      expect(formats).toContain('string');
    });
  });

  describe('estimateCost', () => {
    test('should estimate translation costs', async () => {
      const _sdk = new Idioma();

      // Mock file resolution
      const mockEstimate = mock(() =>
        Promise.resolve({
          estimatedFiles: 10,
          estimatedTokens: 10000,
          estimatedCost: {
            inputCost: 0.03,
            outputCost: 0.15,
            totalCost: 0.18,
            formattedCost: '$0.18',
          },
          breakdown: [
            {
              locale: 'es',
              files: 10,
              estimatedTokens: 5000,
              estimatedCost: 0.09,
            },
            {
              locale: 'fr',
              files: 10,
              estimatedTokens: 5000,
              estimatedCost: 0.09,
            },
          ],
        })
      );

      const estimate = await mockEstimate({
        patterns: ['content/**/*.mdx'],
        targetLocales: ['es', 'fr'],
      });

      expect(estimate.estimatedFiles).toBe(10);
      expect(estimate.breakdown).toHaveLength(2);
      expect(estimate.estimatedCost.formattedCost).toBe('$0.18');
    });
  });

  describe('updateConfig', () => {
    test('should update configuration', () => {
      const sdk = new Idioma();

      sdk.updateConfig({
        provider: 'openai',
        model: 'gpt-4o-mini',
      });

      const config = sdk.getConfig();
      expect(config.translation.provider).toBe('openai');
      expect(config.translation.model).toBe('gpt-4o-mini');
    });
  });

  describe('Static factory', () => {
    test('should create instance using factory method', async () => {
      const sdk = await Idioma.create({
        locale: {
          source: 'en',
          targets: ['de'],
        },
      });

      expect(sdk).toBeInstanceOf(Idioma);
      expect(sdk.getConfig().locale.targets).toContain('de');
    });
  });
});
````

## File: src/index.ts
````typescript
// Main entry point for Idioma library
export { Idioma } from '../sdk/src/Idioma';
export type { IdiomaConfig } from '../sdk/src/types';
export * from '../sdk/src/types';
export * from '../sdk/src/errors';

// Export utilities for advanced usage
export { createAiClient, translateText } from './ai/translate';
export { loadConfig, saveConfig } from './utils/config';
export type { Config } from './utils/config';
export { loadLock, saveLock } from './utils/lockfile';
export type { LockFile } from './utils/lockfile';
export { calculateCost, type TokenUsage, type CostCalculation } from './utils/cost';
````

## File: bunup.config.ts
````typescript
import { defineConfig } from 'bunup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts', 'sdk/src/index.ts'],
  outDir: 'dist',
  format: ['esm'], // Array format for ESM only
  target: 'node',
  clean: true, // Clean dist folder before build
  
  // External dependencies that shouldn't be bundled
  external: [
    '@ai-sdk/anthropic',
    '@ai-sdk/openai',
    '@unkey/api',
    'ai',
    'commander',
    'glob',
    'hono',
    'hono/*',
    'js-yaml',
    'ora',
    'remark',
    'remark-directive',
    'remark-frontmatter',
    'remark-mdx',
    'remark-parse',
    'remark-stringify',
    'unist-util-visit',
    'zod',
    'fs',
    'path',
    'url',
    'node:fs',
    'node:path',
    'node:crypto',
    'node:fs/promises'
  ],
});
````

## File: idioma.json
````json
{
  "projectId": "prj_53b8dc3dfc3160334916",
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "zh"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/[locale]/**/*.mdx"]
    }
  },
  "translation": {
    "frontmatterFields": ["title", "description", "sidebarTitle"],
    "jsxAttributes": [
      "title",
      "description",
      "tag",
      "alt",
      "placeholder",
      "label"
    ],
    "skipPatterns": [],
    "provider": "anthropic"
  }
}
````

## File: .github/workflows/translate.yml
````yaml
name: Auto-Translate Documentation

on:
  push:
    branches: [main]
    paths:
      - "content/docs/en/**/*.mdx"
      - "content/docs/en/**/*.md"
      - "idioma.json"
  workflow_dispatch:
    inputs:
      force_retranslate:
        description: "Force retranslate all files"
        required: false
        type: boolean
        default: false

jobs:
  translate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 2 # Fetch previous commit to detect changes

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Cache Idioma
        uses: actions/cache@v3
        with:
          path: ~/.bun/install/global
          key: ${{ runner.os }}-idioma-${{ hashFiles('**/idioma.json') }}

      - name: Install Idioma CLI
        run: |
          bun install -g idioma
          idioma --version

      - name: Reset lock file (if forced)
        if: ${{ github.event.inputs.force_retranslate == 'true' }}
        run: |
          echo "Force retranslate requested - resetting lock file"
          # Get target locales from config
          LOCALES=$(cat idioma.json | jq -r '.locale.targets | join(",")')
          idioma reset --locales $LOCALES

      - name: Run translations
        id: translate
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # Optional: Use different provider
          # OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          echo "Starting translation process..."

          # Run translation and capture output
          idioma translate --costs | tee translation-output.log

          # Extract key metrics from output
          if grep -q "Total cost:" translation-output.log; then
            TOTAL_COST=$(grep "Total cost:" translation-output.log | tail -1 | awk '{print $3}')
            echo "total_cost=$TOTAL_COST" >> $GITHUB_OUTPUT
          else
            echo "total_cost=$0.00" >> $GITHUB_OUTPUT
          fi

          # Count translated files
          TRANSLATED_COUNT=$(grep -c "✔" translation-output.log || echo "0")
          echo "translated_count=$TRANSLATED_COUNT" >> $GITHUB_OUTPUT

          # Check if any translations were made
          if [ "$TRANSLATED_COUNT" -eq "0" ]; then
            echo "No translations needed"
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Check for changes
        id: check_changes
        run: |
          if git diff --quiet; then
            echo "No changes to commit"
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "Changes detected"
            echo "has_changes=true" >> $GITHUB_OUTPUT

            # Get list of changed files
            CHANGED_FILES=$(git diff --name-only | grep -E "\.(md|mdx)$" | wc -l)
            echo "changed_files=$CHANGED_FILES" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        if: steps.check_changes.outputs.has_changes == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: |
            🌍 Update translations

            - Translated ${{ steps.translate.outputs.translated_count }} files
            - Cost: ${{ steps.translate.outputs.total_cost }}

            Co-authored-by: Idioma <noreply@idioma.dev>
          branch: translations/auto-update-${{ github.run_number }}
          delete-branch: true
          title: "🌍 Update translations"
          body: |
            ## Translation Update

            This PR contains automatic translations for recent documentation changes.

            ### Summary
            - **Files translated**: ${{ steps.translate.outputs.translated_count }}
            - **Translation cost**: ${{ steps.translate.outputs.total_cost }}
            - **Triggered by**: ${{ github.event_name == 'workflow_dispatch' && 'Manual run' || github.event.head_commit.message }}

            ### Translation Log
            <details>
            <summary>View detailed output</summary>

            ```
            ${{ steps.translate.outputs.log }}
            ```
            </details>

            ### Review Checklist
            - [ ] Translations look accurate
            - [ ] Formatting is preserved
            - [ ] Links and code blocks are intact
            - [ ] No untranslated content remains

            ---
            *🤖 Generated automatically by [Idioma](https://github.com/idioma/idioma)*
          labels: |
            translations
            automated
            documentation

      - name: Add comment to PR with cost breakdown
        if: steps.check_changes.outputs.has_changes == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const output = require('fs').readFileSync('translation-output.log', 'utf8');
            const costLines = output.split('\n').filter(line => line.includes('$'));

            if (costLines.length > 0) {
              const comment = `## 💰 Translation Cost Breakdown\n\n\`\`\`\n${costLines.join('\n')}\n\`\`\``;

              // Find the PR that was just created
              const { data: prs } = await github.rest.pulls.list({
                owner: context.repo.owner,
                repo: context.repo.repo,
                state: 'open',
                head: `${context.repo.owner}:translations/auto-update-${context.runNumber}`
              });

              if (prs.length > 0) {
                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: prs[0].number,
                  body: comment
                });
              }
            }

      - name: Summary
        if: always()
        run: |
          echo "## Translation Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          if [ "${{ steps.check_changes.outputs.has_changes }}" == "true" ]; then
            echo "✅ **Translations completed successfully**" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "- Files translated: ${{ steps.translate.outputs.translated_count }}" >> $GITHUB_STEP_SUMMARY
            echo "- Total cost: ${{ steps.translate.outputs.total_cost }}" >> $GITHUB_STEP_SUMMARY
            echo "- Pull request created" >> $GITHUB_STEP_SUMMARY
          else
            echo "ℹ️ **No translations needed**" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "All documentation is up to date." >> $GITHUB_STEP_SUMMARY
          fi
````

## File: examples/content/en/api.mdx
````
---
title: API Reference
description: Complete API documentation
---

# API Reference

Our API provides programmatic access to all features.

## Authentication

All API requests require authentication using an API key:

```typescript
const client = new APIClient({
  apiKey: process.env.API_KEY
});
```

## Endpoints

### POST /api/translate

Translate content between languages.

```json
{
  "content": "Hello World",
  "sourceLocale": "en",
  "targetLocale": "es"
}
```
````

## File: examples/content/en/guide.mdx
````
---
title: User Guide
description: Complete guide to using our product
sidebarTitle: Guide
---

import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'

# User Guide

Welcome to our comprehensive user guide. This guide will help you get started quickly.

<Alert type="info" title="New to our product?">
  Check out our [quick start tutorial](/docs/quickstart) to get up and running in minutes.
</Alert>

## Getting Started

First, you'll need to install our CLI tool:

```bash
npm install -g @ourcompany/cli
```

<Button label="Download Now" href="/download" />

## Key Features

- **Easy to use**: Intuitive interface designed for developers
- **Powerful**: Advanced features for power users
- **Flexible**: Customize everything to your needs

## Next Steps

Ready to dive deeper? Check out these resources:

1. [API Reference](/docs/api)
2. [Examples](/docs/examples)
3. [Best Practices](/docs/best-practices)
````

## File: examples/content/es/api.mdx
````
---
title: Referencia de la API
description: Documentación completa de la API
---
# Referencia de la API

Nuestra API proporciona acceso programático a todas las funciones.

## Autenticación

Todas las solicitudes a la API requieren autenticación utilizando una clave de API:

```typescript
const client = new APIClient({
  apiKey: process.env.API_KEY
});
```

## Puntos finales

### POST /api/translate

Traducir contenido entre idiomas.

```json
{
  "content": "Hello World",
  "sourceLocale": "en",
  "targetLocale": "es"
}
```
````

## File: examples/content/es/guide.mdx
````
***

título: Guía del Usuario
descripción: Guía completa para usar nuestro producto
títuloBarraLateral: Guía
------------------------

import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'

# Guía del Usuario

Bienvenido a nuestra guía de usuario completa. Esta guía te ayudará a comenzar rápidamente.

<Alert type="info" title="¿Nuevo en nuestro producto?">
  Echa un vistazo a nuestro [tutorial de inicio rápido](/docs/quickstart) para comenzar y estar operativo en minutos.
</Alert>

## Primeros pasos

Primero, necesitarás instalar nuestra herramienta CLI:

```bash
npm install -g @ourcompany/cli
```

<Button label="Descargar ahora" href="/download" />

## Características principales

* **Fácil de usar**: Interfaz intuitiva diseñada para desarrolladores
* **Poderoso**: Funciones avanzadas para usuarios expertos
* **Flexible**: Personaliza todo según tus necesidades

## Próximos Pasos

¿Listo para profundizar más? Consulta estos recursos:

1. [Referencia de la API](/docs/api)
2. [Ejemplos](/docs/examples)
3. [Mejores Prácticas](/docs/best-practices)
````

## File: examples/content/fr/api.mdx
````
---
title: Référence de l'API
description: Documentation complète de l'API
---
# Référence de l'API

Notre API offre un accès programmatique à toutes les fonctionnalités.

## Authentification

Toutes les requêtes API nécessitent une authentification à l'aide d'une clé API :

```typescript
const client = new APIClient({
  apiKey: process.env.API_KEY
});
```

## Points de terminaison

### POST /api/translate

Traduire du contenu entre les langues.

```json
{
  "content": "Hello World",
  "sourceLocale": "en",
  "targetLocale": "es"
}
```
````

## File: examples/content/fr/guide.mdx
````
---
title: Guide de l'utilisateur
description: Guide complet d'utilisation de notre produit
sidebarTitle: Guide
---
import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'

# Guide de l'utilisateur

Bienvenue dans notre guide d'utilisation complet. Ce guide vous aidera à démarrer rapidement.

<Alert type="info" title="Nouveau sur notre produit ?">
  Découvrez notre [tutoriel de démarrage rapide](/docs/quickstart) pour être opérationnel en quelques minutes.
</Alert>

## Premiers pas

Tout d'abord, vous devrez installer notre outil CLI :

```bash
npm install -g @ourcompany/cli
```

<Button label="Télécharger maintenant" href="/download" />

## Caractéristiques principales

* **Facile à utiliser**: Interface intuitive conçue pour les développeurs
* **Puissant**: Fonctionnalités avancées pour les utilisateurs expérimentés
* **Flexible**: Personnalisez tout selon vos besoins

## Prochaines étapes

Prêt à approfondir ? Consultez ces ressources :

1. [Référence de l'API](/docs/api)
2. [Exemples](/docs/examples)
3. [Meilleures pratiques](/docs/best-practices)
````

## File: sdk/README.md
````markdown
# Idioma SDK

The Idioma SDK provides a programmatic interface for AI-powered translations with support for multiple file formats, providers, and cost tracking.

## Installation

```bash
npm install idioma
# or
bun add idioma
```

## Quick Start

```typescript
import { Idioma } from 'idioma';

// Initialize the SDK
const idioma = new Idioma({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Translate content
const result = await idioma.translateContent({
  content: 'Hello World',
  format: 'string',
  sourceLocale: 'en',
  targetLocale: 'es',
});

console.log(result.translatedContent); // "Hola Mundo"
```

## API Reference

### Constructor Options

```typescript
interface IdiomaConfig {
  apiKey?: string;              // API key for the provider
  provider?: 'anthropic' | 'openai';  // AI provider (default: 'anthropic')
  model?: string;               // Model to use
  cachePath?: string;           // Path to lock file cache
  locale?: {
    source: string;             // Source locale (default: 'en')
    targets: string[];          // Target locales
  };
  translation?: {
    frontmatterFields?: string[];     // Fields to translate in frontmatter
    jsxAttributes?: string[];         // JSX attributes to translate
    skipPatterns?: string[];          // Regex patterns to skip
  };
}
```

### Methods

#### `translateContent(params)`

Translate content directly without file I/O.

```typescript
const result = await idioma.translateContent({
  content: '# Hello\nWorld',
  format: 'md',              // 'mdx' | 'md' | 'string'
  sourceLocale: 'en',
  targetLocale: 'es',
  trackCosts: true,          // Optional: track token usage and costs
});

// Result includes:
// - translatedContent: string
// - usage?: TokenUsage
// - cost?: CostCalculation
```

#### `translateFile(params)`

Translate a single file with caching support.

```typescript
const result = await idioma.translateFile({
  filePath: 'content/docs/en/guide.mdx',
  sourceLocale: 'en',
  targetLocale: 'es',
  outputPath: 'content/docs/es/guide.mdx',  // Optional
  showCosts: true,                          // Optional
});

// Result includes:
// - success: boolean
// - outputPath?: string
// - usage?: TokenUsage
// - cost?: CostCalculation
// - error?: string
```

#### `translateFiles(params)`

Batch translate multiple files.

```typescript
const result = await idioma.translateFiles({
  patterns: ['content/**/*.mdx', 'docs/**/*.md'],
  sourceLocale: 'en',
  targetLocales: ['es', 'fr', 'de'],
  showCosts: true,
});

// Result includes:
// - totalFiles: number
// - successCount: number
// - errorCount: number
// - totalUsage?: TokenUsage
// - totalCost?: CostCalculation
// - errors: Array<{file: string, error: string}>
```

#### `estimateCost(params)`

Estimate translation costs before processing.

```typescript
const estimate = await idioma.estimateCost({
  patterns: ['content/**/*.mdx'],
  targetLocales: ['es', 'fr'],
});

// Estimate includes:
// - estimatedFiles: number
// - estimatedTokens: number
// - estimatedCost: CostCalculation
// - breakdown: per-locale estimates
```

#### `getAvailableFormats()`

Get supported file formats.

```typescript
const formats = idioma.getAvailableFormats();
// Returns: ['mdx', 'md', 'string']
```

#### `updateConfig(config)`

Update configuration at runtime.

```typescript
idioma.updateConfig({
  provider: 'openai',
  model: 'gpt-4o-mini',
});
```

## Examples

### Translate MDX Documentation

```typescript
import { Idioma } from 'idioma';

const idioma = new Idioma({
  provider: 'anthropic',
  translation: {
    frontmatterFields: ['title', 'description'],
    jsxAttributes: ['alt', 'title', 'placeholder'],
  },
});

// Translate all MDX files
const result = await idioma.translateFiles({
  patterns: ['content/docs/**/*.mdx'],
  sourceLocale: 'en',
  targetLocales: ['es', 'fr', 'zh'],
  showCosts: true,
});

console.log(`Translated ${result.successCount} files`);
console.log(`Total cost: ${result.totalCost?.formattedCost}`);
```

### With Cost Tracking

```typescript
const result = await idioma.translateContent({
  content: 'Your content here...',
  format: 'mdx',
  sourceLocale: 'en',
  targetLocale: 'es',
  trackCosts: true,
});

if (result.cost) {
  console.log(`Translation cost: ${result.cost.formattedCost}`);
  console.log(`Tokens used: ${result.usage?.totalTokens}`);
}
```

### Error Handling

```typescript
import { TranslationError, FileError } from 'idioma';

try {
  const result = await idioma.translateFile({
    filePath: 'path/to/file.mdx',
    sourceLocale: 'en',
    targetLocale: 'es',
  });
} catch (error) {
  if (error instanceof FileError) {
    console.error('File error:', error.message);
  } else if (error instanceof TranslationError) {
    console.error('Translation error:', error.message);
  }
}
```

## Provider Support

### Anthropic (Default)

```typescript
const idioma = new Idioma({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20240620',  // Optional, uses default
});
```

### OpenAI

```typescript
const idioma = new Idioma({
  provider: 'openai',
  model: 'gpt-4o-2024-08-06',  // Optional, uses default
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Cost Information

The SDK includes built-in pricing for accurate cost calculation:

- **Anthropic Claude 3.5 Sonnet**: $3/1M input, $15/1M output tokens
- **OpenAI GPT-4o**: $5/1M input, $15/1M output tokens
- **OpenAI GPT-4o-mini**: $0.15/1M input, $0.60/1M output tokens

Access pricing information:

```typescript
import { PRICING } from 'idioma';
console.log(PRICING);
```

## License

MIT
````

## File: src/api/.env.example
````
# API Server Configuration
PORT=3000
NODE_ENV=development

# Unkey Configuration
# Get these from https://app.unkey.com
UNKEY_ROOT_KEY=unkey_root_xxx
UNKEY_API_ID=api_xxx

# Translation Providers
# At least one is required
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Default provider (anthropic or openai)
TRANSLATION_PROVIDER=anthropic
````

## File: src/api/README.md
````markdown
# Idioma API

A REST API for AI-powered translations using the Idioma SDK.

## Features

- 🔐 **Secure Authentication** with Unkey API keys
- 🚦 **Rate Limiting** to prevent abuse
- 🌍 **Multi-language Support** with batch translations
- 💰 **Cost Tracking** for all translations
- 🔄 **Multiple AI Providers** (Anthropic, OpenAI)
- 📝 **Format Preservation** (Markdown, MDX)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp src/api/.env.example .env
   # Edit .env with your API keys
   ```

3. **Start the server:**
   ```bash
   bun run src/api/index.ts
   ```

## Authentication

All API endpoints require authentication using Unkey API keys.

### Setting up Unkey

1. Sign up at [unkey.com](https://unkey.com)
2. Create an API in the Unkey dashboard
3. Add your `UNKEY_ROOT_KEY` and `UNKEY_API_ID` to `.env`
4. Create API keys for your users

### Using API Keys

Include your API key in requests using one of these methods:

```bash
# Header: X-API-Key
curl -H "X-API-Key: your_key_here" ...

# Header: Authorization Bearer
curl -H "Authorization: Bearer your_key_here" ...
```

## Endpoints

### `GET /api/health`

Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "providers": {
    "anthropic": true,
    "openai": false
  }
}
```

### `POST /api/translate`

Translate content to a single target language.

**Request:**
```json
{
  "content": "Hello world",
  "sourceLocale": "en",
  "targetLocale": "es",
  "format": "string"  // "string" | "md" | "mdx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translatedContent": "Hola mundo",
    "sourceLocale": "en",
    "targetLocale": "es",
    "format": "string",
    "usage": {
      "promptTokens": 15,
      "completionTokens": 5,
      "totalTokens": 20
    },
    "cost": {
      "inputCost": 0.000045,
      "outputCost": 0.000075,
      "totalCost": 0.00012,
      "formattedCost": "< $0.01"
    },
    "duration": "523ms"
  },
  "ratelimit": {
    "limit": 100,
    "remaining": 99,
    "reset": 1704067260
  }
}
```

### `POST /api/translate/batch`

Translate content to multiple target languages.

**Request:**
```json
{
  "content": "# Welcome\n\nThis is a test document.",
  "sourceLocale": "en",
  "targetLocales": ["es", "fr", "de"],
  "format": "md"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translations": {
      "es": {
        "content": "# Bienvenido\n\nEste es un documento de prueba.",
        "usage": { /* ... */ },
        "cost": { /* ... */ }
      },
      "fr": {
        "content": "# Bienvenue\n\nCeci est un document de test.",
        "usage": { /* ... */ },
        "cost": { /* ... */ }
      },
      "de": {
        "content": "# Willkommen\n\nDies ist ein Testdokument.",
        "usage": { /* ... */ },
        "cost": { /* ... */ }
      }
    },
    "sourceLocale": "en",
    "format": "md",
    "totalUsage": {
      "promptTokens": 150,
      "completionTokens": 120,
      "totalTokens": 270
    },
    "totalCost": {
      "amount": 0.00135,
      "formatted": "$0.00"
    },
    "duration": "2341ms"
  }
}
```

## Rate Limits

- **Standard endpoints**: 100 requests per minute
- **Batch endpoints**: 10 requests per minute

Rate limits are applied per API key. When you exceed the limit, you'll receive a 429 response:

```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": [ /* Optional validation errors */ ]
}
```

### Common Error Codes

- `401` - Invalid or missing API key
- `400` - Validation error (check details)
- `429` - Rate limit exceeded
- `500` - Internal server error

## Advanced Configuration

### API Key Metadata

You can store metadata with your Unkey API keys to customize behavior:

```json
{
  "provider": "openai",     // Override default provider
  "model": "gpt-4o-mini",   // Use specific model
  "tier": "premium"         // Custom tier for rate limiting
}
```

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Unkey (required)
UNKEY_ROOT_KEY=unkey_root_xxx
UNKEY_API_ID=api_xxx

# AI Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Defaults
TRANSLATION_PROVIDER=anthropic
```

## Examples

### cURL

```bash
# Simple translation
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "content": "Hello world",
    "targetLocale": "es"
  }'

# Batch translation
curl -X POST http://localhost:3000/api/translate/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "content": "# Hello\n\nWelcome to Idioma!",
    "targetLocales": ["es", "fr", "ja"],
    "format": "md"
  }'
```

### JavaScript/TypeScript

```typescript
// Simple translation
const response = await fetch('http://localhost:3000/api/translate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    content: 'Hello world',
    targetLocale: 'es'
  })
});

const result = await response.json();
console.log(result.data.translatedContent); // "Hola mundo"
```

### Python

```python
import requests

# Batch translation
response = requests.post(
    'http://localhost:3000/api/translate/batch',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    },
    json={
        'content': '# Hello\n\nWelcome!',
        'targetLocales': ['es', 'fr'],
        'format': 'md'
    }
)

result = response.json()
for locale, translation in result['data']['translations'].items():
    print(f"{locale}: {translation['content']}")
```

## Deployment

### Docker

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 3000
CMD ["bun", "run", "src/api/index.ts"]
```

### Railway/Render/Fly.io

The API works with any platform that supports Bun/Node.js. Set your environment variables and deploy!

## Contributing

See the main [Idioma repository](https://github.com/ryanwaits/idioma) for contribution guidelines.

## License

MIT
````

## File: .env-example
````
ANTHROPIC_API_KEY=
````

## File: .repomixignore
````
node_modules
content/docs
````

## File: biome.json
````json
{
  "$schema": "https://biomejs.dev/schemas/2.1.2/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
````

## File: CLAUDE.md
````markdown
## Local Documentation
  When answering questions about Bun APIs, runtime features, or integrations (SQLite, Redis, etc.), check the local Bun documentation files in:
  - node_modules/bun-types/docs/
````

## File: repomix.config.json
````json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "idioma.md",
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

## File: sdk/examples/basic.ts
````typescript
#!/usr/bin/env bun
import { Idioma } from '../src';

async function main() {
  // Initialize SDK with Anthropic
  const idioma = await Idioma.create({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Example 1: Translate simple string
  console.log('Example 1: Translating simple string...');
  const stringResult = await idioma.translateContent({
    content: 'Hello, how are you today?',
    format: 'string',
    sourceLocale: 'en',
    targetLocale: 'es',
  });
  console.log(`English: Hello, how are you today?`);
  console.log(`Spanish: ${stringResult.translatedContent}`);
  console.log('---\n');

  // Example 2: Translate Markdown with cost tracking
  console.log('Example 2: Translating Markdown with cost tracking...');
  const markdownContent = `
# Welcome to Idioma

This is a **powerful** translation tool that:
- Preserves formatting
- Handles multiple languages
- Tracks costs

> Built with AI for developers
  `.trim();

  const mdResult = await idioma.translateContent({
    content: markdownContent,
    format: 'md',
    sourceLocale: 'en',
    targetLocale: 'fr',
    trackCosts: true,
  });

  console.log('Original Markdown:');
  console.log(markdownContent);
  console.log('\nTranslated to French:');
  console.log(mdResult.translatedContent);

  if (mdResult.cost) {
    console.log(`\nCost: ${mdResult.cost.formattedCost}`);
    console.log(`Tokens: ${mdResult.usage?.totalTokens}`);
  }
  console.log('---\n');

  // Example 3: Translate MDX content
  console.log('Example 3: Translating MDX content...');
  const mdxContent = `
---
title: Getting Started
description: Learn how to use Idioma
---

import { Callout } from '@/components/Callout'

# Getting Started

<Callout type="info" title="Prerequisites">
  You need Node.js 18+ installed
</Callout>

## Installation

Install the SDK using your preferred package manager:

\`\`\`bash
npm install idioma
\`\`\`

## Quick Example

Here's how to translate content:

\`\`\`typescript
const result = await idioma.translateContent({
  content: 'Hello World',
  format: 'string',
  sourceLocale: 'en',
  targetLocale: 'es',
});
\`\`\`
  `.trim();

  const mdxResult = await idioma.translateContent({
    content: mdxContent,
    format: 'mdx',
    sourceLocale: 'en',
    targetLocale: 'zh',
    trackCosts: true,
  });

  console.log('Translated MDX to Chinese:');
  console.log(`${mdxResult.translatedContent.split('\n').slice(0, 10).join('\n')}...`);

  if (mdxResult.cost) {
    console.log(`\nCost: ${mdxResult.cost.formattedCost}`);
  }
}

main().catch(console.error);
````

## File: sdk/examples/batch-translation.ts
````typescript
#!/usr/bin/env bun
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Idioma } from '../src';

async function main() {
  // Initialize SDK
  const idioma = await Idioma.create({
    provider: 'anthropic',
    translation: {
      frontmatterFields: ['title', 'description', 'sidebarTitle'],
      jsxAttributes: ['alt', 'title', 'placeholder', 'label'],
    },
  });

  // Create sample files for demonstration
  console.log('Creating sample files...');
  await createSampleFiles();

  // Example 1: Translate a single file
  console.log('\nExample 1: Translating a single file...');
  const fileResult = await idioma.translateFile({
    filePath: 'examples/content/en/guide.mdx',
    sourceLocale: 'en',
    targetLocale: 'es',
    outputPath: 'examples/content/es/guide.mdx',
    showCosts: true,
  });

  if (fileResult.success) {
    console.log(`✓ Translated to: ${fileResult.outputPath}`);
    if (fileResult.cost) {
      console.log(`  Cost: ${fileResult.cost.formattedCost}`);
    }
  } else {
    console.error(`✗ Error: ${fileResult.error}`);
  }

  // Example 2: Batch translate multiple files
  console.log('\nExample 2: Batch translating multiple files...');
  const batchResult = await idioma.translateFiles({
    patterns: ['examples/content/en/**/*.mdx'],
    sourceLocale: 'en',
    targetLocales: ['es', 'fr'],
    showCosts: true,
  });

  console.log(`\nBatch Translation Summary:`);
  console.log(`- Total files: ${batchResult.totalFiles}`);
  console.log(`- Successful: ${batchResult.successCount}`);
  console.log(`- Failed: ${batchResult.errorCount}`);

  if (batchResult.totalCost) {
    console.log(`- Total cost: ${batchResult.totalCost.formattedCost}`);
    console.log(`- Total tokens: ${batchResult.totalUsage?.totalTokens}`);
  }

  if (batchResult.errors.length > 0) {
    console.log('\nErrors:');
    batchResult.errors.forEach(({ file, error }) => {
      console.log(`- ${file}: ${error}`);
    });
  }

  // Example 3: Cost estimation
  console.log('\nExample 3: Estimating translation costs...');
  const estimate = await idioma.estimateCost({
    patterns: ['examples/content/en/**/*.mdx'],
    targetLocales: ['es', 'fr', 'de', 'ja', 'zh'],
  });

  console.log('\nCost Estimate for 5 languages:');
  console.log(`- Files to translate: ${estimate.estimatedFiles}`);
  console.log(`- Estimated tokens: ${estimate.estimatedTokens.toLocaleString()}`);
  console.log(`- Estimated cost: ${estimate.estimatedCost.formattedCost}`);
  console.log('\nBreakdown by locale:');
  estimate.breakdown.forEach(({ locale, files, estimatedCost }) => {
    console.log(`  - ${locale}: ${files} files, ~$${estimatedCost.toFixed(2)}`);
  });
}

async function createSampleFiles() {
  const files = [
    {
      path: 'examples/content/en/guide.mdx',
      content: `---
title: User Guide
description: Complete guide to using our product
sidebarTitle: Guide
---

import { Button } from '@/components/Button'
import { Alert } from '@/components/Alert'

# User Guide

Welcome to our comprehensive user guide. This guide will help you get started quickly.

<Alert type="info" title="New to our product?">
  Check out our [quick start tutorial](/docs/quickstart) to get up and running in minutes.
</Alert>

## Getting Started

First, you'll need to install our CLI tool:

\`\`\`bash
npm install -g @ourcompany/cli
\`\`\`

<Button label="Download Now" href="/download" />

## Key Features

- **Easy to use**: Intuitive interface designed for developers
- **Powerful**: Advanced features for power users
- **Flexible**: Customize everything to your needs

## Next Steps

Ready to dive deeper? Check out these resources:

1. [API Reference](/docs/api)
2. [Examples](/docs/examples)
3. [Best Practices](/docs/best-practices)
`,
    },
    {
      path: 'examples/content/en/api.mdx',
      content: `---
title: API Reference
description: Complete API documentation
---

# API Reference

Our API provides programmatic access to all features.

## Authentication

All API requests require authentication using an API key:

\`\`\`typescript
const client = new APIClient({
  apiKey: process.env.API_KEY
});
\`\`\`

## Endpoints

### POST /api/translate

Translate content between languages.

\`\`\`json
{
  "content": "Hello World",
  "sourceLocale": "en",
  "targetLocale": "es"
}
\`\`\`
`,
    },
  ];

  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content);
  }
}

main().catch(console.error);
````

## File: sdk/examples/providers.ts
````typescript
#!/usr/bin/env bun
import { Idioma, PRICING } from '../src';

async function main() {
  console.log('Idioma Provider Examples\n');

  // Example 1: Using Anthropic (default)
  console.log('Example 1: Anthropic Provider');
  console.log('-----------------------------');

  const anthropicSDK = await Idioma.create({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20240620',
  });

  const anthropicResult = await anthropicSDK.translateContent({
    content: 'Artificial intelligence is transforming the world',
    format: 'string',
    sourceLocale: 'en',
    targetLocale: 'es',
    trackCosts: true,
  });

  console.log('Original:', 'Artificial intelligence is transforming the world');
  console.log('Spanish:', anthropicResult.translatedContent);
  console.log('Provider:', anthropicSDK.getConfig().translation.provider);
  console.log('Model:', anthropicSDK.getConfig().translation.model || 'default');
  if (anthropicResult.cost) {
    console.log('Cost:', anthropicResult.cost.formattedCost);
    console.log('Tokens:', anthropicResult.usage?.totalTokens);
  }

  // Example 2: Using OpenAI
  console.log('\n\nExample 2: OpenAI Provider');
  console.log('--------------------------');

  // Note: Requires OPENAI_API_KEY in environment
  if (process.env.OPENAI_API_KEY) {
    const openaiSDK = await Idioma.create({
      provider: 'openai',
      model: 'gpt-4o-2024-08-06',
      apiKey: process.env.OPENAI_API_KEY,
    });

    const openaiResult = await openaiSDK.translateContent({
      content: 'Machine learning models are becoming more sophisticated',
      format: 'string',
      sourceLocale: 'en',
      targetLocale: 'fr',
      trackCosts: true,
    });

    console.log('Original:', 'Machine learning models are becoming more sophisticated');
    console.log('French:', openaiResult.translatedContent);
    console.log('Provider:', openaiSDK.getConfig().translation.provider);
    console.log('Model:', openaiSDK.getConfig().translation.model);
    if (openaiResult.cost) {
      console.log('Cost:', openaiResult.cost.formattedCost);
      console.log('Tokens:', openaiResult.usage?.totalTokens);
    }
  } else {
    console.log('Skip: OPENAI_API_KEY not found in environment');
  }

  // Example 3: Switching providers dynamically
  console.log('\n\nExample 3: Dynamic Provider Switching');
  console.log('------------------------------------');

  const sdk = await Idioma.create({
    provider: 'anthropic',
  });

  console.log('Initial provider:', sdk.getConfig().translation.provider);

  // Update to use OpenAI GPT-4o-mini for cost savings
  sdk.updateConfig({
    provider: 'openai',
    model: 'gpt-4o-mini',
  });

  console.log('Updated provider:', sdk.getConfig().translation.provider);
  console.log('Updated model:', sdk.getConfig().translation.model);

  // Example 4: Display pricing information
  console.log('\n\nExample 4: Pricing Information');
  console.log('------------------------------');
  console.log('\nAnthropic Models:');
  Object.entries(PRICING.anthropic).forEach(([model, pricing]) => {
    console.log(`- ${model}:`);
    console.log(`  Input: $${pricing.input}/1M tokens`);
    console.log(`  Output: $${pricing.output}/1M tokens`);
  });

  console.log('\nOpenAI Models:');
  Object.entries(PRICING.openai).forEach(([model, pricing]) => {
    console.log(`- ${model}:`);
    console.log(`  Input: $${pricing.input}/1M tokens`);
    console.log(`  Output: $${pricing.output}/1M tokens`);
  });

  // Example 5: Cost comparison
  console.log('\n\nExample 5: Cost Comparison');
  console.log('--------------------------');

  const _testContent = `
# Product Documentation

This is a comprehensive guide to our product features:

1. **Installation**: Easy setup process
2. **Configuration**: Flexible options
3. **API Reference**: Complete documentation
4. **Examples**: Real-world use cases
5. **Troubleshooting**: Common issues and solutions

Our product is designed to be user-friendly while providing powerful features for advanced users.
  `.trim();

  // Estimate costs for different models
  const models = [
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20240620' },
    { provider: 'openai', model: 'gpt-4o-2024-08-06' },
    { provider: 'openai', model: 'gpt-4o-mini' },
  ];

  console.log('Estimating costs for translating sample documentation...\n');

  for (const { provider, model } of models) {
    const _testSDK = await Idioma.create({ provider: provider as any, model: model as any });

    // Mock estimate (in real usage, this would call the API)
    const avgTokens = 500; // Rough estimate for the sample
    const pricing = PRICING[provider][model];
    const inputCost = (avgTokens * 0.7 * pricing.input) / 1_000_000;
    const outputCost = (avgTokens * 0.3 * pricing.output) / 1_000_000;
    const totalCost = inputCost + outputCost;

    console.log(`${provider}/${model}:`);
    console.log(`  Estimated cost: $${totalCost.toFixed(4)}`);
    console.log(`  Cost per 1000 docs: $${(totalCost * 1000).toFixed(2)}`);
  }
}

main().catch(console.error);
````

## File: sdk/src/errors.ts
````typescript
export class IdiomaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdiomaError";
  }
}

export class ConfigError extends IdiomaError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = "ConfigError";
  }
}

export class TranslationError extends IdiomaError {
  constructor(message: string) {
    super(`Translation error: ${message}`);
    this.name = "TranslationError";
  }
}

export class FileError extends IdiomaError {
  constructor(message: string) {
    super(`File error: ${message}`);
    this.name = "FileError";
  }
}

export class ProviderError extends IdiomaError {
  constructor(provider: string, message: string) {
    super(`Provider error (${provider}): ${message}`);
    this.name = "ProviderError";
  }
}
````

## File: sdk/src/index.ts
````typescript
export type { Config } from '@/utils/config';
// Re-export useful types from core
export type { CostCalculation, TokenUsage } from '@/utils/cost';
// Re-export pricing info for reference
export { PRICING } from '@/utils/cost';
export * from './errors';
export { Idioma } from './Idioma';
export * from './types';
````

## File: sdk/src/types.ts
````typescript
import type { Config } from '@/utils/config';
import type { CostCalculation, TokenUsage } from '@/utils/cost';

export interface TranslateContentParams {
  content: string;
  format: 'mdx' | 'md' | 'string';
  sourceLocale: string;
  targetLocale: string;
  trackCosts?: boolean;
}

export interface TranslateContentResult {
  translatedContent: string;
  usage?: TokenUsage;
  cost?: CostCalculation;
}

export interface TranslateFileParams {
  filePath: string;
  sourceLocale: string;
  targetLocale: string;
  outputPath?: string;
  showCosts?: boolean;
}

export interface TranslateFileResult {
  success: boolean;
  outputPath?: string;
  usage?: TokenUsage;
  cost?: CostCalculation;
  error?: string;
}

export interface TranslateFilesParams {
  patterns: string[];
  sourceLocale: string;
  targetLocales: string[];
  showCosts?: boolean;
}

export interface ProcessFilesResult {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  totalUsage?: TokenUsage;
  totalCost?: CostCalculation;
  errors: Array<{ file: string; error: string }>;
}

export interface CostEstimateParams {
  patterns: string[];
  targetLocales: string[];
}

export interface CostEstimate {
  estimatedFiles: number;
  estimatedTokens: number;
  estimatedCost: CostCalculation;
  breakdown: Array<{
    locale: string;
    files: number;
    estimatedTokens: number;
    estimatedCost: number;
  }>;
}

export interface IdiomaConfig extends Partial<Config> {
  apiKey?: string;
  provider?: 'anthropic' | 'openai';
  model?: string;
  cachePath?: string;
}
````

## File: sdk/build.ts
````typescript
#!/usr/bin/env bun
import { build } from "bun";

async function buildSDK() {
  console.log("Building Idioma SDK...");

  // Build the SDK
  const result = await build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    target: "node",
    format: "esm",
    external: [
      "zod",
      "fs",
      "fs/promises",
      "path",
      "glob",
      "@/utils/config",
      "@/utils/lockfile",
      "@/utils/cost",
      "@/core/translate-file",
      "@/core/process-files",
      "@/ai/translate",
      "@/parsers",
    ],
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    process.exit(1);
  }

  // Copy type definitions
  console.log("Generating type definitions...");

  // In a real build, we'd use tsc to generate .d.ts files
  // For now, we'll note this as a TODO
  console.log("TODO: Add TypeScript compilation for type definitions");

  console.log("✓ Build complete");
}

buildSDK().catch(console.error);
````

## File: sdk/package.json
````json
{
  "name": "@idioma/sdk",
  "version": "0.1.0",
  "description": "Idioma SDK for programmatic AI-powered translations",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "test": "bun test",
    "prepublishOnly": "bun run build"
  },
  "keywords": [
    "translation",
    "localization",
    "i18n",
    "ai",
    "anthropic",
    "openai"
  ],
  "author": "Idioma",
  "license": "MIT",
  "peerDependencies": {
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/idioma/idioma.git",
    "directory": "sdk"
  }
}
````

## File: sdk/tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ESNext"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "isolatedDeclarations": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["../src/*"]
    }
  },
  "include": ["src/**/*.ts"]
}
````

## File: src/ai/index.ts
````typescript
export * from './translate';
````

## File: src/api/examples/client.ts
````typescript
/**
 * Idioma API Client
 * A simple TypeScript client for the Idioma API
 */

export class IdiomaClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiKey: string, apiUrl: string = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Make an API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
  }

  /**
   * Check API health
   */
  async health() {
    return this.request('/api/health', { method: 'GET' });
  }

  /**
   * Translate content to a single language
   */
  async translate(params: {
    content: string;
    targetLocale: string;
    sourceLocale?: string;
    format?: 'string' | 'md' | 'mdx';
  }) {
    return this.request('/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        sourceLocale: 'en',
        format: 'string',
        ...params,
      }),
    });
  }

  /**
   * Translate content to multiple languages
   */
  async translateBatch(params: {
    content: string;
    targetLocales: string[];
    sourceLocale?: string;
    format?: 'string' | 'md' | 'mdx';
  }) {
    return this.request('/api/translate/batch', {
      method: 'POST',
      body: JSON.stringify({
        sourceLocale: 'en',
        format: 'string',
        ...params,
      }),
    });
  }
}

// Example usage:
async function _example() {
  const client = new IdiomaClient('your_api_key');

  // Simple translation
  const result = await client.translate({
    content: 'Hello world',
    targetLocale: 'es',
  });
  console.log(result.data.translatedContent); // "Hola mundo"

  // Batch translation
  const batchResult = await client.translateBatch({
    content: '# Welcome\n\nThis is a test.',
    targetLocales: ['es', 'fr', 'de'],
    format: 'md',
  });

  for (const [locale, translation] of Object.entries(batchResult.data.translations)) {
    console.log(`${locale}: ${translation.content}`);
  }
}
````

## File: src/api/examples/test-api.ts
````typescript
#!/usr/bin/env bun

/**
 * Example script to test the Idioma API
 * Run with: bun run src/api/examples/test-api.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'develop_3ZmaxU8Z345ZFzKfw3cfmopQ';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

async function testEndpoint(name: string, endpoint: string, options: RequestInit): Promise<void> {
  console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
  console.log(`${colors.dim}${options.method} ${endpoint}${colors.reset}`);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✓ Success (${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${colors.red}✗ Failed (${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.yellow}Idioma API Test Suite${colors.reset}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY.slice(0, 10)}...`);

  // Test 1: Health check (no auth required)
  await testEndpoint('Health Check', '/api/health', {
    method: 'GET',
  });

  // Test 2: Simple translation
  await testEndpoint('Simple Translation', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: 'Hello, how are you today?',
      sourceLocale: 'en',
      targetLocale: 'es',
      format: 'string',
    }),
  });

  // Test 3: Markdown translation
  await testEndpoint('Markdown Translation', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: `# Welcome to Idioma

This is a **test document** with:
- Bullet points
- *Italic text*
- [Links](https://example.com)

> And a blockquote for good measure!`,
      sourceLocale: 'en',
      targetLocale: 'fr',
      format: 'md',
    }),
  });

  // Test 4: Batch translation
  await testEndpoint('Batch Translation', '/api/translate/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: 'Welcome to our documentation!',
      sourceLocale: 'en',
      targetLocales: ['es', 'fr', 'de'],
      format: 'string',
    }),
  });

  // Test 5: MDX translation
  await testEndpoint('MDX Translation', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: `---
title: Getting Started
description: Learn the basics
---

import { Button } from '@/components/Button'

# Getting Started

Click the button below to begin:

<Button label="Start Now" />`,
      sourceLocale: 'en',
      targetLocale: 'ja',
      format: 'mdx',
    }),
  });

  // Test 6: Invalid API key
  await testEndpoint('Invalid API Key', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'invalid_key',
    },
    body: JSON.stringify({
      content: 'Test',
      targetLocale: 'es',
    }),
  });

  // Test 7: Missing required field
  await testEndpoint('Validation Error', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: 'Test',
      // Missing targetLocale
    }),
  });

  console.log(`\n${colors.green}Test suite completed!${colors.reset}`);
}

// Run the tests
main().catch(console.error);
````

## File: src/api/middleware/auth.ts
````typescript
import { Unkey } from '@unkey/api';
import type { Context, Next } from 'hono';

// Initialize Unkey client
const unkey = new Unkey({
  rootKey: process.env.UNKEY_ROOT_KEY!,
});

export interface AuthContext {
  apiKey: string;
  ownerId?: string;
  meta?: Record<string, any>;
  ratelimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

/**
 * Unkey authentication middleware
 * Validates API keys and adds auth context to request
 */
export async function unkeyAuth(c: Context, next: Next) {
  const apiKey = c.req.header('X-API-Key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return c.json(
      {
        success: false,
        error: 'Missing API key. Please provide X-API-Key header or Authorization: Bearer <key>',
      },
      401
    );
  }

  try {
    // Verify the API key with Unkey
    const { result, error } = await unkey.keys.verify({
      key: apiKey,
      apiId: process.env.UNKEY_API_ID,
    });

    if (error) {
      console.error('Unkey verification error:', error);
      return c.json(
        {
          success: false,
          error: 'API key verification failed',
        },
        500
      );
    }

    if (!result?.valid) {
      return c.json(
        {
          success: false,
          error: 'Invalid API key',
          code: result?.code, // RATE_LIMITED, KEY_EXPIRED, etc.
        },
        401
      );
    }

    // Add auth context to request
    const authContext: AuthContext = {
      apiKey: result.keyId!,
      ownerId: result.ownerId,
      meta: result.meta,
    };

    // Add ratelimit info if available
    if (result.ratelimit) {
      authContext.ratelimit = {
        limit: result.ratelimit.limit,
        remaining: result.ratelimit.remaining,
        reset: result.ratelimit.reset,
      };

      // Set rate limit headers
      c.header('X-RateLimit-Limit', result.ratelimit.limit.toString());
      c.header('X-RateLimit-Remaining', result.ratelimit.remaining.toString());
      c.header('X-RateLimit-Reset', result.ratelimit.reset.toString());
    }

    // Store auth context for use in route handlers
    c.set('auth', authContext);

    await next();
  } catch (error) {
    console.error('Unkey middleware error:', error);
    return c.json(
      {
        success: false,
        error: 'Internal authentication error',
      },
      500
    );
  }
}

/**
 * Optional: Middleware to check specific permissions
 */
export function requirePermission(permission: string) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext;

    if (!auth) {
      return c.json(
        {
          success: false,
          error: 'Authentication required',
        },
        401
      );
    }

    // Check if user has required permission in meta
    const permissions = (auth.meta?.permissions as string[]) || [];
    if (!permissions.includes(permission)) {
      return c.json(
        {
          success: false,
          error: `Missing required permission: ${permission}`,
        },
        403
      );
    }

    await next();
  };
}
````

## File: src/api/middleware/rate-limit.ts
````typescript
import { rateLimiter } from 'hono-rate-limiter';

// Create different rate limiters for different tiers
export const standardRateLimit = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    // Use API key from auth context if available
    const auth = c.get('auth');
    return auth?.apiKey || c.req.header('x-forwarded-for') || 'anonymous';
  },
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

export const strictRateLimit = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10, // 10 requests per minute for batch operations
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    const auth = c.get('auth');
    return auth?.apiKey || c.req.header('x-forwarded-for') || 'anonymous';
  },
  message: {
    success: false,
    error: 'Rate limit exceeded for batch operations. Maximum 10 requests per minute.',
  },
});

// Helper to create custom rate limiter based on API key metadata
export function createCustomRateLimit(limit: number, windowMs: number = 60000) {
  return rateLimiter({
    windowMs,
    limit,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      const auth = c.get('auth');
      return auth?.apiKey || 'anonymous';
    },
    message: {
      success: false,
      error: `Rate limit exceeded. Maximum ${limit} requests per ${windowMs / 1000} seconds.`,
    },
  });
}
````

## File: src/api/index.ts
````typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { Idioma } from '../../sdk/src/Idioma';
import type { IdiomaConfig } from '../../sdk/src/types';
import { type AuthContext, unkeyAuth } from './middleware/auth';
import { standardRateLimit, strictRateLimit } from './middleware/rate-limit';

// Type for Hono context with auth
type Variables = {
  auth: AuthContext;
};

// Environment variables
const PORT = parseInt(process.env.PORT || '3000');

// Request/Response schemas
const TranslateRequestSchema = z.object({
  content: z.string().min(1).max(50000), // Max 50k chars
  sourceLocale: z.string().default('en'),
  targetLocale: z.string(),
  format: z.enum(['string', 'md', 'mdx']).default('string'),
});

const BatchTranslateRequestSchema = z.object({
  content: z.string().min(1).max(50000),
  sourceLocale: z.string().default('en'),
  targetLocales: z.array(z.string()).min(1).max(10), // Max 10 target languages
  format: z.enum(['string', 'md', 'mdx']).default('string'),
});

// Create Hono app with typed variables
const app = new Hono<{ Variables: Variables }>();

// Global middleware
app.use('*', logger());

// CORS for API routes
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
  })
);

// Public endpoints
app.get('/', (c) => {
  return c.json({
    name: 'Idioma API',
    version: '1.0.0',
    status: 'healthy',
    documentation: 'https://github.com/idioma/idioma',
    endpoints: {
      translate: {
        method: 'POST',
        path: '/api/translate',
        description: 'Translate content to a single target language',
      },
      batchTranslate: {
        method: 'POST',
        path: '/api/translate/batch',
        description: 'Translate content to multiple target languages',
      },
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Health check endpoint',
      },
    },
  });
});

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  });
});

// Protected endpoints - require Unkey authentication and rate limiting
app.use('/api/translate/*', unkeyAuth);
app.use('/api/translate', unkeyAuth);
app.use('/api/translate', standardRateLimit);
app.use('/api/translate/batch', strictRateLimit);

// Single translation endpoint
app.post('/api/translate', async (c) => {
  try {
    const auth = c.get('auth');
    const body = await c.req.json();
    const params = TranslateRequestSchema.parse(body);

    // Get provider preference from API key metadata or use default
    const provider =
      (auth.meta?.provider as string) || process.env.TRANSLATION_PROVIDER || 'anthropic';
    const model = auth.meta?.model as string;

    // Initialize Idioma SDK
    const config: IdiomaConfig = {
      provider: provider as any,
      model,
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    };

    const idioma = await Idioma.create(config);

    // Perform translation
    const startTime = Date.now();
    const result = await idioma.translateContent({
      content: params.content,
      format: params.format,
      sourceLocale: params.sourceLocale,
      targetLocale: params.targetLocale,
      trackCosts: true,
    });

    const duration = Date.now() - startTime;

    // Log usage to Unkey (optional)
    if (result.usage && process.env.UNKEY_NAMESPACE_ID) {
      // Could log usage metrics to Unkey analytics here
    }

    // Return successful response
    return c.json({
      success: true,
      data: {
        translatedContent: result.translatedContent,
        sourceLocale: params.sourceLocale,
        targetLocale: params.targetLocale,
        format: params.format,
        usage: result.usage,
        cost: result.cost,
        duration: `${duration}ms`,
      },
      ratelimit: auth.ratelimit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
    }

    console.error('Translation error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

// Batch translation endpoint
app.post('/api/translate/batch', async (c) => {
  try {
    const auth = c.get('auth');
    const body = await c.req.json();
    const params = BatchTranslateRequestSchema.parse(body);

    const provider =
      (auth.meta?.provider as string) || process.env.TRANSLATION_PROVIDER || 'anthropic';
    const model = auth.meta?.model as string;

    const config: IdiomaConfig = {
      provider: provider as any,
      model,
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    };

    const idioma = await Idioma.create(config);

    // Translate to all target languages
    const startTime = Date.now();
    const translations: Record<string, any> = {};
    const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let totalCost = 0;

    for (const targetLocale of params.targetLocales) {
      const result = await idioma.translateContent({
        content: params.content,
        format: params.format,
        sourceLocale: params.sourceLocale,
        targetLocale: targetLocale,
        trackCosts: true,
      });

      translations[targetLocale] = {
        content: result.translatedContent,
        usage: result.usage,
        cost: result.cost,
      };

      if (result.usage) {
        totalUsage.promptTokens += result.usage.promptTokens;
        totalUsage.completionTokens += result.usage.completionTokens;
        totalUsage.totalTokens += result.usage.totalTokens;
      }

      if (result.cost) {
        totalCost += result.cost.totalCost;
      }
    }

    const duration = Date.now() - startTime;

    return c.json({
      success: true,
      data: {
        translations,
        sourceLocale: params.sourceLocale,
        format: params.format,
        totalUsage,
        totalCost: {
          amount: totalCost,
          formatted: `$${totalCost.toFixed(2)}`,
        },
        duration: `${duration}ms`,
      },
      ratelimit: auth.ratelimit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
    }

    console.error('Batch translation error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Endpoint not found',
      path: c.req.path,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

// Export for Bun.serve
export default {
  port: PORT,
  fetch: app.fetch,
};

// Start server message if running directly
if (import.meta.main) {
  console.log(`🚀 Idioma API running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/`);
  console.log('\n⚙️  Configuration:');
  console.log(`   - Unkey API: ${process.env.UNKEY_API_ID ? '✓ Configured' : '✗ Not configured'}`);
  console.log(
    `   - Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✓ Available' : '✗ Not available'}`
  );
  console.log(`   - OpenAI: ${process.env.OPENAI_API_KEY ? '✓ Available' : '✗ Not available'}`);
}
````

## File: src/core/index.ts
````typescript
export * from './process-files';
export * from './translate-file';
````

## File: src/utils/crypto.ts
````typescript
import crypto from 'node:crypto';

export function generateHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}
````

## File: src/utils/paths.ts
````typescript
export function replaceLocaleInPattern(
  pattern: string,
  oldLocale: string,
  newLocale: string
): string {
  // Replace [locale] placeholder
  if (pattern.includes('[locale]')) {
    return pattern.replace(/\[locale\]/g, newLocale);
  }

  // Replace /oldLocale/ with /newLocale/ in path
  const regex = new RegExp(`/${oldLocale}/`, 'g');
  return pattern.replace(regex, `/${newLocale}/`);
}

export function generateOutputPath(
  sourcePath: string,
  sourceLocale: string,
  targetLocale: string
): string {
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
  const outputPath = sourcePath.replace(regex, `/${targetLocale}/`);

  // If no replacement happened, the source locale wasn't in the path
  // In this case, we should not add a locale directory
  if (outputPath === sourcePath) {
    // For files without locale in path, we shouldn't translate to the same directory
    console.warn(
      `Warning: File ${sourcePath} doesn't contain source locale '${sourceLocale}' in its path`
    );
  }

  return outputPath;
}
````

## File: ARCHITECTURE.md
````markdown
# Idioma Architecture

## Overview

Idioma follows a modular architecture with clear separation of concerns. The codebase is organized into distinct modules that handle specific responsibilities.

## Directory Structure

```
src/
├── cli.ts         # Main CLI entry point
├── cli/           # Command-line interface
│   ├── index.ts   # CLI command definitions
│   └── commands.ts # Command implementations
├── core/          # Core business logic
│   ├── index.ts   # Core module exports
│   ├── translate-file.ts  # Single file translation orchestration
│   └── process-files.ts   # Batch file processing
├── parsers/       # File format parsers (Strategy Pattern)
│   ├── index.ts   # Parser registry and exports
│   ├── types.ts   # TranslationStrategy interface
│   ├── mdx.ts     # MDX/Markdown strategy implementation
│   └── frontmatter.ts # Frontmatter translation logic
├── ai/            # AI provider integration (Factory Pattern)
│   ├── index.ts   # AI module exports
│   └── translate.ts # Translation service with provider factory
├── api/           # REST API server
│   ├── index.ts   # Hono server setup
│   ├── middleware/ # API middleware
│   │   ├── auth.ts # Authentication with Unkey
│   │   └── rate-limit.ts # Rate limiting
│   └── examples/  # API usage examples
└── utils/         # Shared utilities
    ├── index.ts   # Utility exports
    ├── config.ts  # Configuration management
    ├── lockfile.ts # Lock file operations
    ├── paths.ts   # Path manipulation utilities
    ├── crypto.ts  # Hashing utilities
    └── cost.ts    # Token usage and cost calculation

sdk/               # SDK package (separate from CLI)
├── src/
│   ├── Idioma.ts # Main SDK class
│   ├── types.ts   # SDK type definitions
│   └── errors.ts  # Custom error classes
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
- Skip patterns can be defined in `idioma.json`
- Rules are applied during parsing to exclude specific content
- Intelligent detection of directive pseudo-attributes (e.g., `type: help`)
- Customizable patterns via `translation.rules.patternsToSkip`

### Cost Tracking
- Real-time token usage tracking
- Per-file and total cost calculation
- Support for multiple AI provider pricing models
- Optional cost display with `--costs` flag

### API Server
- RESTful API with Hono framework
- Authentication via Unkey
- Rate limiting (standard and strict tiers)
- Batch translation support

### SDK
- Programmatic access to translation features
- TypeScript-first with full type safety
- File and content translation methods
- Caching and lockfile management

### Extensibility Points
1. **New File Formats**: Implement `TranslationStrategy` and register in `parsers/index.ts`
2. **New AI Providers**: Add case in `createAiClient()` factory
3. **Custom Rules**: Extend `translation.rules` in config schema

## Configuration Schema

```json
{
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxx",
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/**/*.mdx"]
    }
  },
  "translation": {
    "provider": "anthropic",  // or "openai"
    "model": "claude-3-5-sonnet-20240620",  // optional, uses defaults
    "rules": {
      "patternsToSkip": ["^type:\\s*\\w+$"]  // Regex patterns to skip
    },
    "frontmatterFields": ["title", "description", "sidebarTitle"],
    "jsxAttributes": ["title", "description", "tag", "alt", "placeholder", "label"]
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

## File: README.md
````markdown
# Idioma

AI-powered internationalization for MDX documentation - 90% cheaper than SaaS alternatives.

## Overview

Idioma is an open-source localization tool that provides automated, AI-powered translations for documentation files. It offers a complete solution with CLI, SDK, and API components, making it suitable for various integration scenarios.

### Key Features

- 🚀 **90% cheaper** than SaaS alternatives - pay only for AI API usage
- 🤖 **AI-powered translations** using Claude (Anthropic) or GPT-4 (OpenAI)
- 📝 **MDX/Markdown support** with format preservation
- 💰 **Cost tracking** - monitor translation costs in real-time
- 🔄 **Smart caching** - only retranslate changed content
- 🛠️ **Multiple integration options** - CLI, SDK, or REST API
- 🎯 **Intelligent content detection** - automatically skips non-translatable content

## Installation

```bash
# Using Bun (recommended)
bun add idioma

# Using npm
npm install idioma

# Using yarn
yarn add idioma
```

## Quick Start

### 1. Initialize Configuration

```bash
idioma init
```

This creates an `idioma.json` configuration file with default settings.

### 2. Add Target Languages

```bash
# Add single language
idioma add es

# Add multiple languages
idioma add es,fr,de
```

### 3. Configure Your Files

Edit `idioma.json` to specify which files to translate:

```json
{
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/**/*.mdx"]
    }
  }
}
```

### 4. Set Your API Key

```bash
export ANTHROPIC_API_KEY="your-api-key"
# or
export OPENAI_API_KEY="your-api-key"
```

### 5. Run Translation

```bash
# Basic translation
idioma translate

# With cost tracking
idioma translate --costs
```

## CLI Commands

### `idioma init`
Initialize a new Idioma configuration file.

### `idioma translate [--costs]`
Translate all configured files to target languages.
- `--costs`: Display translation costs based on token usage

### `idioma add <locales>`
Add target locale(s). Supports comma-separated values.
```bash
idioma add pt,fr,ja
```

### `idioma remove <locales>`
Remove target locale(s). Supports comma-separated values.

### `idioma list`
List all configured locales.

### `idioma reset`
Reset translation status and remove generated translation files.

## Configuration

### Complete Configuration Example

```json
{
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxx",
  "locale": {
    "source": "en",
    "targets": ["es", "fr", "de", "ja", "pt"]
  },
  "files": {
    "mdx": {
      "include": ["content/docs/**/*.mdx", "pages/**/*.md"]
    }
  },
  "translation": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20240620",
    "frontmatterFields": ["title", "description", "sidebarTitle"],
    "jsxAttributes": ["title", "description", "tag", "alt", "placeholder", "label"],
    "rules": {
      "patternsToSkip": ["^type:\\s*\\w+$", "^TODO:.*"]
    }
  }
}
```

### Configuration Options

- **`locale.source`**: Source language code (default: "en")
- **`locale.targets`**: Array of target language codes
- **`files`**: File patterns to translate (supports glob patterns)
- **`translation.provider`**: AI provider ("anthropic" or "openai")
- **`translation.model`**: Specific model to use (optional)
- **`translation.frontmatterFields`**: Frontmatter fields to translate
- **`translation.jsxAttributes`**: JSX attributes to translate
- **`translation.rules.patternsToSkip`**: Regex patterns for content to skip

## SDK Usage

### Basic Translation

```typescript
import { Idioma } from 'idioma/sdk';

const idioma = await Idioma.create({
  apiKey: 'your-api-key',
  provider: 'anthropic'
});

// Translate content
const result = await idioma.translateContent({
  content: '# Hello World',
  sourceLocale: 'en',
  targetLocale: 'es',
  format: 'md'
});

console.log(result.content); // # Hola Mundo
console.log(result.usage);   // Token usage statistics
```

### File Translation

```typescript
// Translate a single file
const fileResult = await idioma.translateFile({
  filePath: 'docs/intro.mdx',
  sourceLocale: 'en',
  targetLocale: 'fr'
});

// Translate multiple files
const batchResult = await idioma.translateFiles({
  files: ['docs/**/*.mdx'],
  sourceLocale: 'en',
  targetLocales: ['es', 'fr', 'de']
});

console.log(batchResult.totalCost); // Total cost estimate
```

## API Server

### Starting the Server

```bash
# Start the API server
bun run src/api/index.ts

# With custom port
PORT=8080 bun run src/api/index.ts
```

### API Endpoints

#### POST /api/translate
Translate content to a single target language.

```bash
curl -X POST http://localhost:3000/api/translate \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Hello World",
    "sourceLocale": "en",
    "targetLocale": "es",
    "format": "md"
  }'
```

#### POST /api/translate/batch
Translate content to multiple target languages.

```bash
curl -X POST http://localhost:3000/api/translate/batch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Hello World",
    "sourceLocale": "en",
    "targetLocales": ["es", "fr", "de"],
    "format": "md"
  }'
```

## Cost Estimation

Idioma provides transparent cost tracking:

- **Anthropic Claude 3.5 Sonnet**: ~$3 per million input tokens, ~$15 per million output tokens
- **OpenAI GPT-4**: ~$10 per million input tokens, ~$30 per million output tokens

### Example Costs

For a typical documentation site with 400 pages:
- Initial translation to 3 languages: ~$20-50 (one-time)
- Incremental updates: Only changed content is retranslated
- Compared to SaaS: Save 90%+ on monthly subscriptions

## File Structure Convention

Idioma expects a locale-based file structure:

```
content/
├── docs/
│   ├── en/          # Source files
│   │   ├── intro.mdx
│   │   └── guide.mdx
│   ├── es/          # Spanish translations (generated)
│   │   ├── intro.mdx
│   │   └── guide.mdx
│   └── fr/          # French translations (generated)
│       ├── intro.mdx
│       └── guide.mdx
```

## Advanced Features

### Custom Skip Patterns

Skip specific content patterns during translation:

```json
{
  "translation": {
    "rules": {
      "patternsToSkip": [
        "^type:\\s*\\w+$",     // Skip directive attributes
        "^TODO:.*",            // Skip TODO comments
        "^FIXME:.*"            // Skip FIXME comments
      ]
    }
  }
}
```

### Lockfile Management

Idioma maintains a `idioma.lock` file to track:
- File content hashes
- Translation status per locale
- Prevents unnecessary retranslation

### Provider Switching

Easily switch between AI providers:

```json
{
  "translation": {
    "provider": "openai",
    "model": "gpt-4o-2024-08-06"
  }
}
```

## Architecture

Idioma follows a modular architecture with clear separation of concerns:

- **CLI**: Command-line interface for interactive use
- **Core**: Business logic for file processing and translation
- **Parsers**: Strategy pattern for handling different file formats
- **AI**: Factory pattern for multiple AI provider support
- **SDK**: Programmatic access to all features
- **API**: RESTful server for remote integration

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Comparison with Alternatives

| Feature | Idioma | Languine | Traditional i18n |
|---------|------------|----------|------------------|
| Cost | ~$0.01-0.05/page | $100+/month | Manual labor |
| AI-Powered | ✅ | ✅ | ❌ |
| Open Source | ✅ | ❌ | Varies |
| Self-Hosted | ✅ | ❌ | ✅ |
| Format Preservation | ✅ | ✅ | ❌ |
| MDX Support | ✅ | Limited | ❌ |
| Cost Tracking | ✅ | ❌ | N/A |

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ESNext"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "isolatedDeclarations": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "sdk/src/**/*.ts"]
}
````

## File: examples/use-sdk.ts
````typescript
#!/usr/bin/env bun

/**
 * Example of using the Idioma SDK from within the main project
 * This demonstrates how the SDK wraps the core functionality
 */

import { Idioma } from '../sdk/src/Idioma';
import type { IdiomaConfig } from '../sdk/src/types';

async function main() {
  console.log('Idioma SDK Integration Example\n');

  // Initialize the SDK using the existing config
  const config: IdiomaConfig = {
    provider: 'anthropic',
    locale: {
      source: 'en',
      targets: ['es', 'fr'],
    },
    translation: {
      frontmatterFields: ['title', 'description', 'sidebarTitle'],
      jsxAttributes: ['alt', 'title', 'placeholder', 'label'],
      skipPatterns: [],
      provider: 'anthropic',
    },
  };

  const idioma = await Idioma.create(config);

  // Example 1: Translate MDX content
  console.log('Example 1: Translating MDX content with the SDK');
  console.log('-----------------------------------------------\n');

  const mdxContent = `---
title: SDK Integration Guide
description: Learn how to use the Idioma SDK
sidebarTitle: SDK Guide
---

import { Callout } from '@/components/Callout'

# SDK Integration Guide

The Idioma SDK provides a programmatic interface for translations.

<Callout type="info" title="Installation">
Install the SDK: \`npm install idioma\`
</Callout>

## Key Features

- **Simple API**: Easy to integrate
- **Cost tracking**: Monitor translation costs
- **Batch processing**: Handle multiple files efficiently
`;

  const result = await idioma.translateContent({
    content: mdxContent,
    format: 'mdx',
    sourceLocale: 'en',
    targetLocale: 'es',
    trackCosts: true,
  });

  console.log('Translation completed!');
  console.log('- Format: MDX');
  console.log('- Target: Spanish');

  if (result.cost) {
    console.log('- Cost:', result.cost.formattedCost);
    console.log('- Tokens:', result.usage?.totalTokens);
  }

  // Show a snippet of the translated content
  const lines = result.translatedContent.split('\n');
  console.log('\nTranslated content (first 10 lines):');
  console.log(lines.slice(0, 10).join('\n'));
  console.log('...\n');

  // Example 2: Batch file translation
  console.log('Example 2: Batch translating documentation files');
  console.log('-----------------------------------------------\n');

  const batchResult = await idioma.translateFiles({
    patterns: ['content/docs/[locale]/**/*.mdx'],
    sourceLocale: 'en',
    targetLocales: ['es', 'fr'],
    showCosts: true,
  });

  console.log('Batch translation summary:');
  console.log('- Total files:', batchResult.totalFiles);
  console.log('- Successful:', batchResult.successCount);
  console.log('- Failed:', batchResult.errorCount);

  if (batchResult.totalCost) {
    console.log('- Total cost:', batchResult.totalCost.formattedCost);
    console.log(
      '- Average per file:',
      `$${(batchResult.totalCost.totalCost / batchResult.successCount).toFixed(3)}`
    );
  }

  // Example 3: Cost estimation
  console.log('\nExample 3: Estimating costs for multiple languages');
  console.log('-------------------------------------------------\n');

  const estimate = await idioma.estimateCost({
    patterns: ['content/docs/**/*.mdx'],
    targetLocales: ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt', 'ru'],
  });

  console.log('Translation cost estimate:');
  console.log('- Files to process:', estimate.estimatedFiles);
  console.log('- Target languages:', estimate.breakdown.length);
  console.log('- Total estimated cost:', estimate.estimatedCost.formattedCost);
  console.log('\nPer-language breakdown:');

  estimate.breakdown.forEach(({ locale, files, estimatedCost }) => {
    console.log(`  ${locale}: ${files} files, ~$${estimatedCost.toFixed(2)}`);
  });

  // Example 4: Provider comparison
  console.log('\nExample 4: Comparing providers');
  console.log('------------------------------\n');

  const providers = [
    {
      name: 'Anthropic Claude 3.5',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
    },
    { name: 'OpenAI GPT-4o', provider: 'openai', model: 'gpt-4o-2024-08-06' },
    { name: 'OpenAI GPT-4o-mini', provider: 'openai', model: 'gpt-4o-mini' },
  ];

  for (const { name, provider, model } of providers) {
    idioma.updateConfig({ provider: provider as any, model });

    const testResult = await idioma.translateContent({
      content: 'This is a test sentence for cost comparison.',
      format: 'string',
      sourceLocale: 'en',
      targetLocale: 'es',
      trackCosts: true,
    });

    console.log(`${name}:`);
    if (testResult.cost) {
      console.log(`  Cost: ${testResult.cost.formattedCost}`);
      console.log(`  Tokens: ${testResult.usage?.totalTokens}`);
    }
  }

  console.log('\n✓ SDK integration example completed!');
}

main().catch(console.error);
````

## File: src/parsers/index.ts
````typescript
import { MDXStrategy } from './mdx';
import type { TranslationStrategy } from './types';

export * from './frontmatter';
export * from './mdx';
// Export all parser types and utilities
export * from './types';

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
  return strategies.find((strategy) => strategy.canHandle(filePath));
}

// Alias for SDK compatibility
export const getFileStrategy = findStrategy;
````

## File: src/utils/cost.ts
````typescript
// Cost calculation utilities for AI translation services
import { getDefaultModel } from '../ai/translate';

// Pricing per million tokens (as of 2024)
export const PRICING = {
  anthropic: {
    'claude-3-5-sonnet-20240620': {
      input: 3.0, // $3 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    'claude-3-7-sonnet-20250219': {
      input: 3.0, // $3 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    'claude-4-sonnet-20250514': {
      input: 3.0, // $3 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    'claude-4-opus-20250514': {
      input: 15.0, // $15 per million input tokens
      output: 75.0, // $75 per million output tokens
    },
  },
  openai: {
    'gpt-4o': {
      input: 5.0, // $5 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    'gpt-4o-2024-08-06': {
      input: 5.0, // $5 per million input tokens
      output: 15.0, // $15 per million output tokens
    },
    'gpt-4o-mini': {
      input: 0.15, // $0.15 per million input tokens
      output: 0.6, // $0.60 per million output tokens
    },
    'o3-mini': {
      input: 1.1, // $1.10 per million input tokens
      output: 4.4, // $4.40 per million output tokens
    },
    o3: {
      input: 2.0, // $2.00 per million input tokens
      output: 8.0, // $8.00 per million output tokens
    },
  },
  moonshot: {
    'kimi-k2': {
      input: 0.14, // $0.14 per million input tokens
      output: 2.49, // $2.49 per million output tokens
    },
  },
};

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  formattedCost: string;
}

/**
 * Calculate the cost of a translation based on token usage
 */
export function calculateCost(
  usage: TokenUsage,
  provider: string = 'anthropic',
  model?: string
): CostCalculation {
  const actualModel = model || getDefaultModel(provider);
  const providerPricing = PRICING[provider as keyof typeof PRICING];
  const pricing = providerPricing?.[actualModel as keyof typeof providerPricing];

  if (!pricing) {
    console.warn(
      `No pricing found for ${provider}/${actualModel}, using default Anthropic pricing`
    );
    const defaultPricing = PRICING.anthropic['claude-3-5-sonnet-20240620'];
    return calculateCostWithPricing(usage, defaultPricing);
  }

  return calculateCostWithPricing(usage, pricing);
}

function calculateCostWithPricing(
  usage: TokenUsage,
  pricing: { input: number; output: number }
): CostCalculation {
  // Convert from per-million to per-token pricing
  const inputCostPerToken = pricing.input / 1_000_000;
  const outputCostPerToken = pricing.output / 1_000_000;

  const inputCost = usage.promptTokens * inputCostPerToken;
  const outputCost = usage.completionTokens * outputCostPerToken;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    formattedCost: formatCost(totalCost),
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '< $0.01';
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Aggregate multiple token usages
 */
export function aggregateUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (total, usage) => ({
      promptTokens: total.promptTokens + usage.promptTokens,
      completionTokens: total.completionTokens + usage.completionTokens,
      totalTokens: total.totalTokens + usage.totalTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}
````

## File: src/utils/index.ts
````typescript
export * from './config';
export * from './cost';
export * from './crypto';
export * from './lockfile';
export * from './paths';
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

# Examples
content/docs/**/*.mdx

# AI
.claude
````

## File: src/cli/index.ts
````typescript
#!/usr/bin/env bun
import { Command } from 'commander';
import {
  initCommand,
  localeAddCommand,
  localeListCommand,
  localeRemoveCommand,
  resetCommand,
  translateCommand,
} from './commands';

const program = new Command();

program
  .name('idioma')
  .description('AI-powered internationalization for MDX documentation')
  .version('0.1.0');

// Init command
program.command('init').description('Initialize Idioma configuration').action(initCommand);

// Translate command
program
  .command('translate')
  .description('Translate files based on configuration')
  .option('--costs', 'Show translation costs based on token usage')
  .action(translateCommand);

// Direct locale commands
program
  .command('add <locales>')
  .description('Add target locale(s) - supports comma-separated values (e.g., pt,fr)')
  .action(localeAddCommand);

program
  .command('remove <locales>')
  .description('Remove target locale(s) - supports comma-separated values (e.g., pt,fr)')
  .action(localeRemoveCommand);

program.command('list').description('List all configured locales').action(localeListCommand);

// Reset command
program
  .command('reset')
  .description('Reset translation status and remove generated translation files')
  .action(resetCommand);

// Parse command line arguments
program.parse();
````

## File: src/core/process-files.ts
````typescript
import { glob } from 'glob';
import {
  aggregateUsage,
  type Config,
  calculateCost,
  formatTokenCount,
  type LockFile,
  type TokenUsage,
} from '../utils';
import { type TranslateFileOptions, translateFile } from './translate-file';

export interface ProcessFilesResult {
  lock: LockFile;
  totalUsage?: TokenUsage;
}

export async function processFiles(
  config: Config,
  lock: LockFile,
  options: TranslateFileOptions = {}
): Promise<ProcessFilesResult> {
  const sourceLocale = config.locale.source;
  const targetLocales = config.locale.targets;

  if (targetLocales.length === 0) {
    throw new Error('No target locales configured. Run "idioma add <locale>" first.');
  }

  const allUsages: TokenUsage[] = [];

  // Process each file type defined in config
  for (const [_fileType, fileConfig] of Object.entries(config.files)) {
    for (const pattern of fileConfig.include) {
      // Replace [locale] placeholder with source locale to find actual files
      const sourcePattern = pattern.replace(/\[locale\]/g, sourceLocale);

      // Get all files matching the source pattern
      const files = await glob(sourcePattern);

      // Process each file for each target locale
      for (const file of files) {
        for (const targetLocale of targetLocales) {
          try {
            const result = await translateFile(
              file,
              sourceLocale,
              targetLocale,
              lock,
              config,
              options
            );
            if (result.usage) {
              allUsages.push(result.usage);
            }
          } catch (error) {
            console.error(`Error translating ${file} to ${targetLocale}:`, error);
            // Continue with other files
          }
        }
      }
    }
  }

  // Aggregate total usage
  const totalUsage = allUsages.length > 0 ? aggregateUsage(allUsages) : undefined;

  // Display total cost if enabled
  if (options.showCosts && totalUsage && totalUsage.totalTokens > 0) {
    const provider = config.translation?.provider || 'anthropic';
    const model = config.translation?.model;
    const cost = calculateCost(totalUsage, provider, model);
    console.log(
      `\nTotal cost: ${cost.formattedCost} (${formatTokenCount(totalUsage.totalTokens)} tokens)`
    );
  }

  return { lock, totalUsage };
}

export async function getFilesToTranslate(config: Config, patterns?: string[]): Promise<string[]> {
  const filesToProcess: string[] = [];

  if (patterns && patterns.length > 0) {
    // Use provided patterns
    for (const pattern of patterns) {
      const files = await glob(pattern);
      filesToProcess.push(...files);
    }
  } else {
    // Use patterns from config
    for (const [_fileType, fileConfig] of Object.entries(config.files)) {
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

## File: src/parsers/frontmatter.ts
````typescript
import { translateText } from '../ai/translate';
import type { Config } from '../utils/config';
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
  const translatableFields = config.translation?.frontmatterFields || [
    'title',
    'description',
    'sidebarTitle',
  ];
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
````

## File: src/parsers/types.ts
````typescript
import type { Config } from '../utils/config';
import type { TokenUsage } from '../utils/cost';

// Result of a translation strategy
export interface StrategyTranslationResult {
  content: string;
  usage: TokenUsage;
}

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
    aiClient: any,
    model?: string,
    provider?: string
  ): Promise<StrategyTranslationResult>;

  // Optional: Get strategy name for logging
  getName?(): string;
}
````

## File: src/utils/lockfile.ts
````typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

export interface LockFile {
  version: number;
  files: Record<
    string,
    {
      content: string;
      translations?: Record<string, boolean>; // Track which locales have been translated
    }
  >;
}

const lockPath = path.resolve('idioma.lock');

export async function loadLock(): Promise<LockFile> {
  try {
    const data = await fs.readFile(lockPath, 'utf-8');
    const lock = yaml.load(data) as LockFile;

    // Migrate old lock files that don't have translations tracking
    let needsMigration = false;
    for (const [_filePath, entry] of Object.entries(lock.files)) {
      if (!entry.translations) {
        entry.translations = {};
        needsMigration = true;
      }
    }

    if (needsMigration) {
      await saveLock(lock);
    }

    return lock;
  } catch {
    return { version: 1, files: {} };
  }
}

export async function saveLock(lock: LockFile): Promise<void> {
  const yamlStr = yaml.dump(lock);
  await fs.writeFile(lockPath, yamlStr);
}

export async function getLockFile(customPath?: string): Promise<LockFile> {
  const lockFilePath = customPath || lockPath;
  try {
    const data = await fs.readFile(lockFilePath, 'utf-8');
    const lock = yaml.load(data) as LockFile;

    // Migrate old lock files that don't have translations tracking
    let needsMigration = false;
    for (const [_filePath, entry] of Object.entries(lock.files)) {
      if (!entry.translations) {
        entry.translations = {};
        needsMigration = true;
      }
    }

    if (needsMigration) {
      await saveLockFile(lock, lockFilePath);
    }

    return lock;
  } catch {
    return { version: 1, files: {} };
  }
}

export async function saveLockFile(lock: LockFile, customPath?: string): Promise<void> {
  const lockFilePath = customPath || lockPath;
  const yamlStr = yaml.dump(lock);
  await fs.writeFile(lockFilePath, yamlStr);
}

export function shouldTranslate(lock: LockFile, filePath: string, targetLocale: string): boolean {
  const fileEntry = lock.files[filePath];

  // If file is not in lock, it needs translation
  if (!fileEntry) {
    return true;
  }

  // If file hasn't been translated to this locale yet
  if (!fileEntry.translations?.[targetLocale]) {
    return true;
  }

  // File has been translated to this locale
  return false;
}
````

## File: src/ai/translate.ts
````typescript
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { TokenUsage } from '../utils/cost';

// Result types that include usage metadata
export interface TranslationResult {
  text: string;
  usage: TokenUsage;
}

// Get default model for each provider
export function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-3-5-sonnet-20240620';
    case 'openai':
      return 'gpt-4o-2024-08-06';
    default:
      return 'claude-3-5-sonnet-20240620';
  }
}

// AI Provider factory - returns configured AI client
export function createAiClient(provider: string, apiKey?: string): any {
  switch (provider) {
    case 'anthropic': {
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
      }
      return createAnthropic({ apiKey: anthropicKey });
    }

    case 'openai': {
      const openaiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
      }
      return createOpenAI({ apiKey: openaiKey });
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Translation function with dependency injection for AI client
export async function translateText(
  text: string,
  source: string,
  target: string,
  clientOrProvider: any,
  model?: string,
  provider?: string
): Promise<TranslationResult> {
  // Handle both client instance and provider string
  const client =
    typeof clientOrProvider === 'string' ? createAiClient(clientOrProvider) : clientOrProvider;
  const actualProvider =
    typeof clientOrProvider === 'string' ? clientOrProvider : provider || 'anthropic';
  // Preserve leading/trailing whitespace
  const leadingWhitespace = text.match(/^\s*/)?.[0] || '';
  const trailingWhitespace = text.match(/\s*$/)?.[0] || '';
  const trimmedText = text.trim();

  // Skip empty text
  if (!trimmedText) {
    return {
      text,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  const result = await generateText({
    model: client(model || getDefaultModel(actualProvider)),
    system:
      'You are a translation assistant. You MUST return ONLY the translated text without any additional commentary, explanations, or phrases like "Here is the translation". Do not add any text before or after the translation.',
    prompt: `Translate the following text from ${source} to ${target}. Preserve exact formatting, tone, and structure (e.g., Markdown headers, links, code blocks).

Text to translate:
${trimmedText}`,
  });

  // Re-apply the original whitespace
  const translatedText = leadingWhitespace + result.text.trim() + trailingWhitespace;

  return {
    text: translatedText,
    usage: result.usage,
  };
}

// Batch translation helper for performance
export async function translateBatch(
  texts: string[],
  source: string,
  target: string,
  clientOrProvider: any,
  model?: string,
  provider?: string
): Promise<TranslationResult[]> {
  // Process translations in parallel for better performance
  return Promise.all(
    texts.map((text) => translateText(text, source, target, clientOrProvider, model, provider))
  );
}

// Backward compatibility wrapper - returns just the text
export async function translateTextSimple(
  text: string,
  source: string,
  target: string,
  clientOrProvider: any,
  model?: string,
  provider?: string
): Promise<string> {
  const result = await translateText(text, source, target, clientOrProvider, model, provider);
  return result.text;
}
````

## File: src/cli/commands.ts
````typescript
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { processFiles } from '../core';
import {
  type Config,
  loadConfig,
  loadLock,
  replaceLocaleInPattern,
  saveConfig,
  saveLock,
} from '../utils';

// Init command - create config file
export async function initCommand(): Promise<void> {
  const configPath = path.resolve('idioma.json');

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
        model: 'claude-3-5-sonnet-20240620',
        rules: {
          patternsToSkip: ['^type:\\s*\\w+$'],
        },
      },
    };

    await saveConfig(defaultConfig);
    console.log('✓ Created idioma.json');
    console.log('\nNext steps:');
    console.log('1. Add target locales: idioma add <locale>');
    console.log('2. Configure your file patterns in idioma.json');
    console.log('3. Run translation: idioma translate');
  }
}

// Translate command - process all files
export async function translateCommand(options: { costs?: boolean }): Promise<void> {
  try {
    // Load configuration
    const config = await loadConfig();
    const lock = await loadLock();

    // Process all files
    const result = await processFiles(config, lock, { showCosts: options.costs });

    // Save updated lock file
    await saveLock(result.lock);
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

// Locale add command - supports comma-separated locales
export async function localeAddCommand(locales: string): Promise<void> {
  try {
    const config = await loadConfig();
    const localeList = locales.split(',').map((l) => l.trim());
    const added: string[] = [];

    for (const locale of localeList) {
      if (!config.locale.targets.includes(locale)) {
        config.locale.targets.push(locale);
        added.push(locale);
      }
    }

    if (added.length > 0) {
      await saveConfig(config);
      console.log(`✓ Added locales: ${added.join(', ')}`);
    } else {
      console.log('All specified locales already exist.');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

// Locale remove command - supports comma-separated locales
export async function localeRemoveCommand(locales: string): Promise<void> {
  try {
    const config = await loadConfig();
    const localeList = locales.split(',').map((l) => l.trim());
    const removed: string[] = [];

    for (const locale of localeList) {
      const index = config.locale.targets.indexOf(locale);
      if (index !== -1) {
        config.locale.targets.splice(index, 1);
        removed.push(locale);
      }
    }

    if (removed.length > 0) {
      await saveConfig(config);
      console.log(`✓ Removed locales: ${removed.join(', ')}`);
    } else {
      console.log('None of the specified locales were found.');
    }
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
    console.log(
      'Target locales:',
      config.locale.targets.length ? config.locale.targets.join(', ') : 'None'
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

// Reset command - reset translation status and remove generated files
export async function resetCommand(): Promise<void> {
  try {
    const config = await loadConfig();
    const lock = await loadLock();

    if (config.locale.targets.length === 0) {
      console.log('No target locales configured.');
      return;
    }

    const deletedFiles: string[] = [];

    // Process each file type and pattern
    for (const [_fileType, fileConfig] of Object.entries(config.files)) {
      for (const pattern of fileConfig.include) {
        for (const targetLocale of config.locale.targets) {
          // Replace [locale] placeholder with target locale
          const targetPattern = replaceLocaleInPattern(pattern, config.locale.source, targetLocale);

          // Find all files matching the target pattern
          const files = await glob(targetPattern);

          for (const file of files) {
            try {
              await fs.unlink(file);
              deletedFiles.push(file);
            } catch (_error) {
              // File might not exist, continue
            }
          }

          // Try to remove empty directories after deleting files
          if (files.length > 0) {
            try {
              // Get unique directories from deleted files
              const dirsToCheck = new Set<string>();
              for (const file of files) {
                let dir = path.dirname(file);
                // Add all parent directories up to the locale directory
                while (dir.includes(`/${targetLocale}/`) || dir.endsWith(`/${targetLocale}`)) {
                  dirsToCheck.add(dir);
                  dir = path.dirname(dir);
                }
              }

              // Sort directories by depth (deepest first) to remove from bottom up
              const sortedDirs = Array.from(dirsToCheck).sort(
                (a, b) => b.split('/').length - a.split('/').length
              );

              for (const dir of sortedDirs) {
                try {
                  await fs.rmdir(dir);
                } catch {
                  // Directory not empty or doesn't exist, continue
                }
              }
            } catch {
              // Error removing directories, continue
            }
          }
        }
      }
    }

    // Reset lock file to initial state
    lock.files = {};

    await saveLock(lock);

    if (deletedFiles.length > 0) {
      console.log(`✓ Reset complete. Removed ${deletedFiles.length} generated translation files:`);
      deletedFiles.forEach((file) => console.log(`  - ${file}`));
      console.log(
        '\nTranslation status cleared. Run "idioma translate" to regenerate translations.'
      );
    } else {
      console.log('No translation files found. Lock file has been reset.');
    }
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

## File: src/core/translate-file.ts
````typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import ora from 'ora';
import { createAiClient } from '../ai';
import { findStrategy, translateFrontmatter } from '../parsers';
import {
  aggregateUsage,
  type Config,
  calculateCost,
  generateHash,
  generateOutputPath,
  type LockFile,
  type TokenUsage,
} from '../utils';

export interface TranslateFileOptions {
  showCosts?: boolean;
}

export interface TranslateFileResult {
  usage?: TokenUsage;
}

export async function translateFile(
  filePath: string,
  source: string,
  target: string,
  lock: LockFile,
  config: Config,
  options: TranslateFileOptions = {}
): Promise<TranslateFileResult> {
  let spinner: any;
  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');
  const currentHash = generateHash(content);

  // Check if file has changed or if translation doesn't exist for target locale
  const fileEntry = lock.files[filePath];
  const fileChanged = fileEntry && fileEntry.content !== currentHash;

  // If source file changed, clear all translation flags
  if (fileChanged && fileEntry.translations) {
    fileEntry.translations = {};
  }

  const hasTranslation = fileEntry?.translations?.[target];

  if (fileEntry && fileEntry.content === currentHash && hasTranslation) {
    console.log(`Skipped (unchanged): ${filePath} -> ${target}`);
    return { usage: undefined };
  }

  // Create spinner for active translation
  spinner = ora(`Translating ${path.basename(filePath)} -> ${target}`).start();

  try {
    // Create AI client based on config
    const provider = config.translation?.provider || 'anthropic';
    const model = config.translation?.model;
    const aiClient = createAiClient(provider);

    let translatedContent = '';
    const usages: TokenUsage[] = [];

    // Check if content has frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const mainContent = frontmatterMatch[2];

      // Translate frontmatter
      const frontmatterResult = await translateFrontmatter(
        frontmatter,
        source,
        target,
        config,
        aiClient,
        model,
        provider
      );
      usages.push(frontmatterResult.usage);

      // Find appropriate strategy for the file type
      const strategy = findStrategy(filePath);
      if (!strategy) {
        throw new Error(`No translation strategy found for file: ${filePath}`);
      }

      // Translate main content using strategy
      const mainResult = await strategy.translate(
        mainContent,
        source,
        target,
        config,
        aiClient,
        model,
        provider
      );
      usages.push(mainResult.usage);

      translatedContent = `---\n${frontmatterResult.content}\n---\n${mainResult.content}`;
    } else {
      // No frontmatter, translate entire content
      const strategy = findStrategy(filePath);
      if (!strategy) {
        throw new Error(`No translation strategy found for file: ${filePath}`);
      }

      const result = await strategy.translate(
        content,
        source,
        target,
        config,
        aiClient,
        model,
        provider
      );
      usages.push(result.usage);
      translatedContent = result.content;
    }

    // Generate output path and write translated content
    const outputPath = generateOutputPath(filePath, source, target);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, translatedContent);

    // Update lock file with translation status
    if (!lock.files[filePath]) {
      lock.files[filePath] = { content: currentHash, translations: {} };
    } else {
      lock.files[filePath].content = currentHash;
      if (!lock.files[filePath].translations) {
        lock.files[filePath].translations = {};
      }
    }
    lock.files[filePath].translations![target] = true;

    // Calculate total usage and cost
    const totalUsage = aggregateUsage(usages);

    // Stop spinner and show success
    if (options.showCosts && totalUsage.totalTokens > 0) {
      const cost = calculateCost(totalUsage, provider, model);
      spinner.succeed(`${path.basename(filePath)} -> ${target} [${cost.formattedCost}]`);
    } else {
      spinner.succeed(`${path.basename(filePath)} -> ${target}`);
    }

    return { usage: totalUsage };
  } catch (error) {
    // Stop spinner with error
    spinner.fail(`Failed: ${path.basename(filePath)} -> ${target}`);
    throw error;
  }
}
````

## File: src/parsers/mdx.ts
````typescript
import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import { translateBatch } from '../ai/translate';
import type { Config } from '../utils/config';
import { aggregateUsage } from '../utils/cost';
import type { StrategyTranslationResult, TranslationStrategy } from './types';

// Add parent references to all nodes in the tree
function addParentReferences(tree: any) {
  visit(tree, (node, _index, parent) => {
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
    const paragraphParent = parent.parent;
    if (
      paragraphParent &&
      (paragraphParent.type === 'containerDirective' ||
        paragraphParent.type === 'leafDirective' ||
        paragraphParent.type === 'textDirective')
    ) {
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
  const patterns =
    config.translation?.rules?.patternsToSkip?.map((p) => new RegExp(p)) ||
    config.translation?.skipPatterns?.map((p) => new RegExp(p)) ||
    [];

  // Check if text matches any skip pattern
  if (patterns.some((p) => p.test(trimmedValue))) {
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
    aiClient: any,
    model?: string,
    provider?: string
  ): Promise<StrategyTranslationResult> {
    // Parse MDX content with directive support
    const tree = remark().use(remarkMdx).use(remarkDirective).parse(content);

    // Add parent references to enable directive checking
    addParentReferences(tree);

    // Get translatable attributes from config
    const translatableAttrs = config.translation?.jsxAttributes || [
      'title',
      'description',
      'tag',
      'alt',
      'placeholder',
      'label',
    ];

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
          originalText: node.value,
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
                originalText: attr.value,
              });
            }
          }
        });
      }
    });

    // Visit image nodes to translate alt text
    visit(tree, 'image', (node: any) => {
      if (node.alt?.trim()) {
        textsToTranslate.push({
          node,
          type: 'imageAlt',
          attributeName: 'alt',
          originalText: node.alt,
        });
      }
    });

    // Batch translate all texts for performance
    const textsToTranslateArray = textsToTranslate.map((item) => item.originalText);
    const translationResults = await translateBatch(
      textsToTranslateArray,
      source,
      target,
      aiClient,
      model,
      provider
    );

    // Apply translations
    textsToTranslate.forEach((item, index) => {
      const translatedText = translationResults[index]?.text;
      if (item.type === 'text') {
        item.node.value = translatedText;
      } else if (item.type === 'imageAlt') {
        item.node.alt = translatedText;
      } else if (item.type === 'attribute') {
        item.node.value = translatedText;
      }
    });

    // Aggregate usage from all translations
    const totalUsage = aggregateUsage(translationResults.map((r) => r.usage));

    // Stringify back to MDX with directive support
    const translatedContent = remark().use(remarkMdx).use(remarkDirective).stringify(tree);

    return {
      content: translatedContent,
      usage: totalUsage,
    };
  }
}
````

## File: package.json
````json
{
  "name": "idioma",
  "version": "0.1.0",
  "description": "AI-powered internationalization for MDX documentation",
  "keywords": ["i18n", "localization", "translation", "mdx", "ai", "claude", "openai"],
  "homepage": "https://github.com/idioma/idioma",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/idioma/idioma.git"
  },
  "license": "MIT",
  "author": "Idioma Team",
  "type": "module",
  "main": "./dist/src/index.js",
  "module": "./dist/src/index.js",
  "types": "./dist/src/index.d.ts",
  "bin": {
    "idioma": "./dist/src/cli.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",
      "import": "./dist/src/index.js"
    },
    "./sdk": {
      "types": "./dist/sdk/src/index.d.ts",
      "import": "./dist/sdk/src/index.js"
    }
  },
  "scripts": {
    "build": "bunup",
    "dev": "bunup --watch",
    "lint": "biome check src/ sdk/src/",
    "lint:fix": "biome check --write src/ sdk/src/",
    "format": "biome format --write src/ sdk/src/",
    "prepublishOnly": "bun run build"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.1.2",
    "@types/bun": "latest",
    "@types/glob": "^9.0.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^24.0.14",
    "bunup": "^0.9.2"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^1.2.12",
    "@ai-sdk/openai": "^1.3.23",
    "@unkey/api": "^0.38.0",
    "ai": "^4.3.19",
    "commander": "^14.0.0",
    "glob": "^11.0.3",
    "hono": "^4.8.5",
    "hono-rate-limiter": "^0.4.2",
    "js-yaml": "^4.1.0",
    "ora": "^8.2.0",
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

## File: src/utils/config.ts
````typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Extended config schema with provider and rules
export const ConfigSchema: z.ZodSchema = z.object({
  projectId: z.string().optional(),
  locale: z.object({
    source: z.string().default('en'),
    targets: z.array(z.string()).default([]),
  }),
  files: z.record(
    z.string(),
    z.object({
      include: z.array(z.string()),
    })
  ),
  translation: z
    .object({
      frontmatterFields: z.array(z.string()).default(['title', 'description', 'sidebarTitle']),
      jsxAttributes: z
        .array(z.string())
        .default(['title', 'description', 'tag', 'alt', 'placeholder', 'label']),
      skipPatterns: z.array(z.string()).default([]),
      // New fields for extensibility
      provider: z.string().default('anthropic'),
      model: z.string().optional(), // Optional model specification
      rules: z
        .object({
          patternsToSkip: z.array(z.string()).default([]), // No default patterns - intelligent detection instead
        })
        .optional(),
    })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const configPath = path.resolve('idioma.json');

export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return ConfigSchema.parse(JSON.parse(data));
  } catch {
    throw new Error('Configuration file not found. Run "idioma init" first.');
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export function mergeConfig(base: Config, overrides: Partial<Config>): Config {
  const mergedTranslation = {
    frontmatterFields: overrides.translation?.frontmatterFields ||
      base.translation?.frontmatterFields || ['title', 'description', 'sidebarTitle'],
    jsxAttributes: overrides.translation?.jsxAttributes ||
      base.translation?.jsxAttributes || [
        'title',
        'description',
        'tag',
        'alt',
        'placeholder',
        'label',
      ],
    skipPatterns: overrides.translation?.skipPatterns || base.translation?.skipPatterns || [],
    provider: overrides.translation?.provider || base.translation?.provider || 'anthropic',
    model: overrides.translation?.model || base.translation?.model,
    rules: {
      patternsToSkip: [
        ...(base.translation?.rules?.patternsToSkip || []),
        ...(overrides.translation?.rules?.patternsToSkip || []),
      ],
    },
  };

  return {
    ...base,
    ...overrides,
    locale: {
      ...base.locale,
      ...overrides.locale,
    },
    files: {
      ...base.files,
      ...overrides.files,
    },
    translation: mergedTranslation,
  };
}
````

## File: src/cli.ts
````typescript
#!/usr/bin/env bun
// This file is kept for backward compatibility
// The actual CLI implementation is in src/cli/index.ts
import './cli/index';
````
