'use strict';

const { scanBuffer, Verdict } = require('pompelmi');

// File is a global in Node 20+; on Node 18 it lives in node:buffer
const NodeFile = globalThis.File ?? require('node:buffer').File;

const SCAN_KEYS = ['host', 'port', 'socket', 'timeout', 'retries', 'retryDelay'];

function buildScanOptions(options) {
  const out = {};
  for (const k of SCAN_KEYS) {
    if (options[k] !== undefined) out[k] = options[k];
  }
  return out;
}

async function toBuffer(file) {
  if (Buffer.isBuffer(file)) return file;
  if (file instanceof Uint8Array) return Buffer.from(file);
  // Web API File / Blob
  if (file && typeof file.arrayBuffer === 'function') {
    return Buffer.from(await file.arrayBuffer());
  }
  return null;
}

/**
 * Scans an uploaded file with pompelmi inside a SvelteKit server action or
 * API route. Throws an HTTP 422 Response automatically on malicious files.
 *
 * Use in a +page.server.ts action or +server.ts route:
 *
 *   import { scanUpload } from '@pompelmi/sveltekit'
 *
 *   export const actions = {
 *     default: async ({ request }) => {
 *       const formData = await request.formData()
 *       await scanUpload(formData.get('file'), { host: 'localhost', port: 3310 })
 *       // file is guaranteed clean here
 *       return { success: true }
 *     }
 *   }
 *
 * @param {File|Blob|Buffer}  file                  - The uploaded file to scan.
 * @param {object}            [options]
 * @param {string}            [options.host]        - clamd hostname (enables TCP mode).
 * @param {number}            [options.port=3310]   - clamd port.
 * @param {string}            [options.socket]      - UNIX domain socket path.
 * @param {number}            [options.timeout]     - Socket idle timeout in ms.
 * @param {number}            [options.retries]     - Retry attempts.
 * @param {number}            [options.retryDelay]  - Delay between retries in ms.
 * @param {Function}          [options.onInfected]  - Called with ({ filename }) when malware
 *                                                   is detected. Must throw. Defaults to
 *                                                   throwing HTTP 422 Response.
 * @returns {Promise<symbol>} Verdict.Clean or Verdict.ScanError (never returns Verdict.Malicious).
 */
async function scanUpload(file, options) {
  if (!file) return Verdict.Clean;

  const scanOptions = buildScanOptions(options || {});
  const buffer = await toBuffer(file);

  if (!buffer || buffer.length === 0) return Verdict.Clean;

  const result = await scanBuffer(buffer, scanOptions);

  if (result === Verdict.Malicious) {
    const filename = (file && typeof file.name === 'string') ? file.name : 'upload';
    const onInfected = options && options.onInfected;
    if (typeof onInfected === 'function') {
      return onInfected({ filename });
    }
    throw new Response(
      JSON.stringify({ error: 'Malware detected', filename }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return result;
}

/**
 * Scans all File/Blob values in a FormData object. Throws on the first
 * malicious file found.
 *
 * @param {FormData}  formData             - The parsed form data.
 * @param {object}    [options]            - Same options as scanUpload.
 * @returns {Promise<void>}
 */
async function scanFormData(formData, options) {
  if (!formData || typeof formData.entries !== 'function') return;
  for (const [, value] of formData.entries()) {
    if (value instanceof NodeFile || (value && typeof value.arrayBuffer === 'function')) {
      await scanUpload(value, options);
    }
  }
}

module.exports = { scanUpload, scanFormData, Verdict };
