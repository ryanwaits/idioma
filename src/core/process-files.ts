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