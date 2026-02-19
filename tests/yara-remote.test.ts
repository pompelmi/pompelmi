/**
 * Tests for src/yara/remote.ts
 * Covers: createRemoteEngine, multipart mode, json-base64 mode, error handling,
 *         base64 helpers (btoa branch), rulesAsBase64 option
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRemoteEngine } from '../src/yara/remote';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeOkResponse(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    statusText: 'OK',
    async json() { return body; },
  } as Response;
}

function makeErrorResponse(status = 500, statusText = 'Internal Server Error') {
  return {
    ok: false,
    status,
    statusText,
    async json() { return null; },
  } as Response;
}

const RULES = 'rule test { condition: false }';
const BYTES = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"

// ─── multipart mode (default) ─────────────────────────────────────────────────

describe('createRemoteEngine – multipart mode', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: unknown;
  let originalFormData: unknown;
  let originalBlob: unknown;

  beforeEach(() => {
    fetchMock = vi.fn();
    originalFetch    = (globalThis as any).fetch;
    originalFormData = (globalThis as any).FormData;
    originalBlob     = (globalThis as any).Blob;

    (globalThis as any).fetch    = fetchMock;
    (globalThis as any).FormData = class MockFormData {
      private entries: Array<[string, unknown, string?]> = [];
      set(k: string, v: unknown, f?: string) { this.entries.push([k, v, f]); }
    };
    (globalThis as any).Blob = class MockBlob {
      constructor(public parts: unknown[], public opts: object) {}
    };
  });

  afterEach(() => {
    (globalThis as any).fetch    = originalFetch;
    (globalThis as any).FormData = originalFormData;
    (globalThis as any).Blob     = originalBlob;
  });

  it('returns an engine with compile()', async () => {
    const engine = await createRemoteEngine({ endpoint: '/api/scan' });
    expect(typeof engine.compile).toBe('function');
  });

  it('sends a POST request to the endpoint', async () => {
    fetchMock.mockResolvedValue(makeOkResponse([]));
    const engine = await createRemoteEngine({ endpoint: '/api/scan' });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scan');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('returns empty matches when server returns empty array', async () => {
    fetchMock.mockResolvedValue(makeOkResponse([]));
    const engine = await createRemoteEngine({ endpoint: '/api/scan' });
    const compiled = await engine.compile(RULES);
    const matches = await compiled.scan(BYTES);
    expect(matches).toEqual([]);
  });

  it('maps server matches to YaraMatch shape', async () => {
    fetchMock.mockResolvedValue(makeOkResponse([
      { rule: 'evil_rule', tags: ['high'] },
      { ruleIdentifier: 'other_rule' },
    ]));
    const engine = await createRemoteEngine({ endpoint: '/api/scan' });
    const compiled = await engine.compile(RULES);
    const matches = await compiled.scan(BYTES);
    expect(matches).toHaveLength(2);
    expect(matches[0].rule).toBe('evil_rule');
    expect(matches[0].tags).toEqual(['high']);
    expect(matches[1].rule).toBe('other_rule');
  });

  it('accepts matches under a "matches" key', async () => {
    fetchMock.mockResolvedValue(makeOkResponse({ matches: [{ rule: 'x', tags: [] }] }));
    const engine = await createRemoteEngine({ endpoint: '/api/scan' });
    const compiled = await engine.compile(RULES);
    const matches = await compiled.scan(BYTES);
    expect(matches).toHaveLength(1);
    expect(matches[0].rule).toBe('x');
  });

  it('throws on HTTP error response', async () => {
    fetchMock.mockResolvedValue(makeErrorResponse(422, 'Unprocessable'));
    const engine = await createRemoteEngine({ endpoint: '/api/scan' });
    const compiled = await engine.compile(RULES);
    await expect(compiled.scan(BYTES)).rejects.toThrow('[remote-yara] HTTP 422 Unprocessable');
  });

  it('forwards extra headers', async () => {
    fetchMock.mockResolvedValue(makeOkResponse([]));
    const engine = await createRemoteEngine({
      endpoint: '/api/scan',
      headers: { Authorization: 'Bearer token123' },
    });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    // In multipart mode headers are passed to fetch — they arrive in the options
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers).toMatchObject({ Authorization: 'Bearer token123' });
  });

  it('throws when FormData is not available', async () => {
    (globalThis as any).FormData = undefined;
    const engine = await createRemoteEngine({ endpoint: '/api/scan', mode: 'multipart' });
    const compiled = await engine.compile(RULES);
    await expect(compiled.scan(BYTES)).rejects.toThrow('FormData/Blob');
  });

  it('throws when fetch is not available', async () => {
    (globalThis as any).fetch = undefined;
    const engine = await createRemoteEngine({ endpoint: '/api/scan' });
    const compiled = await engine.compile(RULES);
    await expect(compiled.scan(BYTES)).rejects.toThrow('fetch');
  });
});

// ─── json-base64 mode ─────────────────────────────────────────────────────────

describe('createRemoteEngine – json-base64 mode', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: unknown;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(makeOkResponse([]));
    originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  it('sends JSON with Content-Type application/json', async () => {
    const engine = await createRemoteEngine({ endpoint: '/api/scan', mode: 'json-base64' });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers?.['Content-Type']).toBe('application/json');
  });

  it('includes base64-encoded file', async () => {
    const engine = await createRemoteEngine({ endpoint: '/api/scan', mode: 'json-base64' });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(typeof body.file).toBe('string'); // base64 string
  });

  it('sends rules as plain text by default', async () => {
    const engine = await createRemoteEngine({ endpoint: '/api/scan', mode: 'json-base64' });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.rules).toBe(RULES);
    expect(body.rulesB64).toBeUndefined();
  });

  it('sends rules as base64 when rulesAsBase64=true', async () => {
    const engine = await createRemoteEngine({
      endpoint: '/api/scan',
      mode: 'json-base64',
      rulesAsBase64: true,
    });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.rulesB64).toBeDefined();
    expect(body.rules).toBeUndefined();
  });

  it('uses custom rulesField and fileField', async () => {
    const engine = await createRemoteEngine({
      endpoint: '/api/scan',
      mode: 'json-base64',
      rulesField: 'my_rules',
      fileField: 'my_file',
    });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.my_rules).toBe(RULES);
    expect(typeof body.my_file).toBe('string');
  });

  it('handles null json response gracefully', async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      async json() { return null; },
    } as Response);
    const engine = await createRemoteEngine({ endpoint: '/api/scan', mode: 'json-base64' });
    const compiled = await engine.compile(RULES);
    const matches = await compiled.scan(BYTES);
    expect(matches).toEqual([]);
  });

  it('throws on HTTP error in json-base64 mode', async () => {
    fetchMock.mockResolvedValue(makeErrorResponse(403, 'Forbidden'));
    const engine = await createRemoteEngine({ endpoint: '/api/scan', mode: 'json-base64' });
    const compiled = await engine.compile(RULES);
    await expect(compiled.scan(BYTES)).rejects.toThrow('403');
  });
});

// ─── btoa fallback ────────────────────────────────────────────────────────────

describe('createRemoteEngine – btoa fallback (Buffer path)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: unknown;
  let originalBtoa: unknown;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(makeOkResponse([]));
    originalFetch = (globalThis as any).fetch;
    originalBtoa  = (globalThis as any).btoa;
    (globalThis as any).fetch = fetchMock;
    (globalThis as any).btoa  = undefined; // force Buffer fallback
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    (globalThis as any).btoa  = originalBtoa;
  });

  it('still sends a valid request using Buffer.from base64', async () => {
    const engine = await createRemoteEngine({ endpoint: '/api/scan', mode: 'json-base64' });
    const compiled = await engine.compile(RULES);
    await compiled.scan(BYTES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // Buffer.from(…).toString('base64') should produce valid base64
    expect(typeof body.file).toBe('string');
    expect(body.file.length).toBeGreaterThan(0);
  });
});
