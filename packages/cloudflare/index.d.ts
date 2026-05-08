/** Result returned by scanBuffer */
export type ScanResult = 'clean' | 'malicious' | 'error';

/** Options for connecting to a remote clamd instance */
export interface CloudflareScanOptions {
  /** Hostname or IP of the remote clamd instance */
  host: string;
  /** Port the remote clamd listens on (typically 3310) */
  port: number;
  /** Socket read timeout in milliseconds (default: 15000) */
  timeout?: number;
  /** Form field name to scan when using scanRequest (default: 'file') */
  field?: string;
}

/**
 * Scan an ArrayBuffer with a remote clamd instance using INSTREAM protocol.
 * Uses Cloudflare's `connect()` socket API — no Node.js built-ins required.
 *
 * @example
 * const result = await scanBuffer(await file.arrayBuffer(), {
 *   host: env.CLAMAV_HOST,
 *   port: parseInt(env.CLAMAV_PORT),
 * });
 */
export declare function scanBuffer(
  buffer: ArrayBuffer,
  options: CloudflareScanOptions
): Promise<ScanResult>;

/**
 * Scan a multipart form field from a Cloudflare Worker Request.
 * Returns null if the file is clean, or an HTTP Response (422/500) otherwise.
 *
 * @example
 * export default {
 *   async fetch(request, env) {
 *     const rejection = await scanRequest(request, {
 *       host: env.CLAMAV_HOST,
 *       port: parseInt(env.CLAMAV_PORT),
 *     });
 *     if (rejection) return rejection;
 *     return new Response('OK');
 *   }
 * }
 */
export declare function scanRequest(
  request: Request,
  options: CloudflareScanOptions
): Promise<Response | null>;
