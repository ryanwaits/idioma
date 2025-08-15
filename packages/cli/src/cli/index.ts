#!/usr/bin/env node
import { Command } from 'commander';
import { startBackgroundTranslation } from './background';
import {
  initCommand,
  localeAddCommand,
  localeListCommand,
  localeRemoveCommand,
  resetCommand,
  statusCommand,
  stopCommand,
  translateCommand,
} from './commands';

const program = new Command();

program.name('idioma').description('Internationalization engine').version('0.0.11');

// Init command
program.command('init').description('Initialize Idioma configuration').action(initCommand);

// Translate command
program
  .command('translate')
  .description('Translate files based on configuration')
  .option('--costs', 'Show translation costs based on token usage')
  .option('--background', 'Run translation in the background')
  .action(async (options) => {
    if (options.background) {
      const args = [];
      if (options.costs) args.push('--costs');
      await startBackgroundTranslation(args);
    } else {
      await translateCommand(options);
    }
  });

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

// Status command - check background translation status
program
  .command('status')
  .description('Check the status of a background translation')
  .option('--tail', 'Show real-time status updates')
  .action(statusCommand);

// Stop command - stop background translation
program.command('stop').description('Stop a running background translation').action(stopCommand);

// Parse command line arguments
program.parse();
