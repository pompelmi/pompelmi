'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path   = require('path');
const { EventEmitter } = require('events');

// ── Mock pompelmi ─────────────────────────────────────────────────────────────

const CLEAN     = Symbol('Clean');
const MALICIOUS = Symbol('Malicious');
const SCAN_ERR  = Symbol('ScanError');
const mockVerdict = Object.freeze({ Clean: CLEAN, Malicious: MALICIOUS, ScanError: SCAN_ERR });

let mockScanResult = CLEAN;

const POMPELMI_MOCK = path.join(__dirname, '__mock_pompelmi_nextjs__');

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

const { withPompelmi, withPompelmiHandler } = require('../index.js');

// ── Fake Web API Request (App Router) ─────────────────────────────────────────

function fakeAppRequest(body = Buffer.alloc(0)) {
  return {
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    pompelmiVerdict: undefined,
  };
}

// ── Fake Pages Router request/response ───────────────────────────────────────

function fakePagesReq(body = Buffer.alloc(0)) {
  const emitter = new EventEmitter();
  process.nextTick(() => {
    emitter.emit('data', body);
    emitter.emit('end');
  });
  emitter.pompelmiVerdict = undefined;
  return emitter;
}

function fakePagesRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; },
  };
  return res;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('@pompelmi/nextjs', () => {
  describe('withPompelmi (App Router)', () => {
    it('calls handler and sets pompelmiVerdict when file is clean', async () => {
      mockScanResult = CLEAN;
      let capturedReq = null;

      const handler = async (req) => {
        capturedReq = req;
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      };

      const wrapped = withPompelmi(handler, {});
      const req = fakeAppRequest(Buffer.from('hello'));
      const res = await wrapped(req);

      assert.equal(res.status, 200);
      assert.equal(capturedReq.pompelmiVerdict, CLEAN);
    });

    it('returns 400 when file is malicious', async () => {
      mockScanResult = MALICIOUS;

      const handler = async () => new Response('should not reach', { status: 200 });
      const wrapped = withPompelmi(handler, {});
      const req = fakeAppRequest(Buffer.from('eicar'));
      const res = await wrapped(req);

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'Malicious file detected');
    });

    it('allows scan errors through (non-blocking)', async () => {
      mockScanResult = SCAN_ERR;
      let reached = false;

      const handler = async () => {
        reached = true;
        return new Response(JSON.stringify({ ok: true }));
      };

      const wrapped = withPompelmi(handler, {});
      await wrapped(fakeAppRequest());
      assert.ok(reached, 'handler should be called on ScanError');
    });
  });

  describe('withPompelmiHandler (Pages Router)', () => {
    it('calls handler when file is clean', async () => {
      mockScanResult = CLEAN;
      let reached = false;

      const handler = async (_req, res) => {
        reached = true;
        res.json({ ok: true });
      };

      const wrapped = withPompelmiHandler(handler, {});
      const req = fakePagesReq(Buffer.from('hello'));
      const res = fakePagesRes();
      await wrapped(req, res);

      assert.ok(reached);
      assert.equal(res._body.ok, true);
    });

    it('returns 400 when file is malicious', async () => {
      mockScanResult = MALICIOUS;

      const handler = async (_req, res) => { res.json({ ok: true }); };
      const wrapped = withPompelmiHandler(handler, {});
      const req = fakePagesReq(Buffer.from('eicar'));
      const res = fakePagesRes();
      await wrapped(req, res);

      assert.equal(res._status, 400);
      assert.equal(res._body.error, 'Malicious file detected');
    });

    it('sets pompelmiVerdict on request object', async () => {
      mockScanResult = CLEAN;
      let capturedReq = null;

      const handler = async (req, res) => {
        capturedReq = req;
        res.json({ ok: true });
      };

      const wrapped = withPompelmiHandler(handler, {});
      const req = fakePagesReq(Buffer.from('file data'));
      await wrapped(req, fakePagesRes());

      assert.equal(capturedReq.pompelmiVerdict, CLEAN);
    });
  });
});
