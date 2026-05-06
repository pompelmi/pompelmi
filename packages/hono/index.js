'use strict';

const { scanBuffer, Verdict } = require('pompelmi');

const SCAN_KEYS = ['host', 'port', 'socket', 'timeout', 'retries', 'retryDelay'];

function buildScanOptions(options) {
  const out = {};
  for (const k of SCAN_KEYS) {
    if (options[k] !== undefined) out[k] = options[k];
  }
  return out;
}

async function toBuffer(raw) {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  // Web API File / Blob (Hono on Bun, Cloudflare Workers, Node 20+)
  if (raw && typeof raw.arrayBuffer === 'function') {
    return Buffer.from(await raw.arrayBuffer());
  }
  if (typeof raw === 'string') return Buffer.from(raw);
  return null;
}

/**
 * Hono middleware that scans an uploaded file with pompelmi before the route
 * handler runs.  The file is read from the parsed multipart body.
 *
 * @param {object}  [options]
 * @param {string}  [options.field='file']      - Form field name containing the file.
 * @param {string}  [options.host]              - clamd hostname (enables TCP mode).
 * @param {number}  [options.port=3310]         - clamd port.
 * @param {string}  [options.socket]            - UNIX domain socket path.
 * @param {number}  [options.timeout=15000]     - Socket idle timeout in ms.
 * @param {number}  [options.retries=0]         - Number of retry attempts.
 * @param {number}  [options.retryDelay=1000]   - Delay between retries in ms.
 * @param {Function} [options.onInfected]       - Called with (c, filename) when malware
 *                                               is detected; must return a Response.
 *                                               Defaults to 422 JSON error.
 */
function pompelmiMiddleware(options) {
  const { field = 'file', onInfected } = options || {};
  const scanOptions = buildScanOptions(options || {});

  return async function pompelmiHonoMiddleware(c, next) {
    let body;
    try {
      body = await c.req.parseBody();
    } catch {
      return next();
    }

    const raw = body[field];
    if (raw == null) return next();

    const buffer = await toBuffer(raw);
    if (!buffer || buffer.length === 0) return next();

    const result = await scanBuffer(buffer, scanOptions);

    if (result === Verdict.Malicious) {
      const filename = (raw && typeof raw.name === 'string') ? raw.name : field;
      if (typeof onInfected === 'function') {
        return onInfected(c, filename);
      }
      return c.json({ error: 'Malware detected' }, 422);
    }

    return next();
  };
}

module.exports = { pompelmiMiddleware, Verdict };
