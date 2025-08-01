import type { Request, RequestHandler } from 'express';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { fileTypeFromBuffer } from 'file-type';


// Import dal pacchetto principale.
// Se il tuo pacchetto espone un nome diverso, cambia qui.

export type Verdict = 'clean' | 'suspicious' | 'malicious';

export interface YaraMatch {
  rule: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface PompelmiScanner {
  scan(bytes: Uint8Array): Promise<YaraMatch[]>;
}

export interface UploadGuardOptions {
  /** Scanner YARA pronto (consigliato). In alternativa, passa `rules`. */
  scanner?: PompelmiScanner;

  /** Regole YARA da compilare se non passi `scanner`. */
  rules?: string;

  /** Nome del campo file (per .single/.array). Default: autodetect. */
  fieldName?: string;

  /** Come leggere i file da req: 'single' | 'array' | 'any'. Default: 'any'. */
  filesMode?: 'single' | 'array' | 'any';

  /** Whitelist estensioni (senza .). Esempio: ['jpg','png','pdf']. */
  includeExtensions?: string[];

  /** Dimensione massima per file (bytes). Se superata → 413. */
  maxFileSizeBytes?: number;

  /** Timeout singola scansione (ms). Default: 5000. */
  timeoutMs?: number;

  /** Numero massimo scansioni concorrenti. Default: 4. */
  concurrency?: number;

  /** In caso di errore di scan/inizializzazione, rifiuta (503). Default: true. */
  failClosed?: boolean;

  /** Non blocca mai: annota l’esito in req.pompelmi. Default: false. */
  reportOnly?: boolean;

  /** Mappa i match YARA in verdetto (default: match>0 → 'malicious'). */
  mapMatchesToVerdict?: (matches: YaraMatch[]) => Verdict;

  /** Decide se bloccare dato il verdetto (default: blocca non-clean). */
  shouldBlock?: (v: Verdict) => boolean;

  /** Hook di osservabilità. */
  onScanEvent?: (ev: ScanEvent) => void;

  /** Abilita il rilevamento MIME dai magic bytes. Default: true. */
  detectMime?: boolean;

  /** Richiede che estensione del filename e tipo rilevato coincidano. Default: true. */
  enforceMime?: boolean;

  /** Elenco di MIME consentiti (es. ['text/plain','image/png','image/jpeg','application/pdf']). */
  allowedMimeTypes?: string[];

  /** Abilita la gestione degli archivi ZIP. Default: true. */
  allowArchives?: boolean;

