import { glob } from 'glob';
import { Config, LockFile, replaceLocaleInPattern, TokenUsage, aggregateUsage, calculateCost, formatTokenCount } from '../utils';
import { translateFile, TranslateFileOptions } from './translate-file';

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
    throw new Error('No target locales configured. Run "openlocale locale add <locale>" first.');
  }
  
  const allUsages: TokenUsage[] = [];
  
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
            const result = await translateFile(file, sourceLocale, targetLocale, lock, config, options);
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
    const cost = calculateCost(totalUsage, provider);
    console.log(`\nTotal cost: ${cost.formattedCost} (${formatTokenCount(totalUsage.totalTokens)} tokens)`);
  }
  
  return { lock, totalUsage };
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