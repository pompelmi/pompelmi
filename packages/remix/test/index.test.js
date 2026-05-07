'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path   = require('path');

// ── Mock pompelmi ─────────────────────────────────────────────────────────────

const Clean     = Symbol('Clean');
const Malicious = Symbol('Malicious');
const ScanError = Symbol('ScanError');
const mockVerdict = Object.freeze({ Clean, Malicious, ScanError });

let mockScanResult = Clean;

const POMPELMI_MOCK = path.join(__dirname, '__mock_pompelmi_remix__');

const _origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, opts) {
  if (request === 'pompelmi') return POMPELMI_MOCK;
  return _origResolve.call(Module, request, parent, isMain, opts);
};

require.cache[POMPELMI_MOCK] = {
  id: POMPELMI_MOCK, filename: POMPELMI_MOCK, loaded: true,
  exports: {
    Verdict:    mockVerdict,
    scanBuffer: async () => mockScanResult,
  },
};

const { pompelmiUploadHandler, Verdict } = require('../index');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function* streamFrom(buf) {
  yield buf;
}

function makeArgs(buf, name = 'file', filename = 'upload.bin', contentType = 'application/octet-stream') {
  return { name, filename, contentType, data: streamFrom(buf) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('@pompelmi/remix pompelmiUploadHandler', () => {

  it('exports pompelmiUploadHandler as a function', () => {
    assert.equal(typeof pompelmiUploadHandler, 'function');
  });

  it('returns a handler function', () => {
    const handler = pompelmiUploadHandler({});
    assert.equal(typeof handler, 'function');
  });

  it('exports Verdict constants', () => {
    assert.equal(typeof Verdict.Clean,     'symbol');
    assert.equal(typeof Verdict.Malicious, 'symbol');
    assert.equal(typeof Verdict.ScanError, 'symbol');
  });

  it('returns a File for a clean upload', async () => {
    mockScanResult = Clean;
    const handler = pompelmiUploadHandler({});
    const result = await handler(makeArgs(Buffer.from('safe content')));
    assert.ok(result instanceof File);
    assert.equal(result.name, 'upload.bin');
  });

  it('throws a Response (422) for a malicious upload', async () => {
    mockScanResult = Malicious;
    const handler = pompelmiUploadHandler({});
    let thrown = null;
    try {
      await handler(makeArgs(Buffer.from('eicar')));
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown instanceof Response);
    assert.equal(thrown.status, 422);
  });

  it('calls custom onInfected when provided', async () => {
    mockScanResult = Malicious;
    let capturedFilename = null;
    const onInfected = ({ filename }) => {
      capturedFilename = filename;
      throw new Response('blocked', { status: 400 });
    };
    const handler = pompelmiUploadHandler({ onInfected });
    let thrown = null;
    try {
      await handler(makeArgs(Buffer.from('eicar'), 'file', 'virus.exe'));
    } catch (e) {
      thrown = e;
    }
    assert.equal(capturedFilename, 'virus.exe');
    assert.ok(thrown instanceof Response);
    assert.equal(thrown.status, 400);
  });

  it('passes clean file through inner handler', async () => {
    mockScanResult = Clean;
    let innerGotBuffer = null;
    const inner = async ({ data }) => {
      const chunks = [];
      for await (const c of data) chunks.push(c);
      innerGotBuffer = Buffer.concat(chunks);
      return new File([innerGotBuffer], 'inner.bin');
    };
    const handler = pompelmiUploadHandler({ inner });
    const result = await handler(makeArgs(Buffer.from('clean data')));
    assert.ok(result instanceof File);
    assert.equal(innerGotBuffer.toString(), 'clean data');
  });

  it('calls next() (passes through) for non-file fields (no filename)', async () => {
    mockScanResult = Malicious;
    const handler = pompelmiUploadHandler({});
    const args = { name: 'description', filename: undefined, contentType: 'text/plain', data: streamFrom(Buffer.from('hello')) };
    const result = await handler(args);
    // should return text, not throw
    assert.equal(result, 'hello');
  });

  it('skips non-targeted field when `field` option is set', async () => {
    mockScanResult = Malicious;
    const handler = pompelmiUploadHandler({ field: 'avatar' });
    // upload to field 'resume', not 'avatar' — should not throw
    const args = makeArgs(Buffer.from('eicar'), 'resume', 'resume.pdf');
    const result = await handler(args);
    // no inner handler → returns File directly without scanning
    assert.ok(result instanceof File);
  });

  it('scans targeted field when `field` option matches', async () => {
    mockScanResult = Malicious;
    const handler = pompelmiUploadHandler({ field: 'avatar' });
    const args = makeArgs(Buffer.from('eicar'), 'avatar', 'avatar.jpg');
    let thrown = null;
    try {
      await handler(args);
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown instanceof Response);
    assert.equal(thrown.status, 422);
  });

  it('calls next() for ScanError (non-malicious verdict)', async () => {
    mockScanResult = ScanError;
    const handler = pompelmiUploadHandler({});
    const result = await handler(makeArgs(Buffer.from('data')));
    assert.ok(result instanceof File);
  });

  it('skips scan for empty buffer', async () => {
    mockScanResult = Malicious;
    const handler = pompelmiUploadHandler({});
    async function* empty() { yield Buffer.alloc(0); }
    const args = { name: 'file', filename: 'empty.bin', contentType: 'application/octet-stream', data: empty() };
    const result = await handler(args);
    assert.ok(result instanceof File);
  });
});