  /** Policy/limiti per archivi ZIP. */
  archive?: {
    /** Max entry totali nel .zip (default: 2000). */
    maxEntries?: number;
    /** Somma uncompressed massima di tutte le entry (default: 50 MiB). */
    maxTotalUncompressedBytes?: number;
    /** Dimensione uncompressed massima per singola entry (default: 20 MiB). */
    maxEntryUncompressedBytes?: number;
    /** Profondità massima (0 = no nested zip). Default: 0. */
    maxDepth?: number;
    /** Se true, scansiona anche file nascosti/sistemi (default: false). */
    scanHidden?: boolean;
  };
}

export type ScanEvent =
  | { type: 'start'; filename?: string; size?: number }
  | { type: 'end'; filename?: string; verdict: Verdict; matches: number; ms: number }
  | { type: 'blocked'; filename?: string; verdict: Verdict }
  | { type: 'error'; filename?: string; error: unknown }
  | { type: 'archive_start'; filename?: string }
  | { type: 'archive_entry'; archive?: string; entry: string; size?: number }
  | { type: 'archive_blocked'; archive?: string; entry: string; verdict: Verdict }
  | { type: 'archive_limit'; archive?: string; reason: 'max_entries' | 'max_total' | 'max_entry' | 'nested_zip' }
  | { type: 'archive_end'; filename?: string; entries: number; totalUncompressed: number };

class Semaphore {
  private count: number;
  private queue: Array<() => void> = [];
  constructor(concurrency: number) {
    this.count = Math.max(1, concurrency);
  }
  async acquire() {
    if (this.count > 0) {
      this.count--;
      return;
    }
    await new Promise<void>(res => this.queue.push(res));
  }
  release() {
    this.count++;
    const next = this.queue.shift();
    if (next) next();
  }
}

function defaultMap(matches: YaraMatch[]): Verdict {
  return matches.length > 0 ? 'malicious' : 'clean';
}

function defaultShouldBlock(v: Verdict) {
  return v !== 'clean';
}

function extOf(filename?: string): string | null {
  if (!filename) return null;
  const e = path.extname(filename).toLowerCase();
  return e.startsWith('.') ? e.slice(1) : e;
}

function getFiles(req: Request, mode: 'single' | 'array' | 'any', fieldName?: string): Array<{ buffer?: Buffer; originalname?: string; size?: number }> {
  // Compatibile con multer
  if (mode === 'single') {
    const f = (req as any).file;
    return f ? [f] : [];
  }
  if (mode === 'array') {
    const arr = (req as any).files?.[fieldName || 'file'];
    return Array.isArray(arr) ? arr : [];
  }
  // any: supporta req.file, req.files (array) o req.files come oggetto di campi
  const out: any[] = [];
  const anyReq: any = req;
  if (anyReq.file) out.push(anyReq.file);
  if (Array.isArray(anyReq.files)) out.push(...anyReq.files);
  else if (anyReq.files && typeof anyReq.files === 'object') {
    for (const key of Object.keys(anyReq.files)) {
      const v = anyReq.files[key];
      if (Array.isArray(v)) out.push(...v);
      else if (v) out.push(v);
    }
  }
  return out;
}

async function scanZipBuffer(
  zipBytes: Buffer,
  opts: {
    scanner: PompelmiScanner;
    timeoutMs: number;
    sem: Semaphore;
    onScanEvent?: (ev: ScanEvent) => void;
    archiveName?: string;
    maxEntries: number;
    maxTotalUncompressedBytes: number;
    maxEntryUncompressedBytes: number;
    maxDepth: number;
    scanHidden: boolean;
    depth?: number;
    mapMatchesToVerdict: (matches: YaraMatch[]) => Verdict;
  }
): Promise<Verdict> {
  const {
    scanner,
    timeoutMs,
    sem,
    onScanEvent,
    archiveName = 'archive.zip',
    maxEntries,
    maxTotalUncompressedBytes,
    maxEntryUncompressedBytes,
    maxDepth,
    scanHidden,
    depth = 0,
    mapMatchesToVerdict
  } = opts;

  if (depth > maxDepth) {
    onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'nested_zip' });
    return 'suspicious';
  }

  onScanEvent?.({ type: 'archive_start', filename: archiveName });

  const unzipper: any = await import('unzipper');
  const dir = await unzipper.Open.buffer(zipBytes);
  let total = 0;
  let entries = 0;

  for (const entry of dir.files as any[]) {
    if (entry.type !== 'File') continue;
    const name: string = entry.path;

    // Hidden/system files policy
    if (!scanHidden && name && name.startsWith('.')) continue;

    entries++;
    if (entries > maxEntries) {
      onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_entries' });
      return 'suspicious';
    }

    // Uncompressed size
    const uncompressed: number | undefined =
      typeof (entry as any).uncompressedSize === 'number'
        ? ((entry as any).uncompressedSize as number)
        : undefined;

    if (uncompressed && uncompressed > maxEntryUncompressedBytes) {
      onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_entry' });
      return 'suspicious';
    }

    if (uncompressed) {
      total += uncompressed;
      if (total > maxTotalUncompressedBytes) {
        onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_total' });
        return 'suspicious';
      }
    }

    onScanEvent?.({ type: 'archive_entry', archive: archiveName, entry: name, size: uncompressed });

    // Extract entry with streaming and guard entry size if uncompressed is unknown
    const stream = await entry.stream();
    const chunks: Buffer[] = [];
    let read = 0;
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => {
        read += c.length;
        if (read > maxEntryUncompressedBytes) {
          stream.destroy();
          onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_entry' });
          reject(new Error('zip_entry_too_big'));
          return;
        }
        chunks.push(c);
      });
      stream.on('error', reject);
      stream.on('end', resolve);
    });

    if (!uncompressed) {
      total += read;
      if (total > maxTotalUncompressedBytes) {
        onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_total' });
        return 'suspicious';
      }
    }

    const entryBytes = Buffer.concat(chunks);

    // Simple nested zip detection (by magic 0x50 0x4B 0x03/05/07)
    let innerIsZip = false;
    try {
      if (entryBytes.length >= 4) {
        innerIsZip =
          entryBytes[0] === 0x50 &&
          entryBytes[1] === 0x4b &&
          (entryBytes[2] === 0x03 || entryBytes[2] === 0x05 || entryBytes[2] === 0x07);
      }
    } catch {}

    if (innerIsZip) {
      const verdictInner = await scanZipBuffer(entryBytes, {
        scanner,
        timeoutMs,
        sem,
        onScanEvent,
        archiveName: `${archiveName}:${name}`,
        maxEntries,
        maxTotalUncompressedBytes,
        maxEntryUncompressedBytes,
        maxDepth,
        scanHidden,
        depth: depth + 1,
        mapMatchesToVerdict
      });
      if (verdictInner !== 'clean') {
        onScanEvent?.({ type: 'archive_blocked', archive: archiveName, entry: name, verdict: verdictInner });
        return verdictInner;
      }
      continue;
    }

    await sem.acquire();
    try {
      const matches = (await Promise.race([
        scanner.scan(new Uint8Array(entryBytes)),
        (async () => {
          await delay(timeoutMs);
          throw new Error('scan_timeout');
        })()
      ])) as YaraMatch[];

      const verdict = mapMatchesToVerdict(matches);
      if (verdict !== 'clean') {
        onScanEvent?.({ type: 'archive_blocked', archive: archiveName, entry: name, verdict });
        return verdict;
      }
    } finally {
      sem.release();
    }
  }

  onScanEvent?.({ type: 'archive_end', filename: archiveName, entries, totalUncompressed: total });
  return 'clean';
}

