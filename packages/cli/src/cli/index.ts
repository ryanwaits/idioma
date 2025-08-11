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
