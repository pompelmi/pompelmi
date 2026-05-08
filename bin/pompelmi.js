#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const pkg = require('../package.json');

// ── Logo ──────────────────────────────────────────────────────────────────────

async function printLogo() {
  const titleLines = [
    '\x1b[33mpompelmi\x1b[0m — ClamAV Antivirus Scanning for Node.js',
    '\x1b[90mv' + pkg.version + ' • Zero dependencies • TCP • UNIX socket\x1b[0m',
  ];

  try {
    const terminalImage = (await import('terminal-image')).default;
    const imgPath = path.join(__dirname, '../src/grapefruit.png');
    if (fs.existsSync(imgPath)) {
      const image = await terminalImage.file(imgPath, {
        width: 24,
        preserveAspectRatio: true,
      });

      const rawLines = image.split('\n');
      // Drop trailing blank line that terminal-image appends
      const imgLines = rawLines[rawLines.length - 1].trim() === ''
        ? rawLines.slice(0, -1)
        : rawLines;
      const pad = '  ';
      const gap = '   ';
      const maxRows = Math.max(imgLines.length, titleLines.length);

      process.stdout.write('\n');
      for (let i = 0; i < maxRows; i++) {
        const imgPart  = imgLines[i]  ?? ' '.repeat(24);
        const textPart = i === 0 ? titleLines[0]
                       : i === 1 ? titleLines[1]
                       : '';
        process.stdout.write(pad + imgPart + gap + textPart + '\n');
      }
      process.stdout.write('\n');
      return;
    }
  } catch (_) {}

  // Fallback: text-only header
  console.log('\n\x1b[33m  pompelmi\x1b[0m — ClamAV Antivirus Scanning for Node.js');
  console.log('\x1b[90m  v' + pkg.version + ' • Zero dependencies • TCP • UNIX socket\x1b[0m\n');
}

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    command: null,
    target: null,
    host: undefined,
    port: undefined,
    socket: undefined,
    timeout: 15000,
    retries: 0,
    json: false,
    quiet: false,
    delete: false,
    recursive: true,
    report: false,
    reportOutput: null,
    shareCard: false,
    shareCardOutput: null,
    quarantine: null,
    scorecardConfig: null,
  };

  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === 'scan' || a === 'watch' || a === 'version' || a === 'help' || a === 'scorecard') {
      opts.command = a;
    } else if (a === '--json') {
      opts.json = true;
    } else if (a === '--quiet' || a === '-q') {
      opts.quiet = true;
    } else if (a === '--recursive' || a === '-r') {
      opts.recursive = true;
    } else if (a === '--delete') {
      opts.delete = true;
    } else if (a === '--host') {
      opts.host = args[++i];
    } else if (a === '--port') {
      opts.port = parseInt(args[++i], 10);
    } else if (a === '--socket') {
      opts.socket = args[++i];
    } else if (a === '--timeout') {
      opts.timeout = parseInt(args[++i], 10);
    } else if (a === '--retries') {
      opts.retries = parseInt(args[++i], 10);
    } else if (a === '--report') {
      opts.report = true;
    } else if (a === '--share-card') {
      opts.shareCard = true;
    } else if (a === '--output') {
      const next = args[++i];
      if (next && next.endsWith('.svg')) opts.shareCardOutput = next;
      else opts.reportOutput = next;
    } else if (a === '--quarantine') {
      opts.quarantine = args[++i];
    } else if (a === '--config') {
      opts.scorecardConfig = args[++i];
    } else if (!a.startsWith('-') && opts.command && !opts.target) {
      opts.target = a;
    }
    i++;
  }

  return opts;
}

// ── Scan options builder ──────────────────────────────────────────────────────

