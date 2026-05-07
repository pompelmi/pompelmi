'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path   = require('path');

// File is a global in Node 20+; on Node 18 it lives in node:buffer
const NodeFile = globalThis.File ?? require('node:buffer').File;

// ── Mock pompelmi ─────────────────────────────────────────────────────────────

const Clean     = Symbol('Clean');
const Malicious = Symbol('Malicious');
const ScanError = Symbol('ScanError');
const mockVerdict = Object.freeze({ Clean, Malicious, ScanError });

let mockScanResult = Clean;

const POMPELMI_MOCK = path.join(__dirname, '__mock_pompelmi_sveltekit__');

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

const { scanUpload, scanFormData, Verdict } = require('../index');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('@pompelmi/sveltekit', () => {

  describe('scanUpload()', () => {

    it('exports scanUpload as a function', () => {
      assert.equal(typeof scanUpload, 'function');
    });

    it('exports Verdict constants', () => {
      assert.equal(typeof Verdict.Clean,     'symbol');
      assert.equal(typeof Verdict.Malicious, 'symbol');
      assert.equal(typeof Verdict.ScanError, 'symbol');
    });

    it('returns Verdict.Clean for a clean Buffer', async () => {
      mockScanResult = Clean;
      const result = await scanUpload(Buffer.from('safe content'));
      assert.equal(result, Verdict.Clean);
    });

    it('throws Response(422) for a malicious Buffer', async () => {
      mockScanResult = Malicious;
      let thrown = null;
      try {
        await scanUpload(Buffer.from('eicar'));
      } catch (e) {
        thrown = e;
      }
      assert.ok(thrown instanceof Response);
      assert.equal(thrown.status, 422);
    });

    it('throws Response(422) for a malicious File', async () => {
      mockScanResult = Malicious;
      const file = new NodeFile([Buffer.from('eicar')], 'virus.exe', { type: 'application/octet-stream' });
      let thrown = null;
      try {
        await scanUpload(file);
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
      let thrown = null;
      try {
        const file = new NodeFile([Buffer.from('eicar')], 'bad.pdf');
        await scanUpload(file, { onInfected });
      } catch (e) {
        thrown = e;
      }
      assert.equal(capturedFilename, 'bad.pdf');
      assert.ok(thrown instanceof Response);
      assert.equal(thrown.status, 400);
    });

    it('returns Verdict.ScanError and does not throw', async () => {
      mockScanResult = ScanError;
      const result = await scanUpload(Buffer.from('data'));
      assert.equal(result, Verdict.ScanError);
    });

    it('returns Verdict.Clean for null input', async () => {
      mockScanResult = Malicious;
      const result = await scanUpload(null);
      assert.equal(result, Verdict.Clean);
    });

    it('returns Verdict.Clean for undefined input', async () => {
      mockScanResult = Malicious;
      const result = await scanUpload(undefined);
      assert.equal(result, Verdict.Clean);
    });

    it('returns Verdict.Clean for empty Buffer', async () => {
      mockScanResult = Malicious;
      const result = await scanUpload(Buffer.alloc(0));
      assert.equal(result, Verdict.Clean);
    });

    it('handles File-like object with arrayBuffer()', async () => {
      mockScanResult = Clean;
      const fileLike = {
        name: 'test.pdf',
        arrayBuffer: () => Promise.resolve(Buffer.from('pdf content').buffer),
      };
      const result = await scanUpload(fileLike);
      assert.equal(result, Verdict.Clean);
    });

    it('extracts filename from File object for 422 body', async () => {
      mockScanResult = Malicious;
      const file = new NodeFile([Buffer.from('eicar')], 'infected.docx');
      let thrown = null;
      try {
        await scanUpload(file);
      } catch (e) {
        thrown = e;
      }
      assert.ok(thrown instanceof Response);
      const body = await thrown.json();
      assert.equal(body.filename, 'infected.docx');
    });
  });

  describe('scanFormData()', () => {

    it('exports scanFormData as a function', () => {
      assert.equal(typeof scanFormData, 'function');
    });

    it('resolves without throwing for clean FormData', async () => {
      mockScanResult = Clean;
      const fd = new FormData();
      fd.append('file', new NodeFile([Buffer.from('safe')], 'safe.txt'));
      await scanFormData(fd);
    });

    it('throws Response(422) when FormData contains a malicious file', async () => {
      mockScanResult = Malicious;
      const fd = new FormData();
      fd.append('upload', new NodeFile([Buffer.from('eicar')], 'virus.exe'));
      let thrown = null;
      try {
        await scanFormData(fd);
      } catch (e) {
        thrown = e;
      }
      assert.ok(thrown instanceof Response);
      assert.equal(thrown.status, 422);
    });

    it('resolves immediately for null formData', async () => {
      await scanFormData(null);
    });

    it('resolves immediately for undefined formData', async () => {
      await scanFormData(undefined);
    });
  });
});
