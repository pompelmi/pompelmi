import type { Context, Next } from 'koa';
import path from 'node:path';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { fileTypeFromBuffer } from 'file-type';

export type Verdict = 'clean' | 'suspicious' | 'malicious';

export interface YaraMatch {
  rule: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}
export interface PompelmiScanner {
  scan(bytes: Uint8Array): Promise<YaraMatch[]>;
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

export interface UploadGuardOptions {
  scanner?: PompelmiScanner;
  rules?: string;

  // Policy base
  includeExtensions?: string[];
  maxFileSizeBytes?: number;
  timeoutMs?: number;
  concurrency?: number;
  failClosed?: boolean;
  reportOnly?: boolean;

  mapMatchesToVerdict?: (matches: YaraMatch[]) => Verdict;
  shouldBlock?: (v: Verdict) => boolean;
  onScanEvent?: (ev: ScanEvent) => void;

  // MIME
  detectMime?: boolean;
  enforceMime?: boolean;
  allowedMimeTypes?: string[];

  // Archivi
  allowArchives?: boolean;
  archive?: {
    maxEntries?: number;
    maxTotalUncompressedBytes?: number;
    maxEntryUncompressedBytes?: number;
    maxDepth?: number;
    scanHidden?: boolean;
  };

  // Sorgente file:
  //  - 'multer': @koa/multer => buffer su ctx.request.file/ctx.request.files o ctx.file/ctx.files
  //              (alcune varianti/compat usano anche ctx.req.file/ctx.req.files)
  //  - 'koa-body': formidable => path su disco in ctx.request.files (li leggiamo in buffer)
  //  - 'auto': prova 'multer', se vuoto prova 'koa-body'
  filesSource?: 'multer' | 'koa-body' | 'auto'; // default 'auto'
  fieldName?: string; // per .single()
}

class Semaphore {
  private count: number;
  private queue: Array<() => void> = [];
  constructor(concurrency: number) { this.count = Math.max(1, concurrency); }
  async acquire() { if (this.count > 0) { this.count--; return; } await new Promise<void>(res => this.queue.push(res)); }
  release() { this.count++; const next = this.queue.shift(); if (next) next(); }
}

const defaultMap = (m: YaraMatch[]): Verdict => (m.length > 0 ? 'malicious' : 'clean');
const defaultShouldBlock = (v: Verdict) => v !== 'clean';
const extOf = (filename?: string) => {
  if (!filename) return null;
  const e = path.extname(filename).toLowerCase();
  return e.startsWith('.') ? e.slice(1) : e;
};

async function resolveCreateYaraScannerFromRules():
  Promise<(rules: string) => Promise<PompelmiScanner>> {
  try {
    const m: any = await import('pompelmi');
    const fn = m?.createYaraScannerFromRules ?? m?.default?.createYaraScannerFromRules;
    if (typeof fn === 'function') return fn;
  } catch {}
  for (const spec of ['pompelmi/src/yara/index.js','pompelmi/dist/yara/index.js','pompelmi/src/yara/index.ts']) {
    try {
      const m: any = await import(spec);
      const fn = m?.createYaraScannerFromRules ?? m?.default?.createYaraScannerFromRules;
      if (typeof fn === 'function') return fn;
    } catch {}
  }
  throw new Error("pompelmi:createYaraScannerFromRules non trovato. Aggiorna 'pompelmi' o passa 'scanner'.");
}

async function scanZipBuffer(
  zipBytes: Buffer,
  opts: {
    scanner: PompelmiScanner; timeoutMs: number; sem: Semaphore; onScanEvent?: (ev: ScanEvent) => void;
    archiveName?: string; maxEntries: number; maxTotalUncompressedBytes: number; maxEntryUncompressedBytes: number;
    maxDepth: number; scanHidden: boolean; depth?: number; mapMatchesToVerdict: (m: YaraMatch[]) => Verdict;
  }
): Promise<Verdict> {
  const { scanner, timeoutMs, sem, onScanEvent, archiveName = 'archive.zip',
    maxEntries, maxTotalUncompressedBytes, maxEntryUncompressedBytes, maxDepth, scanHidden, depth = 0, mapMatchesToVerdict } = opts;

  if (depth > maxDepth) { onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'nested_zip' }); return 'suspicious'; }
  onScanEvent?.({ type: 'archive_start', filename: archiveName });

  const unzipper: any = await import('unzipper');
  const dir = await unzipper.Open.buffer(zipBytes);
  let total = 0; let entries = 0;

  for (const entry of dir.files as any[]) {
    if (entry.type !== 'File') continue;
    const name: string = entry.path;
    if (!scanHidden && name && name.startsWith('.')) continue;

    entries++;
    if (entries > maxEntries) { onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_entries' }); return 'suspicious'; }

    const uncompressed: number | undefined =
      typeof (entry as any).uncompressedSize === 'number' ? (entry as any).uncompressedSize : undefined;

    if (uncompressed && uncompressed > maxEntryUncompressedBytes) {
      onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_entry' }); return 'suspicious';
    }
    if (uncompressed) {
      total += uncompressed;
      if (total > maxTotalUncompressedBytes) { onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_total' }); return 'suspicious'; }
    }

    onScanEvent?.({ type: 'archive_entry', archive: archiveName, entry: name, size: uncompressed });

    const stream = await entry.stream();
    const chunks: Buffer[] = []; let read = 0;
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => {
        read += c.length;
        if (read > maxEntryUncompressedBytes) {
          stream.destroy(); onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_entry' });
          reject(new Error('zip_entry_too_big')); return;
        }
        chunks.push(c);
      });
      stream.on('error', reject);
      stream.on('end', resolve);
    });

    if (!uncompressed) {
      total += read;
      if (total > maxTotalUncompressedBytes) { onScanEvent?.({ type: 'archive_limit', archive: archiveName, reason: 'max_total' }); return 'suspicious'; }
    }

    const entryBytes = Buffer.concat(chunks);

    let innerIsZip = false;
    if (entryBytes.length >= 4) {
      innerIsZip = entryBytes[0] === 0x50 && entryBytes[1] === 0x4B && (entryBytes[2] === 0x03 || entryBytes[2] === 0x05 || entryBytes[2] === 0x07);
    }
    if (innerIsZip) {
      const verdictInner = await scanZipBuffer(entryBytes, { ...opts, archiveName: `${archiveName}:${name}`, depth: depth + 1 });
      if (verdictInner !== 'clean') { onScanEvent?.({ type: 'archive_blocked', archive: archiveName, entry: name, verdict: verdictInner }); return verdictInner; }
      continue;
    }

    await sem.acquire();
    try {
      const matches = await Promise.race([
        opts.scanner.scan(new Uint8Array(entryBytes)),
        (async () => { await delay(timeoutMs); throw new Error('scan_timeout'); })()
      ]) as YaraMatch[];
      const verdict = mapMatchesToVerdict(matches);
      if (verdict !== 'clean') { onScanEvent?.({ type: 'archive_blocked', archive: archiveName, entry: name, verdict }); return verdict; }
    } finally { sem.release(); }
  }

  onScanEvent?.({ type: 'archive_end', filename: archiveName, entries, totalUncompressed: total });
  return 'clean';
}

