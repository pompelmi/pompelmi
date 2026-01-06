const __resolveDeps = async () => {
  const EngMod = import("@pompelmi/engine");
  const HeuMod = import("@pompelmi/engine-heuristics");

  const E = (EngMod && (EngMod as any).default) ? (EngMod as any).default : (EngMod as any);
  const H = (HeuMod && (HeuMod as any).default) ? (HeuMod as any).default : (HeuMod as any);

  const composeScanners =
      E.composeScanners ?? E.compose ?? E.composeScanner ?? E.composePipeline;

  const CommonHeuristicsScanner =
      H.CommonHeuristicsScanner ?? H.HeuristicsScanner ?? H.default ?? H;

  const createZipBombGuard =
      H.createZipBombGuard ?? H.zipBombGuard ?? H.createZipGuard;

  if (!composeScanners) throw new Error('composeScanners not found in @pompelmi/engine');
  if (!CommonHeuristicsScanner) throw new Error('CommonHeuristicsScanner not found in @pompelmi/engine-heuristics');
  if (!createZipBombGuard) throw new Error('createZipBombGuard not found in @pompelmi/engine-heuristics');

  return { composeScanners, CommonHeuristicsScanner, createZipBombGuard };
};

// Top-level await (Node 18+ ESM) gives us ready-to-use symbols
const { composeScanners, CommonHeuristicsScanner, createZipBombGuard } = await __resolveDeps();
import type { CAC } from 'cac';

export function addWatchCommand(cli: CAC) {
  cli.command('watch [pattern]')
    .option('--ext <list>', 'comma-separated ext filter, e.g. zip,pdf')
    .option('--ignore <globs>', 'comma-separated ignore globs', { default: '**/node_modules/**,**/.pnpm/**,**/.git/**' })
    .option('--debounce <ms|off>', 'wait for writes to settle (default 300ms)', { default: 300 })
    .option('--timeout <dur>', 'auto-exit on idle, e.g. 10s, 2m, 0=never')
    .option('--once', 'exit after the first handled event')
    .option('--max-events <n>', 'exit after N handled events (0=never)', { default: 0 })
    .option('--quiet-clean', 'do not log clean files', { default: true })
    .option('--progress', 'show transient scanning line', { default: true })
    .action(async (pattern: string | undefined, flags: any) => {
      const path = await import('node:path');
      const chokidar = (await import('chokidar')).default;
      const pc = (await import('picocolors')).default;

      const parseDuration = (x:any): number|undefined => {
        if (x===undefined||x===null) return undefined;
        const s=String(x).trim(); if(!s) return undefined;
        if (s==='0') return 0;
        const m=/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i.exec(s); if(!m) return undefined;
        const v=parseFloat(m[1]); const u=(m[2]||'ms').toLowerCase();
        return u==='h'?v*3600000:u==='m'?v*60000:u==='s'?v*1000:v;
      };

      const ignored = String(flags.ignore||'').split(',').map((s:string)=>s.trim()).filter(Boolean);
      const exts = String(flags.ext||'').split(',').map((s:string)=>s.trim().replace(/^\./,'').toLowerCase()).filter(Boolean);
      const awaitWriteFinish = (String(flags.debounce)==='off')
        ? false
        : { stabilityThreshold: Number(flags.debounce)||300, pollInterval: 50 };

      const Engine = import("@pompelmi/engine");
const Heur = import("@pompelmi/engine-heuristics");
      const scan = composeScanners(
        [
          ['zipGuard', createZipBombGuard({ maxEntries: 512, maxTotalUncompressedBytes: 100 * 1024 * 1024, maxCompressionRatio: 12 })],
          ['heuristics', CommonHeuristicsScanner],
        ],
        { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
      );

      const shouldKeep = (file:string) => {
        if (!exts.length) return true;
        const ext = path.extname(file).slice(1).toLowerCase();
        return !!ext && exts.includes(ext);
      };

      const watcher = chokidar.watch(pattern || '**/*', {
        ignoreInitial: true,          // 👈 niente tempesta iniziale
        ignored,
        awaitWriteFinish,
        persistent: true,
      });

      const log = (...a:any[]) => console.log(`[${new Date().toISOString()}]`, ...a);
      log(`watching ${pattern || '**/*'} (ignored: ${ignored.join(' | ')}) — Ctrl+C to stop`);

      let events = 0;
      let worst:'clean'|'suspicious'|'malicious' = 'clean';
      const maxEvents = Number(flags.maxEvents||0);
      const tMs = parseDuration(flags.timeout);
      let idleTimer:NodeJS.Timeout|undefined;
      const resetIdle = () => {
        if (tMs===undefined || tMs===0) return;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(()=> {
          log(pc.dim(`idle timeout ${flags.timeout} — exiting`));
          process.exit(worst==='malicious'?2:0);
        }, tMs);
      };
      resetIdle();

      async function handle(file:string, evt:'add'|'change') {        if (flags.progress) {
          const rel = (await import('node:path')).then(p=>p.relative(process.cwd(), file));
          const pc = (await import('picocolors')).then(m=>m.default);
          Promise.all([rel, pc]).then(([relPath, pcc])=>{
            console.log(`⏳ scanning ${relPath} …`);
          });
        }

        if (!shouldKeep(file)) return;

        const r = await scan({ file, size: 0 });

        if (r.verdict==='malicious') worst='malicious';
        else if (r.verdict==='suspicious' && worst==='clean') worst='suspicious';

        if (!flags.quietClean || r.verdict!=='clean') {
          const verdict =
            r.verdict==='malicious' ? pc.red(pc.bold('MALICIOUS')) :
            r.verdict==='suspicious' ? pc.yellow('suspicious') :
            pc.green('clean');

          const m = r.matches.slice(0,3).map((x:any)=>{
            const src=(x.meta && (x.meta as any).source) ? ` [${(x.meta as any).source}]` : '';
            const sev=x.severity ? ` (${x.severity})` : '';
            return `${x.rule}${sev}${src}`;
          }).join(', ') + (r.matches.length>3 ? ` (+${r.matches.length-3})` : '');

          log(`${evt} ${path.relative(process.cwd(), file)}  ${verdict}  ${pc.dim(m || '—')}`);
        }

        events++; resetIdle();
        if (flags.once || (maxEvents>0 && events>=maxEvents)) {
          const reason = flags.once ? 'once' : `max-events=${maxEvents}`;
          log(pc.dim(`exit on ${reason} (worst=${worst})`));
          process.exit(worst==='malicious'?2:0);
        }
      }

      watcher.on('add', (f:string)=>void handle(f,'add'));
      watcher.on('change', (f:string)=>void handle(f,'change'));
    });
}
