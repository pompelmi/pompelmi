// src/node/scanDir.ts
import { promises as fs } from 'node:fs';
import { createReadStream } from 'node:fs';
import { resolve, join, extname } from 'node:path';

import {
  createYaraScannerFromRules,
  createYaraScannerFromFile,
} from '../yara/index';
import type { YaraMatch, YaraCompiled } from '../yara/index';

export interface NodeScanOptions {
  enableYara?: boolean;
  yaraRules?: string;
  yaraRulesPath?: string;
  includeExtensions?: string[]; // es.: ['.txt', '.js']
  yaraAsync?: boolean;          // preferisci scanFileAsync se disponibile
  maxFileSizeBytes?: number;    // salta YARA oltre questa dimensione
  yaraSampleBytes?: number;     // fallback a buffer: scansiona solo i primi N byte
  yaraPreferBuffer?: boolean; // forza il percorso buffer (attiva il sampling)
}

export interface NodeYaraResult {
  matches: YaraMatch[];
  status: 'scanned' | 'skipped' | 'error';
  /** per i 'skipped', perché abbiamo saltato */
  reason?: 'max-size' | 'filtered-ext' | 'not-enabled' | 'engine-missing' | 'error';
  /** come abbiamo scansionato quando status = 'scanned' */
  mode?: 'async' | 'file' | 'buffer' | 'buffer-sampled';
}

export interface NodeFileEntry {
  path: string;                // relativo alla root
  absPath: string;             // assoluto
  isDir: boolean;
  yara?: NodeYaraResult;
}

/** Legge i primi `max` byte di un file, senza caricare tutto in RAM. */
async function readFirstBytes(absPath: string, max: number): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    const highWaterMark = Math.min(max, 64 * 1024); // blocchi piccoli per fermarci presto
    const stream = createReadStream(absPath, { highWaterMark });
    stream.on('data', (chunk: Buffer) => {
      const needed = max - bytes;
      if (chunk.length > needed) {
        chunks.push(chunk.subarray(0, needed));
        bytes += needed;
        stream.destroy(); // abbiamo letto abbastanza
      } else {
        chunks.push(chunk);
        bytes += chunk.length;
        if (bytes >= max) stream.destroy();
      }
    });
    stream.on('close', () => resolve(Buffer.concat(chunks, bytes)));
    stream.on('error', reject);
  });
}

/** Scansiona una directory in modo ricorsivo, emettendo le entry e (opzionale) i match YARA. */
export async function* scanDir(
  root: string,
  opts: NodeScanOptions = {}
): AsyncGenerator<NodeFileEntry> {
  const rootAbs = resolve(root);

  // Compila UNA volta le regole YARA (se richiesto)
  let yaraScanner: YaraCompiled | undefined;
  if (opts.enableYara) {
    try {
      if (opts.yaraRulesPath && opts.yaraRulesPath.trim()) {
        yaraScanner = await createYaraScannerFromFile(opts.yaraRulesPath);
      } else if (opts.yaraRules && opts.yaraRules.trim()) {
        yaraScanner = await createYaraScannerFromRules(opts.yaraRules);
      }
    } catch (err) {
      console.warn('[yara] errore preparazione regole:', err);
      yaraScanner = undefined;
    }
  }

  // Normalizza elenco estensioni consentite
  const allowExt =
    opts.includeExtensions?.map((e) => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`)) ??
    null;

  async function* walk(dirAbs: string, rel: string = ''): AsyncGenerator<NodeFileEntry> {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });

    for (const d of entries) {
      const absPath = join(dirAbs, d.name);
      const relPath = join(rel, d.name);
      const isDir = d.isDirectory();

      const entry: NodeFileEntry = { path: relPath, absPath, isDir };

      if (!isDir) {
        // Filtro opzionale estensioni
        if (allowExt && allowExt.length > 0) {
          const ext = extname(absPath).toLowerCase();
          if (!allowExt.includes(ext)) {
            // emetti l'entry marcata come 'skipped' per estensione filtrata
            entry.yara = { matches: [], status: 'skipped', reason: 'filtered-ext' };
            yield entry;
            continue;
          }
        }

        if (yaraScanner) {
          try {
            // Limite dimensione file
            if (typeof opts.maxFileSizeBytes === 'number' && opts.maxFileSizeBytes > 0) {
              const st = await fs.stat(absPath);
              if (st.size > opts.maxFileSizeBytes) {
                entry.yara = { matches: [], status: 'skipped', reason: 'max-size' };
                yield entry;
                continue;
              }
            }

            // Ordine preferenze: (salvo forzatura) async → file → buffer (con sampling opzionale)
            let matches: YaraMatch[] = [];
            let mode: 'async' | 'file' | 'buffer' | 'buffer-sampled' | undefined;

            const wantBuffer = opts.yaraPreferBuffer === true;
            const hasAsync = typeof (yaraScanner as any).scanFileAsync === 'function';
            const hasFile = typeof (yaraScanner as any).scanFile === 'function';

            if (!wantBuffer && opts.yaraAsync && hasAsync) {
              matches = await (yaraScanner as any).scanFileAsync(absPath);
              mode = 'async';
            } else if (!wantBuffer && hasFile) {
              matches = await (yaraScanner as any).scanFile(absPath);
              mode = 'file';
            } else {
              let data: Uint8Array;
              if (typeof opts.yaraSampleBytes === 'number' && opts.yaraSampleBytes > 0) {
                data = await readFirstBytes(absPath, opts.yaraSampleBytes);
                mode = 'buffer-sampled';
              } else {
                data = await fs.readFile(absPath);
                mode = 'buffer';
              }
              matches = await yaraScanner.scan(data);
            }

            entry.yara = { matches, status: 'scanned', mode };
          } catch (err) {
            console.warn(`[yara] errore scansione ${absPath}:`, err);
            entry.yara = { matches: [], status: 'error', reason: 'error' };
          }
        }
      }

      yield entry;

      if (isDir) {
        yield* walk(absPath, relPath);
      }
    }
  }

  yield* walk(rootAbs);
}