function buildScanOpts(opts) {
  const o = { timeout: opts.timeout, retries: opts.retries };
  if (opts.host !== undefined) o.host = opts.host;
  if (opts.port !== undefined) o.port = opts.port;
  if (opts.socket !== undefined) o.socket = opts.socket;
  return o;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function progressBar(done, total, infected) {
  const pct = total === 0 ? 0 : Math.floor((done / total) * 100);
  const filled = Math.floor(pct / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `  Scanning... [${bar}] ${pct}% • ${done}/${total} files • ${infected} infected`;
}

// ── Box drawing output ────────────────────────────────────────────────────────

function boxLine(content, width) {
  const padded = content.padEnd(width - 4);
  return `│  ${padded}  │`;
}

function printResults(results, elapsed, opts) {
  if (opts.json) {
    const out = {
      scanned: results.length,
      infected: results.filter(r => r.verdict === 'infected').length,
      errors: results.filter(r => r.verdict === 'error').length,
      time: Math.round(elapsed / 100) / 10,
      results: results.map(r => {
        const o = { file: r.file, verdict: r.verdict };
        if (r.viruses) o.viruses = r.viruses;
        return o;
      }),
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const W = 46;
  const top    = '┌' + '─'.repeat(W) + '┐';
  const sep    = '├' + '─'.repeat(W) + '┤';
  const bottom = '└' + '─'.repeat(W) + '┘';

  const infected = results.filter(r => r.verdict === 'infected').length;
  const secs     = (elapsed / 1000).toFixed(1);

  console.log(top);
  console.log(boxLine('🍊 pompelmi scan results', W));
  console.log(sep);

  for (const r of results) {
    if (opts.quiet && r.verdict === 'clean') continue;
    const short = r.file.length > 30 ? '...' + r.file.slice(-27) : r.file;
    if (r.verdict === 'clean') {
      console.log(boxLine(`\x1b[32m✅ CLEAN\x1b[0m     ${short}`, W + 9));
    } else if (r.verdict === 'infected') {
      console.log(boxLine(`\x1b[31m🚨 INFECTED\x1b[0m  ${short}`, W + 9));
      if (r.viruses && r.viruses.length) {
        const vname = r.viruses[0] || '';
        console.log(boxLine(`\x1b[90m     └─ ${vname}\x1b[0m`, W + 8));
      }
    } else {
      console.log(boxLine(`\x1b[33m⚠️  ERROR\x1b[0m    ${short}`, W + 12));
    }
  }

  console.log(sep);
  const summary = `Scanned: ${results.length}  • Infected: ${infected} • Time: ${secs}s`;
  console.log(boxLine(summary, W));
  console.log(bottom);
}

// ── Scan a single file ────────────────────────────────────────────────────────

async function scanOne(filePath, scanOpts) {
  const { scan }    = require('../src/ClamAVScanner.js');
  const { Verdict } = require('../src/verdicts.js');
  try {
    const v = await scan(filePath, scanOpts);
    if (v === Verdict.Clean)     return { file: filePath, verdict: 'clean' };
    if (v === Verdict.Malicious) return { file: filePath, verdict: 'infected', viruses: [] };
    return { file: filePath, verdict: 'error' };
  } catch (err) {
    if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|unreachable/i.test(err.message)) {
      return { file: filePath, verdict: 'error', _clamdUnreachable: true };
    }
    return { file: filePath, verdict: 'error' };
  }
}

// ── Collect files from path ───────────────────────────────────────────────────

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const entries = fs.readdirSync(target, { recursive: true });
  return entries
    .map(e => path.join(target, e))
    .filter(f => { try { return fs.statSync(f).isFile(); } catch { return false; } });
}

// ── Ask confirmation ──────────────────────────────────────────────────────────

function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes');
    });
  });
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdScan(opts) {
  if (!opts.target) {
    console.error('Usage: pompelmi scan <file|dir> [options]');
    process.exit(2);
  }

  const target = path.resolve(opts.target);
  if (!fs.existsSync(target)) {
    console.error(`Error: path not found: ${target}`);
    process.exit(2);
  }

  if (!opts.json && !opts.quiet) await printLogo();

  const files = collectFiles(target);
  const scanOpts = buildScanOpts(opts);
  const results = [];
  const start = Date.now();
  let infectedCount = 0;

  for (let i = 0; i < files.length; i++) {
    if (!opts.json && !opts.quiet && files.length > 1) {
      process.stdout.write('\r' + progressBar(i, files.length, infectedCount));
    }
    const r = await scanOne(files[i], scanOpts);
    if (r.verdict === 'infected') infectedCount++;
    results.push(r);
  }

  if (!opts.json && !opts.quiet && files.length > 1) {
    process.stdout.write('\r' + progressBar(files.length, files.length, infectedCount) + '\n');
  }

  const elapsed = Date.now() - start;

  if (opts.delete) {
    const infected = results.filter(r => r.verdict === 'infected');
    if (infected.length > 0) {
      if (!opts.json) {
        console.log(`\nFound ${infected.length} infected file(s):`);
        for (const r of infected) console.log(`  ${r.file}`);
      }
      const ok = await confirm('Delete these files? [y/N] ');
      if (ok) {
        for (const r of infected) {
          try { fs.unlinkSync(r.file); if (!opts.json) console.log(`  Deleted: ${r.file}`); }
          catch (e) { if (!opts.json) console.log(`  Failed to delete: ${r.file}: ${e.message}`); }
        }
      }
    }
  }

  printResults(results, elapsed, opts);

  if (opts.report) {
    const { generateDashboard } = require('../src/Dashboard.js');
    const outPath = opts.reportOutput || 'pompelmi-report.html';
    generateDashboard(results, {
      elapsed,
      host: opts.host,
      port: opts.port,
      socket: opts.socket,
      outputPath: outPath,
    });
    if (!opts.quiet) console.log(`\n  Report saved: ${outPath}`);
  }

  if (opts.shareCard) {
    const { generateShareCard } = require('../src/ShareCard.js');
    const outPath = opts.shareCardOutput || 'pompelmi-scan-card.svg';
    generateShareCard(results, { outputPath: outPath });
    if (!opts.quiet) console.log(`  Share card saved: ${outPath}`);
  }

  const hasInfected = results.some(r => r.verdict === 'infected');
  const hasError    = results.some(r => r.verdict === 'error');
  const clamdDown   = results.some(r => r._clamdUnreachable);

  if (clamdDown) process.exit(3);
  if (hasInfected) process.exit(1);
  if (hasError)    process.exit(2);
  process.exit(0);
}

