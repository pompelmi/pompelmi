// src/node/scanDir.ts
import { promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  createYaraScannerFromRules,
  createYaraScannerFromFile,
} from '../yara/index';
import type { YaraMatch } from '../yara/index';

export interface NodeScanOptions {
  enableYara?: boolean;
  yaraRules?: string;
  yaraRulesPath?: string;
  includeExtensions?: string[]; // es: ['.txt', '.js']
}

export interface NodeFileEntry {
  path: string;               // relativo alla root
  absPath: string;            // assoluto
  isDir: boolean;
  yara?: { matches: YaraMatch[] };
}

export async function* scanDir(
  root: string,
  opts: NodeScanOptions = {}
): AsyncGenerator<NodeFileEntry> {
  const rootAbs = resolve(root);

  // Compila UNA sola volta le regole (se richiesto)
  let yaraScanner:
    | {
        scan(data: Uint8Array): Promise<YaraMatch[]>;
        scanFile?: (p: string) => Promise<YaraMatch[]>;
      }
    | undefined;

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

async function* walk(dirAbs: string, rel: string = ''): AsyncGenerator<NodeFileEntry> {
    
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });

    for (const d of entries) {
      const absPath = join(dirAbs, d.name);
      const relPath = join(rel, d.name);
      const isDir = d.isDirectory();

      const entry: NodeFileEntry = { path: relPath, absPath, isDir };

      if (!isDir) {
        // Filtro opzionale per estensioni
        if (opts.includeExtensions?.length) {
          const ext = ('.' + (d.name.split('.').pop() ?? '')).toLowerCase();
          const allow = opts.includeExtensions.map(e => e.toLowerCase());
          if (!allow.includes(ext)) {
            yield entry;        // emetto comunque l'entry (senza YARA)
            continue;
          }
        }

        if (yaraScanner) {
          try {
            let matches: YaraMatch[] = [];
            if (yaraScanner.scanFile) {
              matches = await yaraScanner.scanFile(absPath);
            } else {
              const buf = await fs.readFile(absPath);
              matches = await yaraScanner.scan(buf);
            }
            entry.yara = { matches };
          } catch (err) {
            console.warn(`[yara] errore scansione ${absPath}:`, err);
            entry.yara = { matches: [] };
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