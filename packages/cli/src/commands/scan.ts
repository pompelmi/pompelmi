import { existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { createReadStream } from 'node:fs';
import { scan } from '@pompelmi/core';
import type { ScanReport } from '@pompelmi/core';
import { formatTable, formatJson, formatSummary } from '../formatters/index.js';
import * as pc from 'picocolors';

export interface ScanOptions {
  recursive: boolean;
  format: 'table' | 'json' | 'summary';
  ext?: string | string[];
  maxSize: number;
  failOn: 'malicious' | 'suspicious' | 'any' | 'never';
  quiet: boolean;
  color: boolean;
  stream: boolean;
}

export interface ScanResult {
  file: string;
  size: number;
  verdict: 'clean' | 'suspicious' | 'malicious';
  findings: string[];
  durationMs: number;
  error?: string;
}

/**
 * Main scan command handler
 */
export async function scanCommand(directory: string = '.', options: ScanOptions) {
  const startTime = Date.now();
  
  // Validate directory
  if (!existsSync(directory)) {
    console.error(pc.red(`Error: Directory not found: ${directory}`));
    process.exit(2);
  }

  const stats = statSync(directory);
  if (!stats.isDirectory() && !stats.isFile()) {
    console.error(pc.red(`Error: Path is not a file or directory: ${directory}`));
    process.exit(2);
  }

  // Parse extensions filter
  const extensions = options.ext
    ? Array.isArray(options.ext)
      ? options.ext.map((e: string) => e.trim().toLowerCase().replace(/^\./, ''))
      : options.ext.split(',').map((e: string) => e.trim().toLowerCase().replace(/^\./, ''))
    : undefined;

  if (!options.quiet) {
    console.log(pc.cyan('🔍 Pompelmi File Scanner'));
    console.log(pc.dim('─'.repeat(60)));
    console.log(`📁 Scanning: ${directory}`);
    if (options.recursive) console.log(`🔄 Mode: Recursive`);
    if (extensions) console.log(`📋 Extensions: ${extensions.join(', ')}`);
    console.log(pc.dim('─'.repeat(60)));
    console.log('');
  }

  // Collect files to scan
  const filesToScan = stats.isFile()
    ? [directory]
    : await collectFiles(directory, options.recursive, extensions, options.maxSize);

  if (filesToScan.length === 0) {
    console.log(pc.yellow('⚠️  No files found to scan'));
    process.exit(0);
  }

  if (!options.quiet) {
    console.log(`📊 Found ${filesToScan.length} file(s) to scan\n`);
  }

  // Scan all files
  const results: ScanResult[] = [];
  let scannedCount = 0;

  for (const filePath of filesToScan) {
    scannedCount++;
    
    if (!options.quiet && options.format === 'table') {
      process.stdout.write(pc.dim(`[${scannedCount}/${filesToScan.length}] Scanning ${relative(directory, filePath)}...`));
    }

    try {
      const fileStats = statSync(filePath);
      const result = await scanFile(filePath, fileStats.size, options);
      results.push(result);

      if (!options.quiet && options.format === 'table') {
        const statusIcon = 
          result.verdict === 'malicious' ? pc.red('✗') :
          result.verdict === 'suspicious' ? pc.yellow('⚠') :
          pc.green('✓');
        process.stdout.write(`\r${statusIcon} ${relative(directory, filePath)}\n`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        file: filePath,
        size: 0,
        verdict: 'clean',
        findings: [],
        durationMs: 0,
        error: errorMessage,
      });
      
      if (!options.quiet && options.format === 'table') {
        process.stdout.write(`\r${pc.red('✗')} ${relative(directory, filePath)} - ${pc.red('Error')}\n`);
      }
    }
  }

  // Calculate summary statistics
  const summary = {
    total: results.length,
    clean: results.filter(r => r.verdict === 'clean' && !r.error).length,
    suspicious: results.filter(r => r.verdict === 'suspicious').length,
    malicious: results.filter(r => r.verdict === 'malicious').length,
    errors: results.filter(r => r.error).length,
    totalDurationMs: Date.now() - startTime,
  };

  // Output results
  if (!options.quiet || options.format !== 'table') {
    console.log('');
  }

  switch (options.format) {
    case 'json':
      console.log(formatJson(results, summary, directory));
      break;
    case 'summary':
      console.log(formatSummary(results, summary, directory));
      break;
    case 'table':
    default:
      console.log(formatTable(results, summary, directory));
      break;
  }

  // Determine exit code based on failOn option
  const shouldFail = 
    (options.failOn === 'malicious' && summary.malicious > 0) ||
    (options.failOn === 'suspicious' && (summary.suspicious > 0 || summary.malicious > 0)) ||
    (options.failOn === 'any' && (summary.suspicious > 0 || summary.malicious > 0));

  if (shouldFail) {
    process.exit(1);
  }

  process.exit(0);
}

/**
 * Recursively collect files from directory
 */
async function collectFiles(
  dir: string,
  recursive: boolean,
  extensions?: string[],
  maxSize?: number,
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden files and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        if (recursive) {
          const subFiles = await collectFiles(fullPath, recursive, extensions, maxSize);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        // Check extension filter
        if (extensions) {
          const ext = extname(entry.name).slice(1).toLowerCase();
          if (!extensions.includes(ext)) {
            continue;
          }
        }

        // Check size limit
        if (maxSize) {
          const stats = statSync(fullPath);
          if (stats.size > maxSize) {
            continue;
          }
        }

        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(pc.red(`Error reading directory ${dir}:`), error);
  }

  return files;
}

/**
 * Scan a single file
 */
async function scanFile(
  filePath: string,
  fileSize: number,
  options: ScanOptions,
): Promise<ScanResult> {
  // Use scan() with stream input - it automatically handles routing to stream scanner
  const stream = createReadStream(filePath);
  const result = await scan(stream, {
    failFast: true,
    maxBufferSize: 10 * 1024 * 1024, // 10MB buffer
  });

  return {
    file: filePath,
    size: fileSize,
    verdict: result.verdict,
    findings: result.findings,
    durationMs: result.durationMs,
  };
}