async function cmdWatch(opts) {
  if (!opts.target) {
    console.error('Usage: pompelmi watch <dir> [options]');
    process.exit(2);
  }

  const target = path.resolve(opts.target);
  if (!fs.existsSync(target)) {
    console.error(`Error: directory not found: ${target}`);
    process.exit(2);
  }

  if (!opts.json && !opts.quiet) await printLogo();

  const { watch } = require('../src/Watcher.js');
  const quarantineDir = opts.quarantine ? path.resolve(opts.quarantine) : null;
  const watchOpts = { ...buildScanOpts(opts) };
  if (quarantineDir) watchOpts.quarantine = quarantineDir;

  let scanned = 0, clean = 0, infected = 0;

  function status() {
    process.stdout.write(
      `\rWatching ${target} • Scanned: ${scanned} • Clean: ${clean} • Infected: ${infected}  `
    );
  }

  status();

  watch(target, watchOpts, {
    onClean(fp) {
      scanned++; clean++;
      if (!opts.quiet) process.stdout.write(`\n\x1b[32m✅ CLEAN\x1b[0m  ${fp}\n`);
      status();
    },
    onMalicious(fp) {
      scanned++; infected++;
      process.stdout.write(`\n\x1b[31m🚨 INFECTED\x1b[0m  ${fp}\n`);
      if (quarantineDir && !opts.quiet) process.stdout.write(`   Quarantined to ${quarantineDir}\n`);
      status();
    },
    onError(err) {
      scanned++;
      if (!opts.quiet) process.stdout.write(`\n\x1b[33m⚠️ ERROR\x1b[0m  ${err.message}\n`);
      status();
    },
  });

  process.on('SIGINT', () => { process.stdout.write('\n'); process.exit(0); });
}

