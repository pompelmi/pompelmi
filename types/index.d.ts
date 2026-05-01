import { Readable } from 'stream';
import { IncomingMessage, ServerResponse } from 'http';

/** Options passed to any scan function */
export interface ScanOptions {
  /** clamd hostname — enables TCP mode when set */
  host?: string;
  /** clamd port (default: 3310) */
  port?: number;
  /** Path to a clamd UNIX domain socket (e.g. /run/clamav/clamd.sock) */
  socket?: string;
  /** Socket idle timeout in milliseconds, clamd mode only (default: 15000) */
  timeout?: number;
}

/** Options for the Express/Fastify middleware */
export interface MiddlewareOptions extends ScanOptions {
  /** multer field name to look for uploaded files (default: 'file') */
  uploadField?: string;
}

/** Result returned by scanDirectory */
export interface DirectoryScanResult {
  /** Absolute paths of files that scanned clean */
  clean: string[];
  /** Absolute paths of infected files */
  malicious: string[];
  /** Absolute paths of files that produced a scan error */
  errors: string[];
}

/** Opaque Symbol-based scan verdicts */
export declare const Verdict: {
  readonly Clean: unique symbol;
  readonly Malicious: unique symbol;
  readonly ScanError: unique symbol;
};

/** The type of any Verdict symbol */
export type VerdictValue = typeof Verdict[keyof typeof Verdict];

type NextFunction = (err?: unknown) => void;
type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Scan a file at the given path.
 * Resolves to Verdict.Clean, Verdict.Malicious, or Verdict.ScanError.
 * Rejects if the file is not found or clamscan is unavailable.
 */
export declare function scan(filePath: string, options?: ScanOptions): Promise<VerdictValue>;

/**
 * Scan an in-memory Buffer.
 * In TCP/socket mode the buffer is streamed to clamd with no disk I/O.
 */
export declare function scanBuffer(buffer: Buffer, options?: ScanOptions): Promise<VerdictValue>;

/**
 * Scan a Node.js Readable stream.
 * In TCP/socket mode the stream is piped to clamd with no disk I/O.
 */
export declare function scanStream(stream: Readable, options?: ScanOptions): Promise<VerdictValue>;

/**
 * Recursively scan every file under dirPath.
 * Per-file errors are caught and collected without aborting the full scan.
 */
export declare function scanDirectory(
  dirPath: string,
  options?: ScanOptions
): Promise<DirectoryScanResult>;

/**
 * Express / Fastify middleware that scans multer-uploaded files
 * (req.file / req.files) and responds HTTP 403 on any infection.
 * Call after multer, before your route handler.
 */
export declare function middleware(options?: MiddlewareOptions): RequestHandler;
