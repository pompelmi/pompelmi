import type { CAC } from 'cac';

export function addScanDirCommand(cli: CAC) {
  cli.command('scan:dir <root>')
    .option('--ext <list>', 'comma-separated ext filter, e.g. zip,pdf,docx')
    .option('--ignore <globs>', 'comma-separated ignore globs', { default: '**/node_modules/**,**/.pnpm/**,**/.git/**,**/dist/**,**/build/**' })
    .option('--concurrency <n>', 'parallel scans (default 8)', { default: 8 })
    .option('--format <fmt>', 'table|json', { default: 'table' })
    .option('--progress', 'show live progress', { default: true })
    .action(async (root: string, flags: any) => {
      const path = await import('node:path');
      const fs = await import('node:fs/promises');
      const pc = (await import('picocolors')).default;
      const prettyBytes = (await import('pretty-bytes')).default;
      const { composeScanners, CommonHeuristicsScanner, createZipBombGuard } = await import('pompelmi');

      const exts = String(flags.ext||'').split(',').map((s:string)=>s.trim().replace(/^\./,'').toLowerCase()).filter(Boolean);
      const ignores = String(flags.ignore||'').split(',').map((s:string)=>s.trim()).filter(Boolean)
        .map(g=> new RegExp(g.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*\*/g,'.*').replace(/\*/g,'[^/]*')));

      const norm = (p:string)=>p.split(path.sep).join('/');

      const shouldIgnore = (p:string)=>ignores.some(r=>r.test(norm(p)));
      const shouldKeep = (file:string)=> !exts.length ? true : exts.includes(path.extname(file).slice(1).toLowerCase());

      async function collect(dir:string) {
        const out:string[] = [];
        const stack=[dir];
        while (stack.length) {
          const cur = stack.pop()!;
          if (shouldIgnore(cur)) continue;
          let entries;
          try { entries = await fs.readdir(cur, { withFileTypes:true }); } catch { continue; }
          for (const d of entries) {
            const full = path.join(cur, d.name);
            if (shouldIgnore(full)) continue;
            if (d.isDirectory()) { stack.push(full); continue; }
            if (d.isFile() && shouldKeep(full)) out.push(full);
          }
        }
        return out;
      }

      console.log(`[${new Date().toISOString()}] indexing ${root} …`);
      const files = await collect(root);
      console.log(`[${new Date().toISOString()}] found ${files.length} files to scan`);

      const scan = composeScanners(
        [
          ['zipGuard', createZipBombGuard({ maxEntries: 512, maxTotalUncompressedBytes: 100 * 1024 * 1024, maxCompressionRatio: 12 })],
          ['heuristics', CommonHeuristicsScanner],
        ],
        { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
      );

      const results:any[] = new Array(files.length);
      let done=0, susp=0, mal=0;
      const total = files.length;
      const conc = Math.max(1, Math.min(64, Number(flags.concurrency)||8));

      let timer:NodeJS.Timeout|undefined;
      if (flags.progress !== false) {
        timer = setInterval(()=> {
          const pct = total ? ((done/total)*100).toFixed(1) : '100.0';
          process.stderr.write(`\r${pct}%  ${done}/${total}  suspicious:${susp}  malicious:${mal}   `);
        }, 120);
      }

      let idx = 0;
      async function worker() {
        const fsSync = await import('node:fs');
        while (true) {
          const i = idx++; if (i>=total) break;
          const f = files[i];
          const size = fsSync.existsSync(f) ? fsSync.statSync(f).size : 0;
          const r = await scan({ file: f, size });
          results[i] = { file: f, size, verdict: r.verdict, matches: r.matches||[] };
          if (r.verdict==='malicious') mal++; else if (r.verdict==='suspicious') susp++;
          done++;
        }
      }

      await Promise.all(Array.from({length: conc}, ()=>worker()));
      if (timer) { clearInterval(timer); process.stderr.write('\n'); }

      const flagged = results.some(r=>r.verdict!=='clean');
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
          return [r.file, prettyBytes(r.size), verdict, pc.dim(m || '—')];
        });
        const widths = header.map((h,i)=>Math.max(h.length, ...rows.map(r=>String(r[i]).replace(/\x1b\[[0-9;]*m/g,'').length)));
        const line = (cells:string[]) => cells.map((c,i)=>{
          const raw = String(c);
          const pad = widths[i] - raw.replace(/\x1b\[[0-9;]*m/g,'').length;
          return raw + ' '.repeat(Math.max(0,pad));
        }).join('  ');
        console.log(line(header));
        console.log(widths.map(w=>'─'.repeat(w)).join('  '));
        for (const r of rows) console.log(line(r));
        if (flagged) {
          const worst = results.some(r => r.verdict === 'malicious') ? 'malicious' : 'suspicious';
          console.error(pc.dim(`\nDetected ${worst} files. Use --format json for machine-readable output.`));
        }
      }

      process.exit(mal>0 ? 2 : 0);
    });
}
