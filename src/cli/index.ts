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
  .option('--costs', 'Show translation costs based on token usage')
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