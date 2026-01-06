import type { RequestHandler } from 'express';
import * as path from 'node:path';

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
  stopOn?: Severity;
  failClosed?: boolean;
  onScanEvent?: (ev: unknown) => void;
  scanner?: ScannerFn;
}

type MulterFile =
  & FileMeta
  & {
    buffer?: Buffer;
    path?: string;
  };

function asScannerFn(scanner?: ScannerFn) {
  if (!scanner) return null;
  return typeof scanner === 'function' ? scanner : scanner.scan.bind(scanner);
}

function extLower(name: string) {
  const e = path.extname(name || '').replace(/^\./, '');
  return e.toLowerCase();
}

function collectMulterFiles(req: any): MulterFile[] {
  const files: MulterFile[] = [];
  if (req.file) files.push(req.file as MulterFile);

  if (Array.isArray(req.files)) {
    for (const f of req.files) files.push(f as MulterFile);
  } else if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      const v = (req.files as Record<string, unknown>)[key];
      if (Array.isArray(v)) for (const f of v) files.push(f as MulterFile);
    }
  }
  return files;
}

/**
 * Express middleware:
 *  - validates extension/MIME/size
 *  - scans each file's in-memory buffer (multer.memoryStorage)
 *  - blocks on stopOn (default: 'suspicious')
 *  - attaches results to req.pompelmi
 */
export function createUploadGuard(opts: UploadGuardOptions): RequestHandler {
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

  return async function uploadGuard(req, res, next) {
    try {
      const files = collectMulterFiles(req);

      if (!files.length) {
        (req as any).pompelmi = { files: [], results: [], verdict: 'clean' as Severity };
        return next();
      }

      for (const f of files) {
        if (typeof f.size === 'number' && f.size > maxFileSizeBytes) {
          return res.status(422).json({
            error: 'file_too_large',
            message: `File "\${f.originalname}" exceeds max allowed size`,
          });
        }

        if (includeExtensions.length) {
          const e = extLower(f.originalname);
          if (!includeExtensions.includes(e)) {
            return res.status(422).json({
              error: 'extension_not_allowed',
              message: `File "\${f.originalname}" has disallowed extension ".\${e}"`,
            });
          }
        }

        if (allowedMimeTypes.length) {
          if (!allowedMimeTypes.includes((f.mimetype || '').toLowerCase())) {
            return res.status(422).json({
              error: 'mime_not_allowed',
              message: `File "\${f.originalname}" has disallowed MIME "\${f.mimetype}"`,
            });
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
              return res.status(422).json({
                error: 'bytes_missing',
                message: `File "\${f.originalname}" not available in memory. Ensure memoryStorage() is configured.`,
              });
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
        return res.status(422).json({
          error: 'blocked_by_policy',
          message: `Upload blocked (\${overall}).`,
          results,
        });
      }

      (req as any).pompelmi = { files: files.map(f => f.originalname), results, verdict: overall };
      return next();
    } catch (err: any) {
      if (failClosed) {
        return res.status(422).json({
          error: 'scan_error',
          message: err?.message || 'Upload rejected by scanner',
        });
      }
      return next(err);
    }
  };
}
