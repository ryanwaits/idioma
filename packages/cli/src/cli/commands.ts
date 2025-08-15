import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import {
  type Config,
  loadConfig,
  loadLock,
  processFiles,
  replaceLocaleInPattern,
  saveConfig,
  saveLock,
} from 'idioma-sdk';
import {
  startBackgroundTranslation,
  getTranslationStatus,
  stopBackgroundTranslation,
} from './background';

// Init command - create config file
export async function initCommand(): Promise<void> {
  const configPath = path.resolve('idioma.json');

  try {
    await fs.access(configPath);
    console.log('Configuration file already exists.');
  } catch {
    const defaultConfig: Config = {
      locale: {
        source: 'en',
        targets: [],
      },
      files: {
        include: ['**/*.mdx'],
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

    // Process each file pattern
    for (const pattern of config.files) {
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


// Display translation status (shared helper)
function displayStatus(status: any): void {
  const percentage = status.totalFiles > 0 
    ? Math.round((status.processedFiles / status.totalFiles) * 100)
    : 0;
  
  console.log('\n📊 Translation Status');
  console.log('─'.repeat(40));
  console.log(`Status: ${status.status === 'running' ? '🔄' : status.status === 'completed' ? '✅' : '❌'} ${status.status}`);
  console.log(`Progress: ${status.processedFiles}/${status.totalFiles} files (${percentage}%)`);
  
  if (status.currentFile) {
    console.log(`Current file: ${status.currentFile}`);
  }
  
  console.log(`Started: ${new Date(status.startTime).toLocaleString()}`);
  
  if (status.endTime) {
    console.log(`Ended: ${new Date(status.endTime).toLocaleString()}`);
    const duration = new Date(status.endTime).getTime() - new Date(status.startTime).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    console.log(`Duration: ${minutes}m ${seconds}s`);
  }
  
  if (status.errors.length > 0) {
    console.log(`\n⚠️  Errors (${status.errors.length}):`);
    status.errors.slice(-5).forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  if (status.pid && status.status === 'running') {
    console.log(`\nProcess ID: ${status.pid}`);
    console.log('To stop: idioma stop');
  }
}

// Status command - check background translation status
export async function statusCommand(options: { tail?: boolean } = {}): Promise<void> {
  if (options.tail) {
    // Real-time status updates
    console.log('📡 Real-time translation status (Press Ctrl+C to exit)');
    console.log('═'.repeat(50));
    
    let lastStatus: any = null;
    
    const updateDisplay = async () => {
      const status = await getTranslationStatus();
      
      if (!status) {
        console.log('\n❌ No background translation is currently running.');
        process.exit(0);
      }
      
      // Only update display if status changed
      const statusStr = JSON.stringify(status);
      if (statusStr !== lastStatus) {
        // Clear screen and show updated status
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log('📡 Real-time translation status (Press Ctrl+C to exit)');
        console.log('═'.repeat(50));
        displayStatus(status);
        
        // Exit if translation completed or failed
        if (status.status !== 'running') {
          console.log('\n🎯 Translation finished!');
          process.exit(0);
        }
        
        lastStatus = statusStr;
      }
    };
    
    // Initial display
    await updateDisplay();
    
    // Update every 2 seconds
    const interval = setInterval(updateDisplay, 2000);
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n\n👋 Exiting real-time status...');
      process.exit(0);
    });
    
  } else {
    // Single status check
    const status = await getTranslationStatus();
    
    if (!status) {
      console.log('No background translation is currently running.');
      return;
    }
    
    displayStatus(status);
  }
}

// Stop command - stop background translation
export async function stopCommand(): Promise<void> {
  await stopBackgroundTranslation();
}
