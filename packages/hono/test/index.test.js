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

const POMPELMI_MOCK = path.join(__dirname, '__mock_pompelmi_hono__');

const _origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, opts) {
  if (request === 'pompelmi') return POMPELMI_MOCK;
  return _origResolve.call(Module, request, parent, isMain, opts);
};

require.cache[POMPELMI_MOCK] = {
  id: POMPELMI_MOCK, filename: POMPELMI_MOCK, loaded: true,
  exports: {
    Verdict:     mockVerdict,
    scanBuffer:  async () => mockScanResult,
  },
};

const { pompelmiMiddleware, Verdict } = require('../index');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContext(fileData, fieldName) {
  fieldName = fieldName || 'file';
  const body = {};

  if (fileData !== undefined) {
    if (fileData instanceof Buffer) {
      body[fieldName] = fileData;
    } else if (fileData === null) {
      // omit the field
    } else {
      body[fieldName] = fileData;
    }
  }

  return {
    _response: null,
    _status:   null,
    req: {
      parseBody: () => Promise.resolve(body),
    },
    json(data, status) {
      this._response = data;
      this._status   = status || 200;
      return this;
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('@pompelmi/hono pompelmiMiddleware', () => {

  it('exports pompelmiMiddleware as a function', () => {
    assert.equal(typeof pompelmiMiddleware, 'function');
  });

  it('returns a middleware function', () => {
    const mw = pompelmiMiddleware({});
    assert.equal(typeof mw, 'function');
  });

  it('exports Verdict constants', () => {
    assert.equal(typeof Verdict.Clean,     'symbol');
    assert.equal(typeof Verdict.Malicious, 'symbol');
    assert.equal(typeof Verdict.ScanError, 'symbol');
  });

  it('calls next() for a clean file', async () => {
    mockScanResult = Clean;
    const mw = pompelmiMiddleware({});
    const c  = makeContext(Buffer.from('safe content'));
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
    assert.equal(c._response, null);
  });

  it('returns 422 JSON for a malicious file', async () => {
    mockScanResult = Malicious;
    const mw = pompelmiMiddleware({});
    const c  = makeContext(Buffer.from('eicar'));
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, false);
    assert.equal(c._status, 422);
    assert.equal(c._response.error, 'Malware detected');
  });

  it('calls next() for ScanError (non-malicious verdict)', async () => {
    mockScanResult = ScanError;
    const mw = pompelmiMiddleware({});
    const c  = makeContext(Buffer.from('data'));
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });

  it('calls next() when field is absent in body', async () => {
    mockScanResult = Malicious;
    const mw = pompelmiMiddleware({ field: 'file' });
    const c  = makeContext(null);  // no 'file' field
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });

  it('calls next() when field value is undefined', async () => {
    mockScanResult = Malicious;
    const mw = pompelmiMiddleware({ field: 'file' });
    const c = {
      req: { parseBody: () => Promise.resolve({ other: 'data' }) },
      json() {},
    };
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });

  it('calls custom onInfected when provided and file is malicious', async () => {
    mockScanResult = Malicious;
    let infectedFilename = null;
    const onInfected = (_c, filename) => { infectedFilename = filename; return 'custom'; };
    const mw = pompelmiMiddleware({ onInfected });
    const c  = makeContext(Buffer.from('eicar'));
    const result = await mw(c, () => Promise.resolve());
    assert.equal(infectedFilename, 'file');
    assert.equal(result, 'custom');
  });

  it('uses custom field name', async () => {
    mockScanResult = Malicious;
    const mw = pompelmiMiddleware({ field: 'attachment' });
    const body = { attachment: Buffer.from('malware') };
    const c = {
      _response: null, _status: null,
      req: { parseBody: () => Promise.resolve(body) },
      json(data, status) { this._response = data; this._status = status; return this; },
    };
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, false);
    assert.equal(c._status, 422);
  });

  it('handles File-like object with arrayBuffer()', async () => {
    mockScanResult = Clean;
    const mw = pompelmiMiddleware({});
    const fileLike = {
      name: 'test.pdf',
      arrayBuffer: () => Promise.resolve(Buffer.from('pdf content').buffer),
    };
    const c = {
      req: { parseBody: () => Promise.resolve({ file: fileLike }) },
      json() {},
    };
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });

  it('handles File-like object with filename in onInfected', async () => {
    mockScanResult = Malicious;
    let capturedFilename = null;
    const onInfected = (_c, filename) => { capturedFilename = filename; };
    const mw = pompelmiMiddleware({ onInfected });
    const fileLike = {
      name: 'virus.exe',
      arrayBuffer: () => Promise.resolve(Buffer.from('eicar').buffer),
    };
    const c = {
      req: { parseBody: () => Promise.resolve({ file: fileLike }) },
      json() {},
    };
    await mw(c, () => Promise.resolve());
    assert.equal(capturedFilename, 'virus.exe');
  });

  it('calls next() when parseBody throws', async () => {
    const mw = pompelmiMiddleware({});
    const c = {
      req: { parseBody: () => Promise.reject(new Error('parse error')) },
      json() {},
    };
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });

  it('calls next() for empty buffer (length === 0)', async () => {
    mockScanResult = Malicious;
    const mw = pompelmiMiddleware({});
    const c  = makeContext(Buffer.alloc(0));
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });

  it('handles string field value', async () => {
    mockScanResult = Clean;
    const mw = pompelmiMiddleware({});
    const c = {
      req: { parseBody: () => Promise.resolve({ file: 'hello world' }) },
      json() {},
    };
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });

  it('handles Uint8Array field value', async () => {
    mockScanResult = Clean;
    const mw = pompelmiMiddleware({});
    const c = {
      req: { parseBody: () => Promise.resolve({ file: new Uint8Array([1, 2, 3]) }) },
      json() {},
    };
    let nextCalled = false;
    await mw(c, () => { nextCalled = true; return Promise.resolve(); });
    assert.equal(nextCalled, true);
  });
});