async function collectKoaFiles(
  ctx: Context,
  src: 'multer'|'koa-body'|'auto',
  fieldName?: string
): Promise<Array<{ buffer: Buffer; filename?: string; size?: number; mimetype?: string }>> {
  const out: Array<{ buffer: Buffer; filename?: string; size?: number; mimetype?: string }> = [];

  // Helpers per normalizzare le varie forme (array / oggetto / singolo)
  const pushFile = (f: any) => {
    if (!f) return;
    const buf: Buffer | undefined = f.buffer; // @koa/multer con memoryStorage
    if (!buf) return;
    const filename: string | undefined = f.originalname || f.filename || f.name;
    const size = typeof f.size === 'number' ? f.size : buf.length;
    const mimetype: string | undefined = f.mimetype || f.type;
    out.push({ buffer: buf, filename, size, mimetype });
  };
  const pushFromContainer = (container: any) => {
    if (!container) return;
    if (Array.isArray(container)) {
      for (const f of container) pushFile(f);
    } else if (container.buffer) {
      pushFile(container);
    } else if (typeof container === 'object') {
      for (const k of Object.keys(container)) {
        const v = container[k];
        if (Array.isArray(v)) for (const f of v) pushFile(f);
        else pushFile(v);
      }
    }
  };

  // ---- @koa/multer: legge tipicamente da ctx.request.* e ctx.* (vedi README)
  const anyKoaReq: any = ctx.request as any;
  const anyKoaCtx: any = ctx as any;
  pushFromContainer(anyKoaReq.file);
  pushFromContainer(anyKoaReq.files);
  pushFromContainer(anyKoaCtx.file);
  pushFromContainer(anyKoaCtx.files);

  // ---- fallback Node-style (alcune varianti scrivono su ctx.req.*)
  const anyNodeReq: any = ctx.req as any;
  pushFromContainer(anyNodeReq.file);
  pushFromContainer(anyNodeReq.files);

  // ---- koa-body / formidable: file su disco in ctx.request.files -> leggiamo in Buffer
  const tryKoaBody = async () => {
    const files: any = (ctx.request as any).files;
    if (!files) return;
    const values = Array.isArray(files) ? files : Object.values(files);
    for (const val of values) {
      const arr = Array.isArray(val) ? val : [val];
      for (const f of arr) {
        const filepath: string | undefined = f?.filepath || f?.path;
        const filename: string | undefined = f?.originalFilename || f?.name || f?.filename;
        if (filepath) {
          const buf = await fs.readFile(filepath);
          out.push({ buffer: buf, filename, size: buf.length, mimetype: f?.mimetype || f?.type });
        }
      }
    }
  };

  if (src === 'koa-body') {
    await tryKoaBody();
  } else if (src === 'auto' && out.length === 0) {
    await tryKoaBody();
  }

  return out;
}

