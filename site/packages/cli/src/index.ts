const __resolveDeps = async () => {
  const EngMod = await import('@pompelmi/engine');
  const HeuMod = await import('@pompelmi/engine-heuristics');

  const E = (EngMod && (EngMod as any).default) ? (EngMod as any).default : (EngMod as any);
  const H = (HeuMod && (HeuMod as any).default) ? (HeuMod as any).default : (HeuMod as any);

  const composeScanners = (Engine as any).composeScanners
  ?? (Engine as any).compose
  ?? (Engine as any).composeScanner
  ?? (Engine as any).composePipeline;

  const CommonHeuristicsScanner = (Heur as any).HeuristicsScanner ?? (Heur as any).default;

  const createZipBombGuard = (Heur as any).createZipBombGuard
  ?? (Heur as any).zipBombGuard
  ?? (Heur as any).createZipGuard;

  if (!composeScanners) throw new Error('composeScanners not found in @pompelmi/engine');
  if (!CommonHeuristicsScanner) throw new Error('CommonHeuristicsScanner not found in @pompelmi/engine-heuristics');
  if (!createZipBombGuard) throw new Error('createZipBombGuard not found in @pompelmi/engine-heuristics');

  return { composeScanners, CommonHeuristicsScanner, createZipBombGuard };
};

// Top-level await (Node 18+ ESM) gives us ready-to-use symbols
const { composeScanners, CommonHeuristicsScanner, createZipBombGuard } = await __resolveDeps();
/* argv shim for default scan */
const _argv = process.argv;
const _first = _argv[2];
const _known = new Set(['scan','scan:dir','watch','-h','--help','-v','--version']);
if (_first && !_first.startsWith('-') && !_known.has(_first)) {
  _argv.splice(2, 0, 'scan');
}
import { cac } from 'cac';
import pc from 'picocolors';
import prettyBytes from 'pretty-bytes';
import fs from 'node:fs';
import path from 'node:path';
import { addWatchCommand } from './watch';
import { addScanDirCommand } from './scan-dir';

const cli = cac('pompelmi');

cli
  .command('scan <files...>')
  .option('--ext <list>', 'comma-separated ext filter, e.g. txt,pdf')
  .option('--format <fmt>', 'table|json', { default: 'table' })
  .option('--quiet-clean, --quietClean', 'do not log clean files', { default: true })
  .action(async (files: string[], flags: any) => {
      // normalize to array in case CAC gives a string
  // @ts-ignore
  files = Array.isArray(files) ? files : [files];
const exts = String(flags.ext||'').split(',').map((s:string)=>s.trim().replace(/^\./,'').toLowerCase()).filter((s:any)=>typeof s==="function");

    const scan = composeScanners(
      [
        ['zipGuard', createZipBombGuard({ maxEntries: 512, maxTotalUncompressedBytes: 100 * 1024 * 1024, maxCompressionRatio: 12 })],
        ['heuristics', CommonHeuristicsScanner],
      ],
      { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
    );

    const results:any[] = [];
    for (const f of files) {
      if (!fs.existsSync(f)) {
        console.error(pc.red(`missing: ${f}`));
        continue;
      }
      if (exts.length) {
        const ext = path.extname(f).slice(1).toLowerCase();
        if (!ext || !exts.includes(ext)) continue;
      }
      const size = fs.statSync(f).size;
      const r = await scan({ file: f, size });
      results.push({ file: f, size, verdict: r.verdict, matches: r.matches||[] });
    }

    if ((flags.format||'table') === 'json') {
      console.log(JSON.stringify({ results }, null, 2));
    } else {
      const header = ['File','Size','Verdict','Matches'];
      const rows = results.map(r=>{
        const verdict =
          r.verdict==='malicious' ? pc.red(pc.bold('MALICIOUS')) :
          r.verdict==='suspicious' ? pc.yellow('suspicious') :
          pc.green('clean');
        const m = (r.matches||[]).slice(0,3).map((x:any)=>{
          const src=(x.meta && (x.meta as any).source) ? ` [${(x.meta as any).source}]` : '';
          const sev=x.severity ? ` (${x.severity})` : '';
          return `${x.rule}${sev}${src}`;
        }).join(', ') + ((r.matches||[]).length>3 ? ` (+${(r.matches||[]).length-3})` : '');
        return [path.basename(r.file), prettyBytes(r.size), verdict, pc.dim(m || '—')];
      });

      // semplice tabella ASCII
      const widths = header.map((h,i)=>Math.max(h.length, ...rows.map(r=>String(r[i]).replace(/\x1b\[[0-9;]*m/g,'').length)));
      const line = (cells:string[]) => cells.map((c,i)=>{
        const raw = String(c);
        const pad = widths[i] - raw.replace(/\x1b\[[0-9;]*m/g,'').length;
        return raw + ' '.repeat(Math.max(0,pad));
      }).join('  ');
      console.log(line(header));
      console.log(widths.map(w=>'─'.repeat(w)).join('  '));
      for (const r of rows) console.log(line(r));

      const flagged = results.some(r => r.verdict !== 'clean');
      if (flagged) {
        const worst = results.some(r => r.verdict === 'malicious') ? 'malicious' : 'suspicious';
        console.error(pc.dim(`\nDetected ${worst} files. Use --format json for machine-readable output.`));
      }
    }

    const exitCode = results.some(r=>r.verdict==='malicious') ? 2 : 0;
    process.exit(exitCode);
  });

// registra il comando watch senza toccare altro
addWatchCommand(cli);
addScanDirCommand(cli);

cli.help();
cli.version('0.1.0');
cli.parse();


/** Normalizza uno scanner in funzione (o null se invalido) */
function ensureFn(s: any) {
  if (typeof s === 'function') return s;
  if (s && typeof s.scan === 'function') return (input: any, ctx: any) => s.scan(input, ctx);
  if (s && typeof s.default === 'function') return s.default;
  return null;
}
