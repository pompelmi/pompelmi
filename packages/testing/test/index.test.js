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

const POMPELMI_MOCK = path.join(__dirname, '__mock_pompelmi_testing__');

const _origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, opts) {
  if (request === 'pompelmi') return POMPELMI_MOCK;
  return _origResolve.call(Module, request, parent, isMain, opts);
};

require.cache[POMPELMI_MOCK] = {
  id: POMPELMI_MOCK, filename: POMPELMI_MOCK, loaded: true,
  exports: { Verdict: mockVerdict },
};

const {
  createMockScanner,
  mockClean,
  mockInfected,
  mockScanError,
  withMockedPompelmi,
  Verdict,
} = require('../index');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('@pompelmi/testing', () => {

  describe('Verdict re-export', () => {
    it('re-exports Clean, Malicious, ScanError symbols', () => {
      assert.equal(typeof Verdict.Clean,     'symbol');
      assert.equal(typeof Verdict.Malicious, 'symbol');
      assert.equal(typeof Verdict.ScanError, 'symbol');
    });
    it('symbols match mock pompelmi Verdict', () => {
      assert.equal(Verdict.Clean,     Clean);
      assert.equal(Verdict.Malicious, Malicious);
      assert.equal(Verdict.ScanError, ScanError);
    });
  });

  describe('createMockScanner()', () => {
    it('throws for invalid verdict', () => {
      assert.throws(() => createMockScanner(Symbol('Unknown')), /defaultVerdict must be one of/);
    });

    it('returns object with scan, scanBuffer, scanStream, scanS3', () => {
      const s = createMockScanner(Clean);
      assert.equal(typeof s.scan,       'function');
      assert.equal(typeof s.scanBuffer, 'function');
      assert.equal(typeof s.scanStream, 'function');
      assert.equal(typeof s.scanS3,     'function');
    });

    it('scan() resolves to given verdict', async () => {
      const s = createMockScanner(Clean);
      assert.equal(await s.scan('/tmp/file.pdf'), Clean);
    });

    it('scanBuffer() resolves to given verdict', async () => {
      const s = createMockScanner(Malicious);
      assert.equal(await s.scanBuffer(Buffer.from('eicar')), Malicious);
    });

    it('scanStream() resolves to given verdict', async () => {
      const s = createMockScanner(ScanError);
      assert.equal(await s.scanStream({}), ScanError);
    });

    it('scanS3() resolves to given verdict', async () => {
      const s = createMockScanner(Clean);
      assert.equal(await s.scanS3({ bucket: 'b', key: 'k' }), Clean);
    });

    it('stores _verdict on the scanner', () => {
      const s = createMockScanner(Malicious);
      assert.equal(s._verdict, Malicious);
    });

    it('exposes Verdict on the scanner', () => {
      const s = createMockScanner(Clean);
      assert.equal(s.Verdict.Clean,     Clean);
      assert.equal(s.Verdict.Malicious, Malicious);
    });
  });

  describe('mockClean()', () => {
    it('resolves to Clean', async () => {
      const s = mockClean();
      assert.equal(await s.scanBuffer(Buffer.from('data')), Clean);
    });

    it('scan() resolves to Clean', async () => {
      const s = mockClean();
      assert.equal(await s.scan('/file.txt'), Clean);
    });
  });

  describe('mockInfected()', () => {
    it('resolves to Malicious', async () => {
      const s = mockInfected('Win.Malware.Test');
      assert.equal(await s.scanBuffer(Buffer.from('eicar')), Malicious);
    });

    it('stores virusName', () => {
      const s = mockInfected('Win.Malware.Test');
      assert.equal(s.virusName, 'Win.Malware.Test');
    });

    it('defaults virusName to "Win.Malware.Test"', () => {
      const s = mockInfected();
      assert.equal(s.virusName, 'Win.Malware.Test');
    });

    it('scan() resolves to Malicious', async () => {
      const s = mockInfected('Eicar');
      assert.equal(await s.scan('/virus.exe'), Malicious);
    });
  });

  describe('mockScanError()', () => {
    it('resolves to ScanError', async () => {
      const s = mockScanError();
      assert.equal(await s.scanBuffer(Buffer.from('data')), ScanError);
    });

    it('scan() resolves to ScanError', async () => {
      const s = mockScanError();
      assert.equal(await s.scan('/file.bin'), ScanError);
    });
  });

  describe('withMockedPompelmi()', () => {
    it('passes mock scanner to fn', async () => {
      let received = null;
      await withMockedPompelmi(Clean, (scanner) => {
        received = scanner;
      });
      assert.ok(received !== null);
      assert.equal(typeof received.scanBuffer, 'function');
    });

    it('scanner resolves to given verdict', async () => {
      await withMockedPompelmi(Malicious, async (scanner) => {
        const result = await scanner.scanBuffer(Buffer.from('evil'));
        assert.equal(result, Malicious);
      });
    });

    it('returns a Promise', () => {
      const p = withMockedPompelmi(Clean, () => {});
      assert.equal(typeof p.then, 'function');
    });

    it('propagates errors thrown inside fn', async () => {
      await assert.rejects(
        () => withMockedPompelmi(Clean, () => { throw new Error('test error'); }),
        /test error/
      );
    });
  });
});
