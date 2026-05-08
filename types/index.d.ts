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

/** Options for watch() — extends ScanOptions with quarantine support */
export interface WatchOptions extends ScanOptions {
  /** Path to a quarantine directory. Infected files are moved here automatically. */
  quarantine?: string;
}

/**
 * Watch a directory for new/modified files and scan each automatically.
 * Uses fs.watch with a 300 ms debounce. No dependencies.
 * When `options.quarantine` is set, infected files are moved to that directory
 * with a `.quarantined` extension and a sidecar JSON file.
 * Returns an FSWatcher; call .close() to stop watching.
 */
export declare function watch(
  dirPath: string,
  options?: WatchOptions,
  callbacks?: WatchCallbacks
): FSWatcher;

/** Payload sent by the webhook notifier */
export interface WebhookPayload {
  file: string | null;
  verdict: string;
  viruses: string[];
  timestamp: string;
  hostname: string;
}

/** Options for notify() */
export interface NotifyOptions {
  /** Only send a webhook when the verdict is Malicious (default: true) */
  onlyOnMalicious?: boolean;
  /** HMAC-SHA256 secret — adds X-Pompelmi-Signature header when set */
  secret?: string;
}

/** scan result passed to notify() */
export interface ScanResultInput {
  file?: string | null;
  verdict: symbol | string;
  viruses?: string[];
}

/**
 * Send a POST webhook notification for a scan result.
 * Uses Node.js built-in https/http — no external dependencies.
 * When secret is provided, adds an X-Pompelmi-Signature: sha256=<hmac> header.
 */
export declare function notify(
  webhookUrl: string,
  scanResult: ScanResultInput,
  options?: NotifyOptions
): Promise<void>;

import { EventEmitter } from 'events';

/** EventEmitter-based scanner returned by createScanner() */
export interface ScanEmitter extends EventEmitter {
  /** Scan a single file; emits 'clean', 'malicious', 'scanError', or 'error' */
  scan(filePath: string): void;
  /** Recursively scan every file in dirPath; emits per-file events */
  scanDirectory(dirPath: string): void;

  on(event: 'clean',     listener: (filePath: string) => void): this;
  on(event: 'malicious', listener: (filePath: string, viruses: string[]) => void): this;
  on(event: 'scanError', listener: (filePath: string) => void): this;
  on(event: 'error',     listener: (err: Error) => void): this;
  on(event: string,      listener: (...args: unknown[]) => void): this;
}

/**
 * Create an EventEmitter-based scanner.
 * Options are forwarded to the underlying scan() call (host, port, socket, etc.).
 *
 * @example
 * const scanner = createScanner({ host: 'localhost', port: 3310 });
 * scanner.on('malicious', (file, viruses) => console.log('VIRUS:', file));
 * scanner.scan('file.pdf');
 * scanner.scanDirectory('/uploads');
 */
export declare function createScanner(options?: ScanOptions): ScanEmitter;

/** Options for generateDashboard */
export interface DashboardOptions {
  /** Scan duration in milliseconds */
  elapsed?: number;
  /** ClamAV version string, if available */
  clamdVersion?: string;
  /** clamd host used for the scan */
  host?: string;
  /** clamd port used for the scan */
  port?: number;
  /** UNIX socket used for the scan */
  socket?: string;
  /** Write the HTML to this path (optional) */
  outputPath?: string;
}

/** A scan result row (output of the CLI or manual scan loop) */
export interface ScanRow {
  file: string;
  verdict: 'clean' | 'infected' | 'error';
  viruses?: string[];
}

/**
 * Generate a self-contained HTML security dashboard report.
 * Accepts an array of ScanRow objects or a DirectoryScanResult.
 * When outputPath is set, the file is also written to disk.
 * Returns the HTML string.
 */
export declare function generateDashboard(
  scanResults: ScanRow[] | DirectoryScanResult,
  options?: DashboardOptions
): string;

/** Options for generateShareCard */
export interface ShareCardOptions {
  /** Write the SVG to this path (optional) */
  outputPath?: string;
}

/**
 * Generate a shareable SVG card showing the scan summary.
 * Suitable for embedding in READMEs or sharing on social media.
 * When outputPath is set, the file is also written to disk.
 * Returns the SVG string.
 */
export declare function generateShareCard(
  scanResults: ScanRow[] | DirectoryScanResult,
  options?: ShareCardOptions
): string;

/** Input configuration for generateScorecard */
export interface ScorecardConfig {
  /** Whether virus scanning is enabled */
  scanEnabled?: boolean;
  /** Array of allowed MIME types (non-empty = pass) */
  mimeTypeAllowlist?: string[];
  /** Maximum file size in bytes (positive = pass) */
  fileSizeLimit?: number;
  /** Whether files are written to disk before scanning (false = pass) */
  diskWriteBeforeScan?: boolean;
  /** What to do on scan error: 'reject' = pass, anything else = fail */
  scanErrorBehavior?: 'reject' | string;
  /** What to do when clamd is unavailable: 'reject' = pass, anything else = fail */
  clamdUnavailableBehavior?: 'reject' | string;
  /** Whether TLS is enabled on the upload endpoint */
  tlsEnabled?: boolean;
}

/** A single check result in a scorecard */
export interface ScorecardFinding {
  check: string;
  status: 'pass' | 'fail';
  weight: number;
}

/** Result returned by generateScorecard */
export interface ScorecardResult {
  /** Letter grade A–F */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Numeric score 0–100 */
  score: number;
  /** Per-check results */
  findings: ScorecardFinding[];
  /** Actionable recommendations for failed checks */
  recommendations: string[];
}

/**
 * Analyse a project's upload security configuration and return a grade A–F.
 *
 * @example
 * const scorecard = await generateScorecard({
 *   scanEnabled: true,
 *   mimeTypeAllowlist: ['image/jpeg', 'image/png'],
 *   fileSizeLimit: 10 * 1024 * 1024,
 *   diskWriteBeforeScan: false,
 *   scanErrorBehavior: 'reject',
 *   clamdUnavailableBehavior: 'reject',
 *   tlsEnabled: true,
 * });
 * console.log(scorecard.grade); // 'A'
 */
export declare function generateScorecard(config?: ScorecardConfig): Promise<ScorecardResult>;
