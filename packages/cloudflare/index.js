/**
 * @pompelmi/cloudflare
 *
 * Connects to a remote clamd instance over TCP using Cloudflare's socket API.
 * Uses Web APIs only — no Node.js built-ins.
 *
 * Requires `connect` from `cloudflare:sockets` (available in Workers Runtime ≥ 2023-03-01).
 */

const INSTREAM_CHUNK = 4096; // bytes per INSTREAM chunk
const CLEAN_RESPONSE = /^stream: OK/;
const MALICIOUS_RESPONSE = /^stream: (.+) FOUND/;

/**
 * Send a Buffer or ArrayBuffer to clamd via INSTREAM and return the raw
 * response string.
 *
 * @param {ArrayBuffer} data
 * @param {{ host: string, port: number, timeout?: number }} options
 * @returns {Promise<string>}
 */
async function clamdInstream(data, { host, port, timeout = 15000 }) {
  // eslint-disable-next-line no-undef
  const { connect } = await import('cloudflare:sockets');
  const socket = connect({ hostname: host, port });

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();

  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  // Write INSTREAM command
  const cmd = new TextEncoder().encode('zINSTREAM\0');
  await writer.write(cmd);

  // Stream data in chunks with 4-byte big-endian length prefix
  let offset = 0;
  while (offset < bytes.byteLength) {
    const end = Math.min(offset + INSTREAM_CHUNK, bytes.byteLength);
    const chunk = bytes.subarray(offset, end);
    const lenBuf = new ArrayBuffer(4);
    new DataView(lenBuf).setUint32(0, chunk.byteLength, false);
    await writer.write(new Uint8Array(lenBuf));
    await writer.write(chunk);
    offset = end;
  }

  // Write zero-length chunk to signal end of stream
  const terminator = new Uint8Array([0, 0, 0, 0]);
  await writer.write(terminator);
  writer.releaseLock();

  // Read response with timeout
  const timeoutId = setTimeout(() => reader.cancel(), timeout);
  let response = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      response += decoder.decode(value, { stream: true });
      if (response.includes('\n') || response.includes('\0')) break;
    }
  } finally {
    clearTimeout(timeoutId);
    reader.releaseLock();
  }

  await socket.close();
  return response.trim().replace(/\0/g, '');
}

/**
 * Scan an ArrayBuffer with a remote clamd instance.
 *
 * @param {ArrayBuffer} buffer
 * @param {{ host: string, port: number, timeout?: number }} options
 * @returns {Promise<'clean' | 'malicious' | 'error'>}
 */
export async function scanBuffer(buffer, options) {
  if (!options || !options.host || !options.port) {
    throw new Error('@pompelmi/cloudflare: options.host and options.port are required');
  }
  try {
    const response = await clamdInstream(buffer, options);
    if (CLEAN_RESPONSE.test(response)) return 'clean';
    if (MALICIOUS_RESPONSE.test(response)) return 'malicious';
    return 'error';
  } catch {
    return 'error';
  }
}

/**
 * Convenience Cloudflare Worker handler that reads a multipart form field,
 * scans it, and returns HTTP 422 on malicious files.
 *
 * @param {Request} request
 * @param {{ host: string, port: number, field?: string, timeout?: number }} options
 * @returns {Promise<Response | null>} null if clean, Response if malicious/error
 */
export async function scanRequest(request, options) {
  const field = options.field || 'file';
  const formData = await request.formData();
  const file = formData.get(field);
  if (!file) return null;
  const buffer = await file.arrayBuffer();
  const result = await scanBuffer(buffer, options);
  if (result === 'malicious') {
    return new Response('File rejected: malicious content detected', { status: 422 });
  }
  if (result === 'error') {
    return new Response('Scan error', { status: 500 });
  }
  return null;
}
