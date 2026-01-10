import { watch } from 'chokidar';
import { scan } from '@pompelmi/core';
import { createReadStream, statSync } from 'node:fs';
import { relative } from 'node:path';
import * as pc from 'picocolors';

export interface WatchOptions {
  ext?: string;
  debounce: number;
}

/**
 * Watch command handler for development
 */
export async function watchCommand(directory: string, options: WatchOptions) {
  console.log(pc.cyan('👀 Watching for file changes...'));
  console.log(pc.dim('─'.repeat(60)));
  console.log(`📁 Directory: ${directory}`);
  if (options.ext) {
    console.log(`📋 Extensions: ${options.ext}`);
  }
  console.log(pc.dim('─'.repeat(60)));
  console.log('');

  const extensions = options.ext
    ? options.ext.split(',').map(e => e.trim().toLowerCase().replace(/^\./, ''))
    : undefined;

  const pattern = extensions
    ? `${directory}/**/*.{${extensions.join(',')}}`
    : `${directory}/**/*`;

  const watcher = watch(pattern, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });

  let debounceTimer: NodeJS.Timeout | null = null;
  const pendingScans = new Set<string>();

  const performScan = async (filePath: string) => {
    try {
      const stats = statSync(filePath);
      const stream = createReadStream(filePath);
      const result = await scan(stream);

      const statusIcon =
        result.verdict === 'malicious' ? pc.red('🚨') :
        result.verdict === 'suspicious' ? pc.yellow('⚠️ ') :
        pc.green('✅');

      const timestamp = new Date().toLocaleTimeString();
      console.log(`${pc.dim(timestamp)} ${statusIcon} ${relative(directory, filePath)}`);

      if (result.findings.length > 0) {
        result.findings.forEach(finding => {
          console.log(`  ${pc.yellow('→')} ${finding}`);
        });
      }
    } catch (error) {
      console.log(`${pc.red('✗')} ${relative(directory, filePath)} - ${pc.red('Error')}`);
    }
  };

  const debouncedScan = (filePath: string) => {
    pendingScans.add(filePath);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      const files = Array.from(pendingScans);
      pendingScans.clear();

      for (const file of files) {
        await performScan(file);
      }
    }, options.debounce);
  };

  watcher
    .on('add', debouncedScan)
    .on('change', debouncedScan)
    .on('error', error => console.error(pc.red('Watcher error:'), error));

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n' + pc.yellow('👋 Stopping watcher...'));
    watcher.close();
    process.exit(0);
  });
}
