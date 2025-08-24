import { describe, it, expect } from 'vitest';
import * as mod from '../src/scanners/zipTraversalGuard';
import { ZipFile } from 'yazl';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

async function makeZip(entries: Array<{ name: string, data: Buffer }>) {
  const zf = new ZipFile();
  const tmp = path.join(os.tmpdir(), `pz-${Math.random().toString(36).slice(2)}.zip`);
  const out = fs.createWriteStream(tmp);
  zf.outputStream.pipe(out);
  for (const e of entries) zf.addBuffer(e.data, e.name);
  zf.end();
  await new Promise<void>(res => out.on('close', () => res()));
  return fs.readFileSync(tmp);
}

/** Rileva l'export reale e ritorna una funzione che accetta bytes e restituisce { verdict, ... } */
async function invokeGuard(bytes: Uint8Array | Buffer) {
  const candidates: any[] = [
    (mod as any).createZipBombGuard,
    (mod as any).createZipTraversalGuard,
    (mod as any).zipTraversalGuard,
    (mod as any).default,
    mod
  ].filter(Boolean);

  let lastErr: unknown = null;

  for (const cand of candidates) {
    try {
      // 1) Se è funzione: prova prima come funzione di scan diretta
      if (typeof cand === 'function') {
        const out1 = await Promise.resolve().then(() => cand(bytes));
        if (out1 && typeof out1 === 'object' && 'verdict' in out1) return out1;

        // poi prova come factory (es. createZipBombGuard({}))
        const inst = cand({}) as any;
        if (typeof inst === 'function') {
          const out2 = await inst(bytes);
          if (out2 && typeof out2 === 'object' && 'verdict' in out2) return out2;
        }
        if (inst && typeof inst === 'object') {
          const f = inst.scan ?? inst.run ?? inst.guard;
          if (typeof f === 'function') {
            const out3 = await f.call(inst, bytes);
            if (out3 && typeof out3 === 'object' && 'verdict' in out3) return out3;
          }
        }
      }

      // 2) Se è oggetto: cerca metodi comuni o la proprietà "scan"
      if (cand && typeof cand === 'object') {
        const f = (cand as any).scan ?? (cand as any).run ?? (cand as any).guard;
        if (typeof f === 'function') {
          const out = await f.call(cand, bytes);
          if (out && typeof out === 'object' && 'verdict' in out) return out;
        }
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error('zipTraversalGuard export not invokable as scan function' + (lastErr ? ` (${(lastErr as Error).message})` : ''));
}

describe('zipTraversalGuard (package version)', () => {
  it('passes on a valid zip without traversal', async () => {
    const zipBytes = await makeZip([
      { name: 'safe/safe.txt', data: Buffer.from('ok') },
      { name: 'nested/dir/file.bin', data: Buffer.from([1,2,3]) },
    ]);

    const res = await invokeGuard(zipBytes);
    // su uno ZIP "pulito" non deve essere 'malicious'
    expect(['clean', 'suspicious']).toContain((res as any).verdict);
  });
});
