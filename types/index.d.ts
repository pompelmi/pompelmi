import { Readable } from 'stream';
import { FSWatcher } from 'fs';
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
  /** Number of retry attempts on connection error (default: 0) */
  retries?: number;
  /** Delay in milliseconds between retries (default: 1000) */
  retryDelay?: number;
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

/** Parameters for scanS3 */
export interface S3ScanParams {
  /** S3 bucket name */
  bucket: string;
  /** S3 object key */
  key: string;
  /** AWS region */
  region?: string;
  /** AWS credentials object */
  credentials?: object;
}

/**
 * Scan an S3 object by streaming it directly via GetObjectCommand — no disk I/O.
 * Requires @aws-sdk/client-s3 to be installed separately.
 */
export declare function scanS3(params: S3ScanParams, options?: ScanOptions): Promise<VerdictValue>;

/** Options for createPool */
export interface PoolOptions {
  host?: string;
  port?: number;
  socket?: string;
  /** Number of persistent connections to maintain (default: 5) */
  size?: number;
  timeout?: number;
}

/** A pool of persistent clamd connections */
export interface ClamdPool {
  /** Scan a file by path using a pooled connection */
  scan(filePath: string): Promise<VerdictValue>;
  /** Scan an in-memory Buffer using a pooled connection */
  scanBuffer(buffer: Buffer): Promise<VerdictValue>;
  /** Scan a Readable stream using a pooled connection */
  scanStream(stream: Readable): Promise<VerdictValue>;
  /** Destroy all pooled connections and reject any queued requests */
  destroy(): void;
}

/**
 * Create a pool of persistent clamd connections for high-throughput scanning.
 * Queues requests when all connections are busy.
 */
export declare function createPool(options?: PoolOptions): ClamdPool;

/** Callbacks for the watch() function */
export interface WatchCallbacks {
  /** Called when a scanned file is clean */
  onClean?: (filePath: string) => void;
  /** Called when a scanned file is malicious */
  onMalicious?: (filePath: string) => void;
  /** Called on scan error or infrastructure failure */
  onError?: (err: Error, filePath?: string) => void;
}

/**
 * Watch a directory for new/modified files and scan each automatically.
 * Uses fs.watch with a 300 ms debounce. No dependencies.
 * Returns an FSWatcher; call .close() to stop watching.
 */
export declare function watch(
  dirPath: string,
  options?: ScanOptions,
  callbacks?: WatchCallbacks
): FSWatcher;
