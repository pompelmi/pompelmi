import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as fssync from 'node:fs';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const pexec = promisify(execFile);

export type Match = { rule: string; meta?: Record<string, any> };
export type YaraOptions = { rulesGlob?: string | string[]; yaraPath?: string; timeoutMs?: number };

export function createYaraScanner(options: YaraOptions = {}) {
  const yaraPath = options.yaraPath ?? 'yara';
  const timeout = options.timeoutMs ?? 3000;
  const patterns = Array.isArray(options.rulesGlob) ? options.rulesGlob : [options.rulesGlob ?? 'rules/**/*.yar'];

  return {
    async scan(bytes: Uint8Array): Promise<Match[]> {
      const tmpDir = await fs.mkdtemp(`${os.tmpdir()}/pompelmi-yara-`);
      const binPath = path.join(tmpDir, `${randomHex(8)}.bin`);
      const rulesPath = path.join(tmpDir, `_agg_rules.yar`);

      try {
        await fs.writeFile(binPath, Buffer.from(bytes));

        const ruleFiles = dedupe(await Promise.all(patterns.map(p => findRuleFiles(p))));
        if (!ruleFiles.length) return [];

        const joined = (await Promise.all(ruleFiles.map(p => fs.readFile(p, 'utf8')))).join('\n');
        await fs.writeFile(rulesPath, joined, 'utf8');

        const { stdout } = await pexec(yaraPath, [rulesPath, binPath], { timeout });
        return parseYara(stdout);
      } catch (e: any) {
        // no matches or binary missing -> []
        if (e?.stdout) return parseYara(String(e.stdout));
        if (/ENOENT|spawn/.test(String(e?.message))) return [];
        return [];
      } finally {
        try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
      }
    }
  };
}

function parseYara(out: string): Match[] {
  const s = out.trim();
  if (!s) return [];
  return s.split('\n').filter(Boolean).map(line => ({ rule: line.split(/\s+/, 1)[0] }));
}

function randomHex(n: number) { return randomBytes(n).toString('hex'); }

// ----- simple glob-ish finder (supports: 'rules/**/*.yar', 'rules/*.yar', direct files, or dirs) -----
async function findRuleFiles(pattern: string): Promise<string[]> {
  // Direct file
  if (pattern && fssync.existsSync(pattern) && fssync.statSync(pattern).isFile()) {
    return pattern.endsWith('.yar') ? [pattern] : [];
  }
  // Infer base dir from pattern before first '*'
  let base = pattern?.split('*')[0] || 'rules';
  if (!fssync.existsSync(base)) {
    // fall back to 'rules' dir
    base = 'rules';
    if (!fssync.existsSync(base)) return [];
  }
  const acc: string[] = [];
  await walk(base, acc);
  // filter by extension only (keeps it simple & robust)
  return acc.filter(p => p.endsWith('.yar'));
}

async function walk(dir: string, acc: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (e.isFile()) acc.push(p);
  }
}

function dedupe<T>(arrs: T[][]): T[] {
  const s = new Set<T>();
  for (const arr of arrs) for (const v of arr) s.add(v);
  return [...s];
}
