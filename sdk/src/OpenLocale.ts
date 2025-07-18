import { resolve, dirname } from "path";
import { readFile, mkdir, writeFile } from "fs/promises";
import { glob } from "glob";
import { createHash } from "crypto";
import type { Config } from "@/utils/config";
import { loadConfig, mergeConfig } from "@/utils/config";
import { getLockFile, saveLockFile, shouldTranslate } from "@/utils/lockfile";
import { translateFile as coreTranslateFile } from "@/core/translate-file";
import { processFiles as coreProcessFiles } from "@/core/process-files";
import { translateText, createAiClient } from "@/ai/translate";
import { getFileStrategy } from "@/parsers";
import { calculateCost, aggregateUsage, type TokenUsage } from "@/utils/cost";
import { ConfigError, TranslationError, FileError } from "./errors";
import type {
  OpenLocaleConfig,
  TranslateContentParams,
  TranslateContentResult,
  TranslateFileParams,
  TranslateFileResult,
  TranslateFilesParams,
  ProcessFilesResult,
  CostEstimateParams,
  CostEstimate,
} from "./types";

export class OpenLocale {
  private config: Config;
  private apiKey?: string;
  private lockFilePath: string;

  private constructor(config: Config, apiKey?: string, lockFilePath?: string) {
    this.config = config;
    this.apiKey = apiKey;
    this.lockFilePath = lockFilePath || resolve(process.cwd(), "openlocale.lock");
  }

  static async create(options: OpenLocaleConfig = {}): Promise<OpenLocale> {
    // Set API key from options or environment
    let apiKey = options.apiKey;
    if (apiKey) {
      process.env.ANTHROPIC_API_KEY = apiKey;
    } else if (options.provider === "openai" && !process.env.OPENAI_API_KEY) {
      throw new ConfigError("OpenAI API key not found in environment or config");
    } else if (options.provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      throw new ConfigError("Anthropic API key not found in environment or config");
    }

    // Load and merge config
    let config: Config;
    try {
      const baseConfig = await loadConfig();
      config = mergeConfig(baseConfig, options as Partial<Config>);
    } catch (error) {
      // If no config file exists, create a minimal config
      config = {
        projectId: `prj_${Date.now()}`,
        locale: {
          source: options.locale?.source || "en",
          targets: options.locale?.targets || [],
        },
        files: options.files || {},
        translation: {
          provider: options.provider || "anthropic",
          model: options.model,
          frontmatterFields: options.translation?.frontmatterFields || ["title", "description"],
          jsxAttributes: options.translation?.jsxAttributes || ["alt", "title", "placeholder"],
          skipPatterns: options.translation?.skipPatterns || [],
          rules: options.translation?.rules || {
            patternsToSkip: ["^type:\\s*\\w+$"],
          },
        },
      } as Config;
    }

    const lockFilePath = options.cachePath || resolve(process.cwd(), "openlocale.lock");
    return new OpenLocale(config, apiKey, lockFilePath);
  }

  /**
   * Translate content directly without file I/O
   */
  async translateContent(params: TranslateContentParams): Promise<TranslateContentResult> {
    const { content, format, sourceLocale, targetLocale, trackCosts = false } = params;

    try {
      let translatedContent: string;
      let usage: TokenUsage | undefined;

      if (format === "string") {
        // Direct text translation
        const result = await translateText(
          content,
          sourceLocale,
          targetLocale,
          this.config.translation.provider,
          this.config.translation.model
        );
        translatedContent = result.text;
        usage = result.usage;
      } else {
        // Use appropriate parser strategy
        const strategy = getFileStrategy(format === "mdx" ? "file.mdx" : "file.md");
        if (!strategy) {
          throw new TranslationError(`No parser strategy found for format: ${format}`);
        }

        // Create AI client for the strategy
        const aiClient = createAiClient(this.config.translation.provider, this.apiKey);
        
        const result = await strategy.translate(
          content,
          sourceLocale,
          targetLocale,
          this.config,
          aiClient,
          this.config.translation.model,
          this.config.translation.provider
        );
        translatedContent = result.content;
        usage = result.usage;
      }

      const response: TranslateContentResult = { translatedContent };

      if (trackCosts && usage) {
        response.usage = usage;
        response.cost = calculateCost(
          usage,
          this.config.translation.provider,
          this.config.translation.model
        );
      }

      return response;
    } catch (error) {
      throw new TranslationError(
        error instanceof Error ? error.message : "Unknown translation error"
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
          translations: { ...lockFile.files[filePath]?.translations, [targetLocale]: true }
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
          cost: result.usage ? calculateCost(
            result.usage,
            this.config.translation.provider,
            this.config.translation.model
          ) : undefined,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      }

      // Aggregate usage and costs
      const totalUsage = allUsages.length > 0 ? aggregateUsage(allUsages) : undefined;
      const totalCost = totalUsage ? calculateCost(
        totalUsage,
        this.config.translation.provider,
        this.config.translation.model
      ) : undefined;

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
        error instanceof Error ? error.message : "Unknown batch translation error"
      );
    }
  }

  /**
   * Get available file format strategies
   */
  getAvailableFormats(): string[] {
    return ["mdx", "md", "string"];
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
        this.config.translation.provider,
        this.config.translation.model
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
      throw new TranslationError(
        error instanceof Error ? error.message : "Cost estimation failed"
      );
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OpenLocaleConfig>): void {
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