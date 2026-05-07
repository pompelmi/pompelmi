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

async function collectStream(data) {
  const chunks = [];
  for await (const chunk of data) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Creates a Remix UploadHandler that scans each uploaded file with pompelmi
 * before passing it to an optional inner handler.
 *
 * Usage in a Remix action:
 *
 *   import { unstable_parseMultipartFormData } from '@remix-run/node'
 *   import { pompelmiUploadHandler } from '@pompelmi/remix'
 *
 *   export async function action({ request }) {
 *     const formData = await unstable_parseMultipartFormData(
 *       request,
 *       pompelmiUploadHandler({ host: 'localhost', port: 3310 })
 *     )
 *     // file is guaranteed clean here
 *   }
 *
 * @param {object}   [options]
 * @param {string}   [options.field]           - Only scan this field; pass others through (default: scan all files).
 * @param {Function} [options.inner]           - Inner UploadHandler for clean files. Defaults to storing as File.
 * @param {string}   [options.host]            - clamd hostname.
 * @param {number}   [options.port=3310]       - clamd port.
 * @param {string}   [options.socket]          - UNIX socket path.
 * @param {number}   [options.timeout=15000]   - Socket idle timeout in ms.
 * @param {number}   [options.retries=0]       - Retry attempts.
 * @param {number}   [options.retryDelay=1000] - Delay between retries in ms.
 * @param {Function} [options.onInfected]      - Called with ({ name, filename }) when malware is detected.
 *                                              Must throw or return a Response. Default throws HTTP 422.
 */
function pompelmiUploadHandler(options) {
  const { field, inner, onInfected } = options || {};
  const scanOptions = buildScanOptions(options || {});

  return async function remixUploadHandler({ name, filename, contentType, data }) {
    // Skip non-file fields (no filename) or fields not targeted
    if (!filename || (field && name !== field)) {
      if (typeof inner === 'function') {
        return inner({ name, filename, contentType, data });
      }
      const buf = await collectStream(data);
      // Text field (no filename) → return as string; file field → return as File
      if (!filename) return buf.toString('utf8');
      return new File([buf], filename, { type: contentType });
    }

    const buffer = await collectStream(data);

    if (buffer.length > 0) {
      const result = await scanBuffer(buffer, scanOptions);
      if (result === Verdict.Malicious) {
        if (typeof onInfected === 'function') {
          return onInfected({ name, filename });
        }
        throw new Response(
          JSON.stringify({ error: 'Malware detected', filename }),
          { status: 422, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (typeof inner === 'function') {
      // Replay the buffer through the inner handler via an async generator
      async function* replay() { yield buffer; }
      return inner({ name, filename, contentType, data: replay() });
    }

    return new File([buffer], filename, { type: contentType });
  };
}

module.exports = { pompelmiUploadHandler, Verdict };