async function resolveCreateYaraScannerFromRules(): Promise<(rules: string) => Promise<PompelmiScanner>> {
  // 1) Prova export top-level
  try {
    const m: any = await import('pompelmi');
    const fn = m?.createYaraScannerFromRules ?? m?.default?.createYaraScannerFromRules;
    if (typeof fn === 'function') return fn;
  } catch {}

  // 2) Fallback a possibili percorsi di sviluppo/build
  const candidates = [
    'pompelmi/src/yara/index.js',
    'pompelmi/dist/yara/index.js',
    'pompelmi/src/yara/index.ts'
  ];
  for (const spec of candidates) {
    try {
      const m: any = await import(spec);
      const fn = m?.createYaraScannerFromRules ?? m?.default?.createYaraScannerFromRules;
      if (typeof fn === 'function') return fn;
    } catch {}
  }

  throw new Error("pompelmi:createYaraScannerFromRules non trovato. Aggiorna 'pompelmi' oppure passa 'options.scanner' al middleware.");
}

export function createUploadGuard(options: UploadGuardOptions): RequestHandler {
  const {
    scanner: providedScanner,
    rules,
    fieldName,
    filesMode = 'any',
    includeExtensions,
    maxFileSizeBytes,
    timeoutMs = 5000,
    concurrency = 4,
    failClosed = true,
    reportOnly = false,
    mapMatchesToVerdict = defaultMap,
    shouldBlock = defaultShouldBlock,
    onScanEvent,
    detectMime = true,
    enforceMime = true,
    allowedMimeTypes,
    allowArchives = true,
    archive = {}
  } = options;

  const {
    maxEntries = 2000,
    maxTotalUncompressedBytes = 50 * 1024 * 1024,
    maxEntryUncompressedBytes = 20 * 1024 * 1024,
    maxDepth = 0,
    scanHidden = false
  } = archive;

  let scannerPromise: Promise<PompelmiScanner>;
  if (providedScanner) {
    scannerPromise = Promise.resolve(providedScanner);
  } else if (rules) {
    scannerPromise = (async () => {
      const create = await resolveCreateYaraScannerFromRules();
      return create(rules);
    })();
  } else {
    throw new Error('createUploadGuard: provide either options.scanner or options.rules');
  }

  const sem = new Semaphore(concurrency);

  async function scanWithTimeout(scanFn: () => Promise<YaraMatch[]>, ms: number) {
    return Promise.race([
      scanFn(),
      (async () => {
        await delay(ms);
        throw new Error('scan_timeout');
      })()
    ]) as Promise<YaraMatch[]>;
  }

  return async function uploadGuard(req, res, next) {
    let scanner: PompelmiScanner;
    try {
      scanner = await scannerPromise;
    } catch (_e) {
      const payload = { ok: false, reason: 'scanner_init_error' as const };
      if (failClosed && !reportOnly) return res.status(503).json(payload);
      (req as any).pompelmi = payload;
      return next();
    }

    const files = getFiles(req, filesMode, fieldName);
    if (files.length === 0) return next(); // nessun file: lascia passare

    try {
      for (const f of files) {
        const filename = (f as any).originalname as string | undefined;
        const size = typeof f.size === 'number' ? f.size : f.buffer?.length;

        // Pre-filtri
        if (includeExtensions) {
          const e = extOf(filename);
          if (!e || !includeExtensions.includes(e)) {
            const payload = { ok: false, reason: 'extension_not_allowed' as const, filename, allowed: includeExtensions };
            if (!reportOnly) return res.status(415).json(payload);
            (req as any).pompelmi = { ...(req as any).pompelmi, [filename || 'file']: payload };
            continue;
          }
        }
        if (maxFileSizeBytes && size && size > maxFileSizeBytes) {
          const payload = { ok: false, reason: 'file_too_large' as const, filename, max: maxFileSizeBytes, size };
          if (!reportOnly) return res.status(413).json(payload);
          (req as any).pompelmi = { ...(req as any).pompelmi, [filename || 'file']: payload };
          continue;
        }

        if (!f.buffer) {
          const payload = { ok: false, reason: 'buffer_missing' as const, filename };
          if (!reportOnly) return res.status(400).json(payload);
          (req as any).pompelmi = { ...(req as any).pompelmi, [filename || 'file']: payload };
          continue;
        }

        // --- MIME sniffing (magic number) ---
        let detectedExt: string | null = null;
        let detectedMime: string | null = null;

        if (detectMime) {
          try {
            const ft = await fileTypeFromBuffer(f.buffer);
            if (ft) {
              detectedExt = ft.ext?.toLowerCase() ?? null;
              detectedMime = ft.mime?.toLowerCase() ?? null;
            }
          } catch (_e) {
            // opzionale: onScanEvent?.({ type: 'error', error: _e });
          }
        }

        // Mismatch estensione vs tipo reale (es: PNG ma .txt)
        if (detectMime && enforceMime && detectedExt) {
          const nameExt = extOf(filename);
          if (nameExt && nameExt !== detectedExt) {
            const payload = {
              ok: false,
              reason: 'mime_mismatch' as const,
              filename,
              ext: nameExt,
              detectedExt,
              detectedMime
            };
            if (!reportOnly) return res.status(415).json(payload);
            (req as any).pompelmi = { ...(req as any).pompelmi, [filename || 'file']: payload };
            continue;
          }
        }

        // Whitelist di MIME (se configurata)
        if (detectMime && allowedMimeTypes && allowedMimeTypes.length) {
          const mimeToCheck = (detectedMime || 'application/octet-stream').toLowerCase();
          if (!allowedMimeTypes.includes(mimeToCheck)) {
            const payload = {
              ok: false,
              reason: 'mime_not_allowed' as const,
              filename,
              detectedMime: mimeToCheck,
              allowed: allowedMimeTypes
            };
            if (!reportOnly) return res.status(415).json(payload);
            (req as any).pompelmi = { ...(req as any).pompelmi, [filename || 'file']: payload };
            continue;
          }
        }

        // Gestione archivi ZIP (se abilitata)
        if (allowArchives) {
          const nameExtLower = (extOf(filename) || '').toLowerCase();
          const looksZipByExt = nameExtLower === 'zip';
          const looksZipByMime = typeof detectedMime === 'string' && detectedMime.includes('zip');
          if (looksZipByExt || looksZipByMime) {
            const verdictZip = await scanZipBuffer(f.buffer, {
              scanner,
              timeoutMs,
              sem,
              onScanEvent,
              archiveName: filename || 'upload.zip',
              maxEntries,
              maxTotalUncompressedBytes,
              maxEntryUncompressedBytes,
              maxDepth,
              scanHidden,
              mapMatchesToVerdict
            });
            if (shouldBlock(verdictZip)) {
              const payload = { ok: false, reason: 'blocked' as const, verdict: verdictZip, matches: [], archive: true };
              if (!reportOnly) return res.status(422).json(payload);
            }
            const arr = (req as any).pompelmi?.results || [];
            arr.push({ filename, verdict: verdictZip, matches: [], ms: 0 });
            (req as any).pompelmi = { results: arr };
            continue; // evita lo scan “piatto” del .zip
          }
        }

        onScanEvent?.({ type: 'start', filename, size });

        // Concurrency
        const t0 = performance.now();
        await sem.acquire();
        let verdict: Verdict = 'clean';
        let matches: YaraMatch[] = [];
        try {
          const bytes = new Uint8Array(f.buffer);
          matches = await scanWithTimeout(() => scanner.scan(bytes), timeoutMs);
          verdict = mapMatchesToVerdict(matches);
        } finally {
          sem.release();
        }
        const ms = Math.round(performance.now() - t0);

        onScanEvent?.({ type: 'end', filename, verdict, matches: matches.length, ms });

        if (shouldBlock(verdict)) {
          onScanEvent?.({ type: 'blocked', filename, verdict });
          const payload = { ok: false, reason: 'blocked' as const, verdict, matches };
          if (!reportOnly) return res.status(422).json(payload);
        }

        // Passa ai successivi: annota il risultato
        const arr = (req as any).pompelmi?.results || [];
        arr.push({ filename, verdict, matches, ms });
        (req as any).pompelmi = { results: arr };
      }

      return next();
    } catch (error) {
      onScanEvent?.({ type: 'error', error });
      if (failClosed && !reportOnly) {
        return res.status(503).json({ ok: false, reason: 'scan_error' as const });
      }
      return next();
    }
  };
}