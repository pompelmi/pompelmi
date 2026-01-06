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

function extLower(name: string) {
  const e = path.extname(name || '').replace(/^\./, '');
  return e.toLowerCase();
}
function asScannerFn(scanner?: ScannerFn) {
  if (!scanner) return null;
  return typeof scanner === 'function' ? scanner : scanner.scan.bind(scanner);
}
function isFn(v: any): v is Function { return typeof v === 'function'; }

/** Fastify v5 preHandler for @fastify/multipart v9. */
export function createUploadGuard(opts: UploadGuardOptions) {
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

  return async function uploadGuard(req: any, reply: any) {
    try {
      if (!isFn(req?.isMultipart) || !req.isMultipart()) {
        (req as any).pompelmi = { files: [], results: [], verdict: 'clean' as Severity };
        return;
      }

      const parts = req.parts({ limits: { fileSize: maxFileSizeBytes } });

      const results: ScanResult[] = [];
      const filenames: string[] = [];
      let overall: Severity = 'clean';

      for await (const part of parts as any) {
        if (part?.type !== 'file') continue;

        const filename = String(part.filename ?? '');
        const mimetype = String(part.mimetype ?? '').toLowerCase();
        const fieldname = String(part.fieldname ?? '');

        if (includeExtensions.length) {
          const e = extLower(filename);
          if (!includeExtensions.includes(e)) {
            reply.code(422).send({ error: 'extension_not_allowed', message: `File "${filename}" has disallowed extension ".${e}"` });
            return;
          }
        }
        if (allowedMimeTypes.length && !allowedMimeTypes.includes(mimetype)) {
          reply.code(422).send({ error: 'mime_not_allowed', message: `File "${filename}" has disallowed MIME "${mimetype}"` });
          return;
        }

        let buf: Buffer;
        try {
          buf = await part.toBuffer(); // v9
        } catch (_e) {
          if (failClosed) {
            reply.code(422).send({ error: 'file_too_large', message: `File "${filename}" exceeds max allowed size` });
            return;
          } else {
            continue;
          }
        }

        if (buf.length > maxFileSizeBytes) {
          reply.code(422).send({ error: 'file_too_large', message: `File "${filename}" exceeds max allowed size` });
          return;
        }

        const meta: FileMeta = { fieldname, originalname: filename, mimetype, size: buf.length };

        let result: ScanResult = { severity: 'clean' };
        if (scan) {
          result = await Promise.resolve(scan(buf, meta));
          onScanEvent?.({ type: 'scan_result', file: meta, result });
        }

        results.push(result);
        filenames.push(filename);

        if (result.severity === 'malicious') overall = 'malicious';
        else if (result.severity === 'suspicious' && overall === 'clean') overall = 'suspicious';
      }

      const shouldBlock =
        (stopOn === 'suspicious' && (overall === 'suspicious' || overall === 'malicious')) ||
        (stopOn === 'malicious' && overall === 'malicious');

      if (shouldBlock) {
        reply.code(422).send({ error: 'blocked_by_policy', message: `Upload blocked (${overall}).`, results });
        return;
      }

      (req as any).pompelmi = { files: filenames, results, verdict: overall };
    } catch (err: any) {
      if (failClosed) {
        reply.code(422).send({ error: 'scan_error', message: err?.message || 'Upload rejected by scanner' });
        return;
      }
      throw err;
    }
  };
}
