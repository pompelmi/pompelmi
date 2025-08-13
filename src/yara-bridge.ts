// src/yara-bridge.ts
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export function createScanner(rulesPath = process.env.POMPELMI_YARA_RULES ?? 'rules/index.yar') {
  return {
    async scan(bytes: Uint8Array) {
      const tmp = join(tmpdir(), `pompelmi-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.writeFile(tmp, Buffer.from(bytes));
      return new Promise((resolve) => {
        const p = spawn('yara', ['-s', rulesPath, tmp]);
        let out = '', err = '';
        p.stdout.on('data', d => out += String(d));
        p.stderr.on('data', d => err += String(d));
        p.on('close', () => {
          void fs.unlink(tmp).catch(()=>{});
          if (err && !out) return resolve([]);
          const matches = out.split('\n').filter(Boolean).map(line => {
            const [rule, file, ...rest] = line.split(' ');
            return { rule, meta: { file, raw: line } };
          });
          resolve(matches);
        });
      });
    }
  };
}