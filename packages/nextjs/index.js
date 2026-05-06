'use strict';

const { scanBuffer, Verdict } = require('pompelmi');

/**
 * Build a pompelmi scan options object from the plugin options,
 * excluding non-scan keys.
 */
function buildScanOpts(options) {
  const keys = ['host', 'port', 'socket', 'timeout', 'retries', 'retryDelay'];
  const out = {};
  for (const k of keys) {
    if (options[k] !== undefined) out[k] = options[k];
  }
  return out;
}

/**
 * Read a Request body as a Buffer.
 * Supports Web API Request (App Router) and Node.js IncomingMessage (Pages Router).
 */
async function bodyBuffer(req) {
  if (typeof req.arrayBuffer === 'function') {
    // Web API Request (Next.js App Router)
    const ab = await req.arrayBuffer();
    return Buffer.from(ab);
  }
  // Node.js IncomingMessage (Pages Router)
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * App Router wrapper (Next.js 13+).
 *
 * Wraps a route handler so that the raw request body is scanned before the
 * handler runs. req.pompelmiVerdict is set to the scan verdict symbol.
 * If the body is malicious a 400 JSON response is returned immediately.
 *
 * @param {Function} handler  - async (req, ctx) => Response
 * @param {object}   options  - ScanOptions (host, port, socket, …)
 * @returns {Function} Next.js App Router handler
 *
 * @example
 * // app/api/upload/route.js
 * import { withPompelmi } from '@pompelmi/nextjs'
 *
 * export const POST = withPompelmi(async (req) => {
 *   return Response.json({ ok: true })
 * }, { host: 'localhost', port: 3310 })
 */
function withPompelmi(handler, options = {}) {
  const scanOpts = buildScanOpts(options);

  return async function pompelmiHandler(req, ctx) {
    let buf;
    try {
      buf = await bodyBuffer(req);
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const verdict = await scanBuffer(buf, scanOpts);

    if (verdict === Verdict.Malicious) {
      return new Response(JSON.stringify({ error: 'Malicious file detected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Attach verdict so the handler can inspect it if needed
    req.pompelmiVerdict = verdict;
    return handler(req, ctx);
  };
}

/**
 * Pages Router wrapper (Next.js ≤ 12 / Pages API routes).
 *
 * Wraps a Next.js API handler so that the raw request body is scanned before
 * the handler runs. req.pompelmiVerdict is set to the scan verdict symbol.
 * If the body is malicious a 400 JSON response is sent immediately.
 *
 * @param {Function} handler  - (req, res) => void | Promise<void>
 * @param {object}   options  - ScanOptions (host, port, socket, …)
 * @returns {Function} Next.js Pages API handler
 *
 * @example
 * // pages/api/upload.js
 * import { withPompelmiHandler } from '@pompelmi/nextjs'
 *
 * async function handler(req, res) {
 *   res.json({ ok: true })
 * }
 *
 * export default withPompelmiHandler(handler, { host: 'localhost', port: 3310 })
 */
function withPompelmiHandler(handler, options = {}) {
  const scanOpts = buildScanOpts(options);

  return async function pompelmiPagesHandler(req, res) {
    let buf;
    try {
      buf = await bodyBuffer(req);
    } catch (_) {
      res.status(400).json({ error: 'Failed to read request body' });
      return;
    }

    const verdict = await scanBuffer(buf, scanOpts);

    if (verdict === Verdict.Malicious) {
      res.status(400).json({ error: 'Malicious file detected' });
      return;
    }

    req.pompelmiVerdict = verdict;
    return handler(req, res);
  };
}

module.exports = { withPompelmi, withPompelmiHandler, Verdict };
