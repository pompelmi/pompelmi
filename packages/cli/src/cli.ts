#!/usr/bin/env node
import { cac } from 'cac';
import { version } from '../package.json' assert { type: 'json' };
import { scanCommand } from './commands/scan.js';
import { watchCommand } from './commands/watch.js';

const cli = cac('pompelmi');

// CLI metadata
cli
  .version(version)
  .help();

// Default command (scan current directory)
cli
  .command('[directory]', 'Scan files in directory', { ignoreOptionDefaultValue: true })
  .option('-r, --recursive', 'Scan directories recursively', { default: false })
  .option('-f, --format <type>', 'Output format: table, json, or summary', { default: 'table' })
  .option('--ext <extensions>', 'Comma-separated list of file extensions to scan (e.g., js,ts,pdf)')
  .option('--max-size <bytes>', 'Maximum file size to scan in bytes', { default: 100 * 1024 * 1024 })
  .option('--fail-on <level>', 'Exit with code 1 on: malicious, suspicious, or any', { default: 'malicious' })
  .option('--quiet', 'Only output summary or errors', { default: false })
  .option('--no-color', 'Disable colored output')
  .option('--stream', 'Use stream-based scanning for large files', { default: true })
  .action(scanCommand);

// Explicit scan command
cli
  .command('scan <directory>', 'Scan files in specified directory')
  .option('-r, --recursive', 'Scan directories recursively', { default: false })
  .option('-f, --format <type>', 'Output format: table, json, or summary', { default: 'table' })
  .option('--ext <extensions>', 'Comma-separated list of file extensions to scan')
  .option('--max-size <bytes>', 'Maximum file size to scan in bytes', { default: 100 * 1024 * 1024 })
  .option('--fail-on <level>', 'Exit with code 1 on: malicious, suspicious, or any', { default: 'malicious' })
  .option('--quiet', 'Only output summary or errors', { default: false })
  .option('--no-color', 'Disable colored output')
  .option('--stream', 'Use stream-based scanning for large files', { default: true })
  .action(scanCommand);

// Watch command for development
cli
  .command('watch <directory>', 'Watch directory for file changes and scan automatically')
  .option('--ext <extensions>', 'Comma-separated list of file extensions to watch')
  .option('--debounce <ms>', 'Debounce delay in milliseconds', { default: 300 })
  .action(watchCommand);

// Parse and execute
cli.parse();
