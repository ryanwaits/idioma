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
export async function translateCommand(options: { costs?: boolean }): Promise<void> {
  try {
    // Load configuration
    const config = await loadConfig();
    const lock = await loadLock();
    
    // Process all files
    console.log('Starting translation...');
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