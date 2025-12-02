import { cac } from 'cac';
import pc from 'picocolors';
import prettyBytes from 'pretty-bytes';
import fs from 'node:fs';
import path from 'node:path';
import { addWatchCommand } from './watch';
import { addScanDirCommand } from './scan-dir';

const __resolveDeps = async () => {
  try {
    const HeuMod = await import('@pompelmi/engine-heuristics');

    const H = (HeuMod && (HeuMod as any).default) ? (HeuMod as any).default : (HeuMod as any);

    const composeScanners = H.composeScanners;
    const CommonHeuristicsScanner = H.CommonHeuristicsScanner ?? H.createHeuristicsScanner();

    if (!composeScanners) throw new Error('🔍 Scanner composition function not found. Please check your installation.');
    if (!CommonHeuristicsScanner) throw new Error('🧠 Heuristics scanner not found. Please check your installation.');

    return { composeScanners, CommonHeuristicsScanner };
  } catch (error: any) {
    console.error(pc.red(`❌ Failed to initialize Pompelmi:`));
    console.error(pc.dim(`   ${error.message}`));
    console.error(pc.dim(`\n💡 Try reinstalling with: npm install -g @pompelmi/cli`));
    process.exit(1);
  }
};

// Graceful startup with error handling
const deps = await __resolveDeps();
const { composeScanners, CommonHeuristicsScanner } = deps;

/* Smart command detection - default to scan for file arguments */
const _argv = process.argv;
const _first = _argv[2];
const _known = new Set(['scan','scan:dir','watch','help','-h','--help','-v','--version']);
if (_first && !_first.startsWith('-') && !_known.has(_first)) {
  // Check if it looks like a file path
  if (_first.includes('/') || _first.includes('.') || fs.existsSync(_first)) {
    _argv.splice(2, 0, 'scan');
  }
}

const cli = cac('pompelmi');

// Enhanced CLI configuration
cli
  .usage('[command] [options]')
  .option('--verbose', 'Enable verbose output')
  .option('--no-color', 'Disable colored output')
  .help(sections => {
    const examples = [
      'pompelmi document.pdf                    # Quick scan single file',
      'pompelmi scan *.exe --format json       # Scan executables with JSON output', 
      'pompelmi scan:dir ./downloads --progress # Scan directory with progress',
      'pompelmi watch --ext pdf,doc,zip        # Watch for new files'
    ];
    
    return sections
      .map(section => {
        if (section.title === 'Commands:') {
          return {
            ...section,
            body: section.body + `\n\n${pc.bold('Examples:')}\n${examples.map(ex => `  ${pc.dim('$')} ${ex}`).join('\n')}`
          };
        }
        return section;
      });
  });

