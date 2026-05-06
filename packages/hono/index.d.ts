import type { MiddlewareHandler, Context } from 'hono';
import type { ScanOptions } from 'pompelmi';

export interface PompelmiHonoOptions extends ScanOptions {
  /** Form field name that contains the uploaded file (default: 'file') */
  field?: string;
  /**
   * Called with (c, filename) when a malicious file is detected.
   * Must return a Response (or Promise<Response>).
   * If omitted, responds with HTTP 422 { error: 'Malware detected' }.
   */
  onInfected?: (c: Context, filename: string) => Response | Promise<Response>;
}

/**
 * Hono middleware that scans an uploaded file before the route handler runs.
 * Reads the file from the parsed multipart body field (default: 'file').
 *
 * @example
 * import { Hono } from 'hono'
 * import { pompelmiMiddleware } from '@pompelmi/hono'
 *
 * const app = new Hono()
 * app.use('/upload/*', pompelmiMiddleware({ host: 'localhost', port: 3310 }))
 * app.post('/upload', (c) => c.json({ ok: true }))
 */
export function pompelmiMiddleware(options?: PompelmiHonoOptions): MiddlewareHandler;

export { Verdict } from 'pompelmi';
