import type { VerdictValue, ScanOptions } from 'pompelmi';

/** Options accepted by withPompelmi / withPompelmiHandler */
export interface PompelmiNextOptions extends ScanOptions {}

/**
 * App Router (Next.js 13+) wrapper.
 * Scans the raw request body before the handler runs.
 * Returns HTTP 400 if the body is malicious.
 *
 * @example
 * // app/api/upload/route.ts
 * import { withPompelmi } from '@pompelmi/nextjs'
 *
 * export const POST = withPompelmi(async (req) => {
 *   return Response.json({ ok: true })
 * }, { host: 'localhost', port: 3310 })
 */
export declare function withPompelmi(
  handler: (req: Request, ctx?: unknown) => Promise<Response>,
  options?: PompelmiNextOptions
): (req: Request, ctx?: unknown) => Promise<Response>;

/**
 * Pages Router (Next.js ≤ 12) wrapper.
 * Scans the raw request body before the handler runs.
 * Sends HTTP 400 if the body is malicious.
 *
 * @example
 * // pages/api/upload.ts
 * import { withPompelmiHandler } from '@pompelmi/nextjs'
 * import type { NextApiRequest, NextApiResponse } from 'next'
 *
 * async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   res.json({ ok: true })
 * }
 *
 * export default withPompelmiHandler(handler, { host: 'localhost', port: 3310 })
 */
export declare function withPompelmiHandler(
  handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void | Promise<void>,
  options?: PompelmiNextOptions
): (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;

export { Verdict } from 'pompelmi';
