import type { CAC } from 'cac';

const __resolveDeps = async () => {
  const HeuMod = await import("@pompelmi/engine-heuristics");

  const H = (HeuMod && (HeuMod as any).default) ? (HeuMod as any).default : (HeuMod as any);

  const composeScanners = H.composeScanners;
  const CommonHeuristicsScanner = H.CommonHeuristicsScanner ?? H.createHeuristicsScanner();

  if (!composeScanners) throw new Error('Scanner composition function not found. Please check your installation.');
  if (!CommonHeuristicsScanner) throw new Error('Heuristics scanner not found. Please check your installation.');

  return { composeScanners, CommonHeuristicsScanner };
};

const { composeScanners, CommonHeuristicsScanner } = await __resolveDeps();

export function addScanDirCommand(cli: CAC) {
  cli.command('scan:dir <root>', 'Recursively scan a directory for threats')
    .alias('scandir')
    .option('--ext <list>', 'Comma-separated file extensions to scan (e.g. zip,pdf,exe)', { default: '' })
    .option('--ignore <globs>', 'Comma-separated ignore patterns', { 
      default: '**/node_modules/**,**/.pnpm/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/target/**' 
    })
    .option('--concurrency <n>', 'Number of parallel scans (1-32)', { default: 4 })
    .option('--format <fmt>', 'Output format: table, json', { default: 'table' })
    .option('--progress', 'Show live progress bar', { default: true })
    .option('--max-files <n>', 'Maximum number of files to scan (safety limit)', { default: 10000 })
    .option('--quiet-clean', 'Hide clean files from output', { default: false })
    .example('pompelmi scan:dir ./downloads')
    .example('pompelmi scan:dir /tmp --ext pdf,exe,zip --concurrency 4')
    .example('pompelmi scan:dir . --ignore "**/*.log,**/cache/**" --format json')
    .action(async (root: string, flags: any) => {
      const path = await import('node:path');
      const fs = await import('node:fs/promises');
      const fsSync = await import('node:fs');
      const pc = (await import('picocolors')).default;
      const prettyBytes = (await import('pretty-bytes')).default;
      
      // Validate root directory
      if (!fsSync.existsSync(root)) {
        console.error(pc.red(`❌ Directory not found: ${root}`));
        process.exit(1);
      }
      
      if (!fsSync.statSync(root).isDirectory()) {
        console.error(pc.red(`❌ Path is not a directory: ${root}`));
        console.error(pc.dim('💡 Use "scan" command for individual files'));
        process.exit(1);
      }

      // Parse and validate options
      const exts = String(flags.ext||'').split(',').map((s:string)=>s.trim().replace(/^\./,'').toLowerCase()).filter(Boolean);
      const ignores = String(flags.ignore||'').split(',').map((s:string)=>s.trim()).filter(Boolean)
        .map(g=> new RegExp(g.replace(/[.+^${}()|[\\]\\\\]/g,'\\\\$&').replace(/\\*\\*/g,'.*').replace(/\\*/g,'[^/]*')));
      const concurrency = Math.max(1, Math.min(32, Number(flags.concurrency) || 4));
      const maxFiles = Math.max(1, Number(flags.maxFiles) || 10000);
      const showProgress = flags.progress !== false && process.stderr.isTTY;

      const norm = (p:string)=>p.split(path.sep).join('/');
      const shouldIgnore = (p:string)=>ignores.some(r=>r.test(norm(path.relative(root, p))));
      const shouldKeep = (file:string)=> !exts.length ? true : exts.includes(path.extname(file).slice(1).toLowerCase());

      async function collect(dir:string): Promise<string[]> {
        const out:string[] = [];
        const stack=[dir];
        let totalChecked = 0;
        
        while (stack.length && out.length < maxFiles) {
          const cur = stack.pop()!;
          if (shouldIgnore(cur)) continue;
          
          let entries;
          try { 
            entries = await fs.readdir(cur, { withFileTypes:true }); 
            totalChecked++;
            
            if (showProgress && totalChecked % 50 === 0) {
              process.stderr.write(`\\r🔍 Indexing... found ${out.length} files`);
            }
          } catch (err: any) { 
            continue; 
          }
          
          for (const d of entries) {
            const full = path.join(cur, d.name);
            if (shouldIgnore(full)) continue;
            
            if (d.isDirectory()) { 
              stack.push(full); 
              continue; 
            }
            
            if (d.isFile() && shouldKeep(full)) {
              out.push(full);
              if (out.length >= maxFiles) {
                console.warn(pc.yellow(`⚠️  Reached maximum file limit (${maxFiles}). Use --max-files to increase.`));
                break;
              }
            }
          }
        }
        
        if (showProgress) {
          process.stderr.write('\\r' + ' '.repeat(50) + '\\r');
        }
        
        return out;
      }

      console.log(`🗂️  ${pc.bold('Scanning directory:')} ${root}`);
      if (exts.length > 0) {
        console.log(`📁 ${pc.dim('File types:')} ${exts.join(', ')}`);
      }
      
      const indexStart = Date.now();
      const files = await collect(root);
      const indexTime = Date.now() - indexStart;
      
      if (files.length === 0) {
        console.log(pc.yellow('⚠️  No matching files found'));
        process.exit(0);
      }
      
      console.log(`📋 Found ${pc.bold(files.length.toString())} files to scan ${pc.dim(`(${(indexTime/1000).toFixed(1)}s)`)}`);

      // Initialize scanner
      const scanners = [CommonHeuristicsScanner];
      const composedScanner = composeScanners(scanners);

      const scanFile = async (filePath: string) => {
        const buffer = fsSync.readFileSync(filePath);
        const bytes = new Uint8Array(buffer);
        const matches = await composedScanner.scan(bytes);
        
        let verdict: 'clean' | 'suspicious' | 'malicious' = 'clean';
        if (matches.length > 0) {
          const hasHighSeverity = matches.some(m => (m as any).severity === 'high');
          verdict = hasHighSeverity ? 'malicious' : 'suspicious';
        }
        
        return { verdict, matches };
      };

      const results:any[] = new Array(files.length);
      let done=0, susp=0, mal=0;
      const total = files.length;
      const threats = { clean: 0, suspicious: 0, malicious: 0 };
      const scanStart = Date.now();

      let progressTimer:NodeJS.Timeout|undefined;
      if (showProgress) {
        progressTimer = setInterval(()=> {
          const pct = total ? ((done/total)*100).toFixed(1) : '100.0';
          process.stderr.write(`\\r🔍 ${pct}% │ ${done}/${total} │ ⚠️ ${susp} │ 🚨 ${mal}   `);
        }, 250);
      }

      let idx = 0;
      async function worker() {
        while (true) {
          const i = idx++; 
          if (i >= total) break;
          
          const f = files[i];
          try {
            const size = fsSync.existsSync(f) ? fsSync.statSync(f).size : 0;
            const startScan = Date.now();
            const r = await scanFile(f);
            const scanTime = Date.now() - startScan;
            
            results[i] = { file: f, size, verdict: r.verdict, matches: r.matches, scanTime };
            threats[r.verdict as keyof typeof threats]++;
            
            if (r.verdict==='malicious') mal++; 
            else if (r.verdict==='suspicious') susp++;
            
          } catch (error: any) {
            results[i] = { 
              file: f, 
              size: 0, 
              verdict: 'error', 
              matches: [], 
              scanTime: 0,
              error: error.message 
            };
          }
          
          done++;
        }
      }

      console.log(`🚀 Starting scan with ${concurrency} workers...\\n`);
      await Promise.all(Array.from({length: concurrency}, ()=>worker()));
      
      if (progressTimer) { 
        clearInterval(progressTimer); 
        process.stderr.write('\\r' + ' '.repeat(50) + '\\r'); 
      }

      const totalScanTime = Date.now() - scanStart;
      const validResults = results.filter(r => r.verdict !== 'error');

      // Output results
      if (flags.format === 'json') {
        const output = {
          summary: {
            directory: root,
            total: total,
            clean: threats.clean,
            suspicious: threats.suspicious, 
            malicious: threats.malicious,
            errors: total - validResults.length,
            scanTime: totalScanTime
          },
          results: results
        };
        console.log(JSON.stringify(output, null, 2));
      } else {
        // Summary
        const elapsed = (totalScanTime / 1000).toFixed(1);
        
        console.log(`\\n📊 ${pc.bold('Scan Complete')} (${elapsed}s)`);
        console.log(`   Total files: ${total}`);
        console.log(`   ${pc.green('✅ Clean')}: ${threats.clean}`);
        if (threats.suspicious > 0) console.log(`   ${pc.yellow('⚠️  Suspicious')}: ${threats.suspicious}`);
        if (threats.malicious > 0) console.log(`   ${pc.red('🚨 Malicious')}: ${threats.malicious}`);

        // Show flagged files
        const flaggedResults = results.filter(r => 
          (r.verdict !== 'clean' && r.verdict !== 'error') || 
          (!flags.quietClean && r.verdict !== 'error')
        );
        
        if (flaggedResults.length > 0 && flaggedResults.length <= 20) {
          console.log(`\\n📋 ${pc.bold('Detailed Results')}`);
          
          flaggedResults.forEach(r => {
            const icon = r.verdict === 'malicious' ? '🚨' : r.verdict === 'suspicious' ? '⚠️ ' : '✅';
            const verdict = r.verdict === 'malicious' ? pc.red(pc.bold('MALICIOUS')) :
                           r.verdict === 'suspicious' ? pc.yellow('SUSPICIOUS') :
                           pc.green('CLEAN');
            
            const relPath = path.relative(root, r.file);
            console.log(`${icon} ${pc.bold(relPath)} ${pc.dim(`(${prettyBytes(r.size)})`)}`);
            
            if (r.matches?.length > 0) {
              r.matches.slice(0, 3).forEach((match: any) => {
                console.log(`    • ${match.rule}`);
              });
              if (r.matches.length > 3) {
                console.log(`    ${pc.dim(`... and ${r.matches.length - 3} more`)}`);
              }
            }
          });
        }

        // Final recommendations
        if (threats.malicious > 0) {
          console.log(`\\n${pc.red('🚨 CRITICAL:')} ${threats.malicious} malicious files detected!`);
        } else if (threats.suspicious > 0) {
          console.log(`\\n${pc.yellow('⚠️  WARNING:')} ${threats.suspicious} suspicious files detected.`);
        } else {
          console.log(`\\n${pc.green('✅ Directory appears clean!')}`);
        }
        
        console.log(pc.dim(`\\n💡 Use --format json for machine-readable output`));
      }

      process.exit(threats.malicious > 0 ? 2 : 0);
    });
}
