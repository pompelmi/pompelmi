import type { Middleware } from 'koa';
import path from 'node:path';

type Severity = 'clean' | 'suspicious' | 'malicious';

export interface ScanResult {
  severity: Severity;
  ruleId?: string;
  reason?: string;
  tags?: string[];
}

export interface FileMeta {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export type ScannerFn =
  | ((bytes: Uint8Array, meta: FileMeta) => Promise<ScanResult> | ScanResult)
  | { scan: (bytes: Uint8Array, meta: FileMeta) => Promise<ScanResult> | ScanResult };

export interface UploadGuardOptions {
  includeExtensions?: string[];
  allowedMimeTypes?: string[];
  maxFileSizeBytes?: number;
  stopOn?: Severity;          // default: 'suspicious'
  failClosed?: boolean;       // default: true (block on internal errors / missing buffers)
  onScanEvent?: (ev: unknown) => void;
  scanner?: ScannerFn;        // composed scanner from core, or any compatible fn
}

type KoaMulterFile =
  & FileMeta
  & {
    buffer?: Buffer;          // memoryStorage() buffer (multer v2)
    path?: string;            // diskStorage path (we don't rely on disk)
  };

function asScannerFn(scanner?: ScannerFn) {
  if (!scanner) return null;
  return typeof scanner === 'function' ? scanner : scanner.scan.bind(scanner);
}

function extLower(name: string) {
  const e = path.extname(name || '').replace(/^\./, '');
  return e.toLowerCase();
}

function pushAll(dst: KoaMulterFile[], maybe: unknown) {
  if (!maybe) return;
  if (Array.isArray(maybe)) {
    for (const f of maybe) dst.push(f as KoaMulterFile);
  } else if (typeof maybe === 'object') {
    // field map { avatar: [File], docs: [File] }
    for (const k of Object.keys(maybe as any)) {
      const v = (maybe as any)[k];
      if (Array.isArray(v)) for (const f of v) dst.push(f as KoaMulterFile);
      else if (v) dst.push(v as KoaMulterFile);
    }
  }
}

function collectKoaFiles(ctx: any): KoaMulterFile[] {
  const files: KoaMulterFile[] = [];
  // different wrappers expose on different objects — support all
  if (ctx.file) files.push(ctx.file as KoaMulterFile);
  if (ctx.files) pushAll(files, ctx.files);
  if (ctx.request?.file) files.push(ctx.request.file as KoaMulterFile);
  if (ctx.request?.files) pushAll(files, ctx.request.files);
  if (ctx.req?.file) files.push(ctx.req.file as KoaMulterFile);
  if (ctx.req?.files) pushAll(files, ctx.req.files);
  return files;
}

/**
 * Koa middleware upload guard:
 *  - validates extension/MIME/size
 *  - scans each file's in-memory buffer (multer.memoryStorage)
 *  - blocks on stopOn (default: 'suspicious')
 *  - attaches results to ctx.state.pompelmi
 */
export function createUploadGuard(opts: UploadGuardOptions): Middleware {
  const {
    includeExtensions = [],
    allowedMimeTypes = [],
    maxFileSizeBytes = Number.MAX_SAFE_INTEGER,
    stopOn = 'suspicious',
    failClosed = true,
    onScanEvent,
    scanner
  } = opts;

  const scan = asScannerFn(scanner);

  return async function uploadGuard(ctx, next) {
    try {
      const files = collectKoaFiles(ctx);

      if (!files.length) {
        (ctx.state as any).pompelmi = { files: [], results: [], verdict: 'clean' as Severity };
        return next();
      }

      // fast pre-filters
      for (const f of files) {
        if (typeof f.size === 'number' && f.size > maxFileSizeBytes) {
          ctx.status = 422;
          ctx.body = { error: 'file_too_large', message: `File "${f.originalname}" exceeds max allowed size` };
          return;
        }

        if (includeExtensions.length) {
          const e = extLower(f.originalname);
          if (!includeExtensions.includes(e)) {
            ctx.status = 422;
            ctx.body = { error: 'extension_not_allowed', message: `File "${f.originalname}" has disallowed extension ".${e}"` };
            return;
          }
        }

        if (allowedMimeTypes.length) {
          if (!allowedMimeTypes.includes((f.mimetype || '').toLowerCase())) {
            ctx.status = 422;
            ctx.body = { error: 'mime_not_allowed', message: `File "${f.originalname}" has disallowed MIME "${f.mimetype}"` };
            return;
          }
        }
      }

      const results: ScanResult[] = [];
      let overall: Severity = 'clean';

      for (const f of files) {
        const meta: FileMeta = {
          fieldname: f.fieldname,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size ?? 0,
        };

        let result: ScanResult = { severity: 'clean' };

        if (scan) {
          const bytes: Uint8Array | undefined = f.buffer;
          if (!bytes) {
            if (failClosed) {
              ctx.status = 422;
              ctx.body = { error: 'bytes_missing', message: `File "${f.originalname}" not in memory. Ensure memoryStorage() is configured.` };
              return;
            }
          } else {
            result = await Promise.resolve(scan(bytes, meta));
            onScanEvent?.({ type: 'scan_result', file: meta, result });
          }
        }

        results.push(result);
        if (result.severity === 'malicious') overall = 'malicious';
        else if (result.severity === 'suspicious' && overall === 'clean') overall = 'suspicious';
      }

      const shouldBlock =
        (stopOn === 'suspicious' && (overall === 'suspicious' || overall === 'malicious')) ||
        (stopOn === 'malicious' && overall === 'malicious');

      if (shouldBlock) {
        ctx.status = 422;
        ctx.body = { error: 'blocked_by_policy', message: `Upload blocked (${overall}).`, results };
        return;
      }

      (ctx.state as any).pompelmi = { files: files.map(f => f.originalname), results, verdict: overall };
      await next();
    } catch (err: any) {
      if (failClosed) {
        ctx.status = 422;
        ctx.body = { error: 'scan_error', message: err?.message || 'Upload rejected by scanner' };
        return;
      }
      throw err;
    }
  };
}
