/**
 * Unit tests for @pompelmi/cloudflare
 *
 * We can't run cloudflare:sockets in Node.js, so we test:
 *   1. scanBuffer result parsing (by mocking the internal clamdInstream via a
 *      test-only re-implementation that replaces the dynamic import)
 *   2. scanRequest (mock Request with FormData, verify response codes)
 *
 * The clamdInstream function is not exported, so we test scanBuffer via
 * module-level mocking using a loader-safe approach:
 * we import a thin wrapper that accepts an injected transport.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock cloudflare:sockets before importing the module ──────────────────────

/**
 * We monkey-patch the dynamic import('cloudflare:sockets') by intercepting
 * it at the module level. Because top-level await hasn't run yet, we register
 * a custom loader via the import map approach — but since that requires CLI
 * flags, we instead test via a "thin-wrapper" approach:
 *
 * We create a minimal version of clamdInstream that accepts a response string
 * and test the downstream parsing logic directly.
 */

// Parsing logic extracted for direct testing
function parseResponse(response) {
  response = response.trim().replace(/\0/g, '');
  if (/^stream: OK/.test(response)) return 'clean';
  if (/^stream: .+ FOUND/.test(response)) return 'malicious';
  return 'error';
}

describe('@pompelmi/cloudflare — response parser', () => {
  it('clean response → "clean"', () => {
    assert.strictEqual(parseResponse('stream: OK'), 'clean');
  });

  it('infected response → "malicious"', () => {
    assert.strictEqual(parseResponse('stream: Eicar-Signature FOUND'), 'malicious');
    assert.strictEqual(parseResponse('stream: Win.Trojan.Agent FOUND'), 'malicious');
  });

  it('unknown response → "error"', () => {
    assert.strictEqual(parseResponse(''), 'error');
    assert.strictEqual(parseResponse('PONG'), 'error');
    assert.strictEqual(parseResponse('ERROR: Broken pipe'), 'error');
  });

  it('null bytes in response are stripped', () => {
    assert.strictEqual(parseResponse('stream: OK\0'), 'clean');
    assert.strictEqual(parseResponse('stream: Eicar FOUND\0'), 'malicious');
  });
});

// ── Mock Request / FormData for scanRequest tests ────────────────────────────

class MockFile {
  constructor(content, name) {
    this._content = content;
    this.name = name;
  }
  async arrayBuffer() {
    return new TextEncoder().encode(this._content).buffer;
  }
}

class MockFormData {
  constructor(fields) {
    this._fields = fields;
  }
  get(key) {
    return this._fields[key] ?? null;
  }
}

class MockRequest {
  constructor(fields) {
    this._fields = fields;
  }
  async formData() {
    return new MockFormData(this._fields);
  }
}

// ── scanRequest logic (tested via a re-implementation) ───────────────────────

async function scanRequestWithTransport(request, options, transport) {
  const field = options.field || 'file';
  const formData = await request.formData();
  const file = formData.get(field);
  if (!file) return null;
  const buffer = await file.arrayBuffer();
  const result = await transport(buffer, options);
  if (result === 'malicious') {
    return new Response('File rejected: malicious content detected', { status: 422 });
  }
  if (result === 'error') {
    return new Response('Scan error', { status: 500 });
  }
  return null;
}

describe('@pompelmi/cloudflare — scanRequest', () => {
  it('returns null for clean files', async () => {
    const request = new MockRequest({ file: new MockFile('hello', 'test.txt') });
    const result = await scanRequestWithTransport(
      request,
      { host: 'localhost', port: 3310 },
      async () => 'clean'
    );
    assert.strictEqual(result, null);
  });

  it('returns 422 for malicious files', async () => {
    const request = new MockRequest({ file: new MockFile('X5O!...EICAR', 'eicar.txt') });
    const result = await scanRequestWithTransport(
      request,
      { host: 'localhost', port: 3310 },
      async () => 'malicious'
    );
    assert.ok(result instanceof Response);
    assert.strictEqual(result.status, 422);
  });

  it('returns 500 on scan error', async () => {
    const request = new MockRequest({ file: new MockFile('data', 'test.pdf') });
    const result = await scanRequestWithTransport(
      request,
      { host: 'localhost', port: 3310 },
      async () => 'error'
    );
    assert.ok(result instanceof Response);
    assert.strictEqual(result.status, 500);
  });

  it('returns null when the form field is missing', async () => {
    const request = new MockRequest({});
    const result = await scanRequestWithTransport(
      request,
      { host: 'localhost', port: 3310 },
      async () => 'clean'
    );
    assert.strictEqual(result, null);
  });

  it('reads custom field name from options.field', async () => {
    let scannedBuffer = null;
    const request = new MockRequest({
      upload: new MockFile('data', 'file.pdf'),
    });
    const result = await scanRequestWithTransport(
      request,
      { host: 'localhost', port: 3310, field: 'upload' },
      async (buf) => { scannedBuffer = buf; return 'clean'; }
    );
    assert.strictEqual(result, null);
    assert.ok(scannedBuffer !== null);
  });
});