async function cmdScorecard(opts) {
  let config = {};
  if (opts.scorecardConfig) {
    const cfgPath = path.resolve(opts.scorecardConfig);
    if (!fs.existsSync(cfgPath)) {
      console.error(`Error: config file not found: ${cfgPath}`);
      process.exit(2);
    }
    config = require(cfgPath);
  }

  const { generateScorecard } = require('../src/Scorecard.js');
  const scorecard = await generateScorecard(config);

  const gradeColor = { A: '\x1b[32m', B: '\x1b[32m', C: '\x1b[33m', D: '\x1b[33m', F: '\x1b[31m' };
  const color = gradeColor[scorecard.grade] || '\x1b[0m';
  const reset = '\x1b[0m';

  if (!opts.quiet) await printLogo();

  console.log(`\n  Upload Security Scorecard\n`);
  console.log(`  Grade: ${color}${scorecard.grade}${reset}   Score: ${scorecard.score}/100\n`);

  for (const f of scorecard.findings) {
    const icon = f.status === 'pass' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${icon}  ${f.check.padEnd(40)} (weight: ${f.weight})`);
  }

  if (scorecard.recommendations.length > 0) {
    console.log(`\n  Recommendations:`);
    for (const r of scorecard.recommendations) {
      console.log(`    • ${r}`);
    }
  }

  console.log('');
}

function cmdVersion() {
  console.log(pkg.version);
}

function cmdHelp() {
  console.log(`
pompelmi v${pkg.version} — ClamAV Antivirus Scanning for Node.js

USAGE
  pompelmi <command> [options]

COMMANDS
  scan <file|dir>    Scan a file or directory for viruses
  watch <dir>        Watch a directory and auto-scan new/modified files
  scorecard          Grade your upload security configuration (A-F)
  version            Print version number
  help               Show this help message

SCAN OPTIONS
  --recursive, -r    Scan directory recursively (default: true)
  --host <host>      clamd host (default: localhost, uses local clamscan if omitted)
  --port <port>      clamd port (default: 3310)
  --socket <path>    UNIX socket path (e.g. /run/clamav/clamd.sock)
  --timeout <ms>     Connection timeout in ms (default: 15000)
  --retries <n>      Auto-retry on connection failure (default: 0)
  --json             Output results as JSON (no logo, no colors)
  --quiet, -q        Only print infected files and summary
  --delete           Delete infected files after confirmation
  --report           Generate an HTML security dashboard report
  --share-card       Generate a shareable SVG scan result card
  --output <file>    Output path for --report (default: pompelmi-report.html)
                     or --share-card (default: pompelmi-scan-card.svg)

WATCH OPTIONS
  --host, --port, --socket, --timeout   (same as scan)
  --quarantine <dir>  Move infected files to this directory (auto-created)

SCORECARD OPTIONS
  --config <file>     Path to a pompelmi.config.js file with your upload config

EXIT CODES
  0   All files clean
  1   Virus found
  2   Scan error
  3   clamd unreachable

EXAMPLES
  # Scan a single file (local clamscan)
  pompelmi scan ./upload.pdf

  # Scan a directory recursively
  pompelmi scan ./uploads --recursive

  # Scan via clamd over TCP
  pompelmi scan ./uploads --host 127.0.0.1 --port 3310

  # Scan via UNIX socket
  pompelmi scan ./uploads --socket /run/clamav/clamd.sock

  # JSON output for scripting
  pompelmi scan ./uploads --json

  # Watch a directory
  pompelmi watch ./uploads --host 127.0.0.1 --port 3310

  # Use with npx (no install required)
  npx pompelmi scan ./uploads

  # Watch a directory with quarantine
  pompelmi watch ./uploads --quarantine ./quarantine

  # Grade your upload security config
  npx pompelmi scorecard --config ./pompelmi.config.js
`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.command || opts.command === 'help') {
    await printLogo();
    cmdHelp();
    process.exit(0);
  }

  if (opts.command === 'version') {
    cmdVersion();
    process.exit(0);
  }

  if (opts.command === 'scan') {
    await cmdScan(opts);
    return;
  }

  if (opts.command === 'watch') {
    await cmdWatch(opts);
    return;
  }

  if (opts.command === 'scorecard') {
    await cmdScorecard(opts);
    return;
  }
}

main().catch(err => {
  console.error('\x1b[31mError:\x1b[0m', err.message);
  process.exit(2);
});
