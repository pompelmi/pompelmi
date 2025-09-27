/// <reference path="./types.d.ts" />
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

export type Match = { rule: string; meta?: Record<string, any> };
export type ClamOptions = { host?: string; port?: number; socket?: string; timeoutMs?: number };

async function getNodeClam(): Promise<any | null> {
  try {
    const mod: any = await import('clamscan');
    return mod?.default ?? mod;
  } catch {
    return null; // module not installed; engine will be a safe no-op
  }
}

export function createClamScanner(opts: ClamOptions = {}) {
  const { host, port, socket, timeoutMs = 5000 } = opts;

  return {
    async scan(bytes: Uint8Array): Promise<Match[]> {
      const ClamLib = await getNodeClam();
      if (!ClamLib) return []; // no module available

      const Clam = await new ClamLib().init({
        removeInfected: false,
        clamdscan: { host: host || undefined, port: port || undefined, socket: socket || undefined, timeout: timeoutMs },
        clamscan: { path: 'clamscan' }
      });

      const tmpFile = `${os.tmpdir()}/pompelmi-${randomBytes(6).toString('hex')}.bin`;
      await fs.writeFile(tmpFile, Buffer.from(bytes));
      try {
        const { isInfected, viruses } = await Clam.isInfected(tmpFile);
        if (!isInfected) return [];
        return (viruses || []).map((v: string) => ({ rule: `clamav:${v}` }));
      } catch {
        return [];
      } finally {
        try { await fs.unlink(tmpFile); } catch {}
      }
    }
  };
}
