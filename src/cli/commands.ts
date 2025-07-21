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
        model: 'claude-3-5-sonnet-20240620',
        rules: {
          patternsToSkip: ['^type:\\s*\\w+$'],
        },
      },
    };

    await saveConfig(defaultConfig);
    console.log('✓ Created openlocale.json');
    console.log('\nNext steps:');
    console.log('1. Add target locales: openlocale add <locale>');
    console.log('2. Configure your file patterns in openlocale.json');
    console.log('3. Run translation: openlocale translate');
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
        '\nTranslation status cleared. Run "openlocale translate" to regenerate translations.'
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