export function createKoaUploadGuard(options: UploadGuardOptions) {
  const {
    scanner: providedScanner,
    rules,
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
    archive = {},
    filesSource = 'auto',
    fieldName
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
    throw new Error('createKoaUploadGuard: provide either options.scanner or options.rules');
  }

  const sem = new Semaphore(concurrency);

  async function scanWithTimeout(scanFn: () => Promise<YaraMatch[]>, ms: number) {
    return Promise.race([
      scanFn(),
      (async () => { await delay(ms); throw new Error('scan_timeout'); })()
    ]) as Promise<YaraMatch[]>;
  }

  return async function koaGuard(ctx: Context, next: Next) {
    let scanner: PompelmiScanner;
    try {
      scanner = await scannerPromise;
    } catch (_e) {
      const payload = { ok: false, reason: 'scanner_init_error' as const };
      if (failClosed && !reportOnly) { ctx.status = 503; ctx.body = payload; return; }
      (ctx as any).pompelmi = payload;
      return next();
    }

    const files = await collectKoaFiles(ctx, filesSource, fieldName);
    if (files.length === 0) return next();

    try {
      for (const f of files) {
        const filename = f.filename;
        const size = f.size ?? f.buffer?.length;

        // Pre-filtri
        if (includeExtensions) {
          const e = extOf(filename);
          if (!e || !includeExtensions.includes(e)) {
            const payload = { ok: false, reason: 'extension_not_allowed' as const, filename, allowed: includeExtensions };
            if (!reportOnly) { ctx.status = 415; ctx.body = payload; return; }
            (ctx as any).pompelmi = { ...(ctx as any).pompelmi, [filename || 'file']: payload };
            continue;
          }
        }
        if (maxFileSizeBytes && size && size > maxFileSizeBytes) {
          const payload = { ok: false, reason: 'file_too_large' as const, filename, max: maxFileSizeBytes, size };
          if (!reportOnly) { ctx.status = 413; ctx.body = payload; return; }
          (ctx as any).pompelmi = { ...(ctx as any).pompelmi, [filename || 'file']: payload };
          continue;
        }

        if (!f.buffer) {
          const payload = { ok: false, reason: 'buffer_missing' as const, filename };
          if (!reportOnly) { ctx.status = 400; ctx.body = payload; return; }
          (ctx as any).pompelmi = { ...(ctx as any).pompelmi, [filename || 'file']: payload };
          continue;
        }

        // MIME sniffing
        let detectedExt: string | null = null;
        let detectedMime: string | null = null;
        if (detectMime) {
          try {
            const ft = await fileTypeFromBuffer(f.buffer);
            if (ft) { detectedExt = ft.ext?.toLowerCase() ?? null; detectedMime = ft.mime?.toLowerCase() ?? null; }
          } catch {}
        }

        if (detectMime && enforceMime && detectedExt) {
          const nameExt = extOf(filename);
          if (nameExt && nameExt !== detectedExt) {
            const payload = { ok: false, reason: 'mime_mismatch' as const, filename, ext: nameExt, detectedExt, detectedMime };
            if (!reportOnly) { ctx.status = 415; ctx.body = payload; return; }
            (ctx as any).pompelmi = { ...(ctx as any).pompelmi, [filename || 'file']: payload };
            continue;
          }
        }
        // Whitelist MIME (se configurata) con fallback dall’estensione
        if (detectMime && allowedMimeTypes && allowedMimeTypes.length) {
          const nameExt = extOf(filename);
          let mimeToCheck: string | null = detectedMime ? detectedMime.toLowerCase() : null;

          // Fallback: mappa semplice estensione -> MIME
          if (!mimeToCheck && nameExt) {
            const extMap: Record<string, string> = {
              txt: 'text/plain',
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              pdf: 'application/pdf',
              zip: 'application/zip'
            };
            mimeToCheck = extMap[nameExt] ?? null;
          }

          // Se dopo il fallback è ancora sconosciuto, NON applichiamo la whitelist MIME
          if (mimeToCheck && !allowedMimeTypes.includes(mimeToCheck)) {
            const payload = {
              ok: false,
              reason: 'mime_not_allowed' as const,
              filename,
              detectedMime: mimeToCheck,
              allowed: allowedMimeTypes
            };
            if (!reportOnly) { ctx.status = 415; ctx.body = payload; return; }
            (ctx as any).pompelmi = { ...(ctx as any).pompelmi, [filename || 'file']: payload };
            continue;
          }
        }

        // ZIP
        if (allowArchives) {
          const nameExtLower = (extOf(filename) || '').toLowerCase();
          const looksZipByExt = nameExtLower === 'zip';
          const looksZipByMime = typeof detectedMime === 'string' && detectedMime.includes('zip');
          if (looksZipByExt || looksZipByMime) {
            const verdictZip = await scanZipBuffer(f.buffer, {
              scanner, timeoutMs, sem, onScanEvent,
              archiveName: filename || 'upload.zip',
              maxEntries, maxTotalUncompressedBytes, maxEntryUncompressedBytes, maxDepth, scanHidden,
              mapMatchesToVerdict
            });
            if (defaultShouldBlock(verdictZip)) {
              const payload = { ok: false, reason: 'blocked' as const, verdict: verdictZip, matches: [], archive: true };
              if (!reportOnly) { ctx.status = 422; ctx.body = payload; return; }
            }
            const arr = (ctx as any).pompelmi?.results || [];
            arr.push({ filename, verdict: verdictZip, matches: [], ms: 0 });
            (ctx as any).pompelmi = { results: arr };
            continue;
          }
        }

        // Scan file "piatto"
        onScanEvent?.({ type: 'start', filename, size });
        const t0 = performance.now();
        await sem.acquire();
        let verdict: Verdict = 'clean'; let matches: YaraMatch[] = [];
        try {
          const bytes = new Uint8Array(f.buffer);
          matches = await scanWithTimeout(() => scanner.scan(bytes), timeoutMs);
          verdict = mapMatchesToVerdict(matches);
        } finally { sem.release(); }
        const ms = Math.round(performance.now() - t0);
        onScanEvent?.({ type: 'end', filename, verdict, matches: matches.length, ms });

        if (shouldBlock(verdict)) {
          onScanEvent?.({ type: 'blocked', filename, verdict });
          const payload = { ok: false, reason: 'blocked' as const, verdict, matches };
          if (!reportOnly) { ctx.status = 422; ctx.body = payload; return; }
        }

        const arr = (ctx as any).pompelmi?.results || [];
        arr.push({ filename, verdict, matches, ms });
        (ctx as any).pompelmi = { results: arr };
      }

      return next();
    } catch (error) {
      onScanEvent?.({ type: 'error', error });
      if (failClosed && !reportOnly) { ctx.status = 503; ctx.body = { ok: false, reason: 'scan_error' as const }; return; }
      return next();
    }
  };
}