cli
  .command('scan <files...>', 'Scan files for security threats and malware')
  .option('--ext <list>', 'Comma-separated file extensions to scan (e.g. exe,pdf,zip)')
  .option('--format <fmt>', 'Output format: table, json, plain', { default: 'table' })
  .option('--quiet-clean', 'Hide clean files from output', { default: false })
  .option('--no-progress', 'Disable progress indicators')
  .option('--timeout <ms>', 'Timeout per file in milliseconds', { default: 5000 })
  .option('--strict', 'Exit with error code on suspicious files (not just malicious)')
  .example('pompelmi scan document.pdf')
  .example('pompelmi scan --ext exe,dll *.* --format json')
  .example('pompelmi scan suspicious-files/ --quiet-clean')
  .action(async (files: string[], flags: any) => {
    // Validate and normalize inputs
    files = Array.isArray(files) ? files : [files];
    const exts = flags.ext ? String(flags.ext).split(',').map((s:string)=>s.trim().replace(/^\./,'').toLowerCase()).filter(Boolean) : [];
    const timeoutMs = Math.max(1000, Number(flags.timeout) || 5000);
    const showProgress = !flags.noProgress && process.stderr.isTTY;

    // Expand file patterns and validate existence
    const validFiles = [];
    const errors = [];
    
    for (const pattern of files) {
      if (fs.existsSync(pattern)) {
        const stat = fs.statSync(pattern);
        if (stat.isFile()) {
          if (exts.length === 0 || exts.includes(path.extname(pattern).slice(1).toLowerCase())) {
            validFiles.push(pattern);
          }
        } else if (stat.isDirectory()) {
          errors.push(`📁 ${pattern} is a directory. Use 'scan:dir' command for directories.`);
        }
      } else {
        errors.push(`📄 File not found: ${pattern}`);
      }
    }

    // Report errors and exit if no valid files
    if (errors.length > 0) {
      console.error(pc.red('❌ Errors found:'));
      errors.forEach(err => console.error(pc.dim(`   ${err}`)));
      if (validFiles.length === 0) {
        console.error(pc.dim('\n💡 Use --help for usage examples'));
        process.exit(1);
      }
    }

    if (validFiles.length === 0) {
      console.error(pc.yellow('⚠️  No files to scan'));
      process.exit(0);
    }

    // Initialize scanner with enhanced configuration
    const scanners = [CommonHeuristicsScanner];
    const composedScanner = composeScanners(scanners);

    // Simple file scanner function
    const scanFile = async (filePath: string) => {
      const buffer = fs.readFileSync(filePath);
      const bytes = new Uint8Array(buffer);
      const matches = await composedScanner.scan(bytes);
      
      // Determine verdict based on matches
      let verdict: 'clean' | 'suspicious' | 'malicious' = 'clean';
      if (matches.length > 0) {
        const hasHighSeverity = matches.some(m => (m as any).severity === 'high');
        verdict = hasHighSeverity ? 'malicious' : 'suspicious';
      }
      
      return { verdict, matches };
    };

    // Progress tracking
    let processed = 0;
    let startTime = Date.now();
    const results:any[] = [];
    const threats = { malicious: 0, suspicious: 0, clean: 0 };

    if (showProgress && validFiles.length > 1) {
      console.log(`🔍 Scanning ${validFiles.length} files...\n`);
    }

    // Process files with progress indication
    for (const file of validFiles) {
      const fileName = path.basename(file);
      
      if (showProgress) {
        const progress = `[${processed + 1}/${validFiles.length}]`;
        process.stderr.write(`\r${progress} 🔍 ${fileName}...`);
      }

      try {
        const size = fs.statSync(file).size;
        const startScan = Date.now();
        const result = await scanFile(file);
        const scanTime = Date.now() - startScan;
        
        const fileResult = { 
          file, 
          size, 
          verdict: result.verdict, 
          matches: result.matches || [],
          scanTime
        };
        
        results.push(fileResult);
        threats[result.verdict as keyof typeof threats]++;
        processed++;
        
      } catch (error: any) {
        console.error(`\n${pc.red('❌ Error scanning')} ${fileName}: ${error.message}`);
        processed++;
      }
    }

    if (showProgress) {
      process.stderr.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line
    }

    // Output results
    if (flags.format === 'json') {
      const output = {
        summary: {
          total: validFiles.length,
          clean: threats.clean,
          suspicious: threats.suspicious,
          malicious: threats.malicious,
          scanTime: Date.now() - startTime
        },
        results
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      // Display summary
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n📊 ${pc.bold('Scan Summary')} (${elapsed}s)`);
      console.log(`   Total files: ${validFiles.length}`);
      console.log(`   ${pc.green('✅ Clean')}: ${threats.clean}`);
      if (threats.suspicious > 0) console.log(`   ${pc.yellow('⚠️  Suspicious')}: ${threats.suspicious}`);
      if (threats.malicious > 0) console.log(`   ${pc.red('🚨 Malicious')}: ${threats.malicious}`);

      // Display detailed results for flagged files
      const flaggedResults = results.filter(r => r.verdict !== 'clean' || !flags.quietClean);
      
      if (flaggedResults.length > 0) {
        console.log(`\n📋 ${pc.bold('Detailed Results')}`);
        
        for (const r of flaggedResults) {
          const icon = r.verdict === 'malicious' ? '🚨' : r.verdict === 'suspicious' ? '⚠️ ' : '✅';
          const verdict = r.verdict === 'malicious' ? pc.red(pc.bold('MALICIOUS')) :
                         r.verdict === 'suspicious' ? pc.yellow('SUSPICIOUS') :
                         pc.green('CLEAN');
          
          const relPath = path.relative(process.cwd(), r.file);
          console.log(`\n${icon} ${pc.bold(relPath)} ${pc.dim(`(${prettyBytes(r.size)})`)}`);  
          console.log(`   Status: ${verdict} ${pc.dim(`${r.scanTime}ms`)}`);
          
          if (r.matches.length > 0) {
            console.log(`   Threats detected:`);
            r.matches.slice(0, 5).forEach((match: any) => {
              const source = match.meta?.source ? pc.dim(` [${match.meta.source}]`) : '';
              const severity = match.severity ? pc.dim(` (${match.severity})`) : '';
              console.log(`     • ${match.rule}${severity}${source}`);
            });
            if (r.matches.length > 5) {
              console.log(`     ${pc.dim(`... and ${r.matches.length - 5} more`)}`);
            }
          }
        }
      }

      // Final recommendation
      if (threats.malicious > 0) {
        console.log(`\n${pc.red('🚨 CRITICAL:')} Malicious files detected! Quarantine immediately.`);
      } else if (threats.suspicious > 0) {
        console.log(`\n${pc.yellow('⚠️  WARNING:')} Suspicious files detected. Review carefully.`);
      } else {
        console.log(`\n${pc.green('✅ All files appear clean!')}`);
      }
      
      console.log(pc.dim(`\n💡 Use --format json for machine-readable output`));
    }

    // Exit with appropriate code
    const hasErrors = threats.malicious > 0 || (flags.strict && threats.suspicious > 0);
    process.exit(hasErrors ? 2 : 0);
  });

// Add enhanced commands
addWatchCommand(cli);
addScanDirCommand(cli);

// Version and final setup
cli.version('0.23.0', '-v, --version', 'Display version information');

// Handle no command gracefully
cli.command('[...files]', 'Default scan command', { allowUnknownOptions: false, ignoreOptionDefaultValue: true })
  .action((files: string[]) => {
    if (files.length === 0) {
      console.log(`${pc.bold('🛡️  Pompelmi Security Scanner')} v0.23.0\n`);
      console.log('Fast, reliable malware detection for your files.\n');
      console.log(`${pc.bold('Quick Start:')}`);
      console.log(`  ${pc.dim('$')} pompelmi document.pdf           # Scan a single file`);
      console.log(`  ${pc.dim('$')} pompelmi scan:dir ./downloads   # Scan entire directory`);
      console.log(`  ${pc.dim('$')} pompelmi watch                 # Watch for file changes\n`);
      console.log(`Use ${pc.cyan('pompelmi --help')} for complete documentation.`);
      console.log(`Report issues: ${pc.underline('https://github.com/pompelmi/pompelmi/issues')}`);
      return;
    }
    // Redirect to scan command
    process.argv.splice(2, 0, 'scan');
    cli.parse();
  });

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error(pc.red('❌ Unexpected error:'), error.message);
  console.error(pc.dim('Please report this issue at: https://github.com/pompelmi/pompelmi/issues'));
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error(pc.red('❌ Unhandled error:'), reason?.message || reason);
  console.error(pc.dim('Please report this issue at: https://github.com/pompelmi/pompelmi/issues'));
  process.exit(1);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log(pc.dim('\n\n👋 Scan interrupted by user'));
  process.exit(0);
});

cli.parse();

