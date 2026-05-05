'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path   = require('path');

// ── Mock setup ────────────────────────────────────────────────────────────────
// Both pompelmi and @nestjs/common are intercepted before any source file loads.

const Clean     = Symbol('Clean');
const Malicious = Symbol('Malicious');
const ScanError = Symbol('ScanError');
const mockVerdict = Object.freeze({ Clean, Malicious, ScanError });

let mockScanResult = Clean;

const POMPELMI_MOCK     = path.join(__dirname, '__mock_pompelmi__');
const NESTJS_MOCK       = path.join(__dirname, '__mock_nestjs_common__');

class BadRequestException extends Error {
  constructor(msg) {
    super(msg);
    this.name   = 'BadRequestException';
    this.status = 400;
  }
}

const _origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, opts) {
  if (request === 'pompelmi')       return POMPELMI_MOCK;
  if (request === '@nestjs/common') return NESTJS_MOCK;
  return _origResolve.call(Module, request, parent, isMain, opts);
};

require.cache[POMPELMI_MOCK] = {
  id: POMPELMI_MOCK, filename: POMPELMI_MOCK, loaded: true,
  exports: {
    Verdict:     mockVerdict,
    scan:        async () => mockScanResult,
    scanBuffer:  async () => mockScanResult,
    scanStream:  async () => mockScanResult,
  },
};

require.cache[NESTJS_MOCK] = {
  id: NESTJS_MOCK, filename: NESTJS_MOCK, loaded: true,
  exports: { BadRequestException },
};

// Load source modules (will pick up the mocked dependencies above)
const { PompelmiService }     = require('../src/pompelmi.service');
const { PompelmiGuard }       = require('../src/pompelmi.guard');
const { PompelmiInterceptor } = require('../src/pompelmi.interceptor');
const { PompelmiModule, POMPELMI_OPTIONS } = require('../src/pompelmi.module');

// ── PompelmiService ───────────────────────────────────────────────────────────

describe('PompelmiService', () => {
  it('scan() resolves to Clean when file is clean', async () => {
    mockScanResult = Clean;
    const svc = new PompelmiService({ host: 'localhost', port: 3310 });
    assert.equal(await svc.scan('/tmp/file.pdf'), Clean);
  });

  it('scanBuffer() resolves to Malicious when file is infected', async () => {
    mockScanResult = Malicious;
    const svc = new PompelmiService();
    assert.equal(await svc.scanBuffer(Buffer.from('eicar')), Malicious);
  });

  it('scanStream() resolves to Clean', async () => {
    mockScanResult = Clean;
    const svc = new PompelmiService();
    const { Readable } = require('stream');
    const stream = new Readable({ read() { this.push(null); } });
    assert.equal(await svc.scanStream(stream), Clean);
  });

  it('isMalware() returns true for infected buffer', async () => {
    mockScanResult = Malicious;
    assert.equal(await new PompelmiService().isMalware(Buffer.from('eicar')), true);
  });

  it('isMalware() returns false for clean buffer', async () => {
    mockScanResult = Clean;
    assert.equal(await new PompelmiService().isMalware(Buffer.from('safe')), false);
  });

  it('stores options passed to constructor', () => {
    const opts = { host: 'clamd-svc', port: 3310, timeout: 5000 };
    assert.deepEqual(new PompelmiService(opts).options, opts);
  });

  it('defaults to empty options object when none given', () => {
    assert.deepEqual(new PompelmiService().options, {});
  });
});

// ── PompelmiGuard ─────────────────────────────────────────────────────────────

describe('PompelmiGuard', () => {
  function makeContext(file) {
    return { switchToHttp: () => ({ getRequest: () => ({ file }) }) };
  }

  it('allows request when no file is present', async () => {
    mockScanResult = Malicious;
    const guard = new PompelmiGuard(new PompelmiService());
    assert.equal(await guard.canActivate(makeContext(null)), true);
  });

  it('allows request for clean file', async () => {
    mockScanResult = Clean;
    const guard = new PompelmiGuard(new PompelmiService());
    assert.equal(await guard.canActivate(makeContext({ buffer: Buffer.from('clean') })), true);
  });

  it('blocks request for malicious file', async () => {
    mockScanResult = Malicious;
    const guard = new PompelmiGuard(new PompelmiService());
    assert.equal(await guard.canActivate(makeContext({ buffer: Buffer.from('eicar') })), false);
  });

  it('uses req.files[0] when req.file is absent', async () => {
    mockScanResult = Malicious;
    const guard = new PompelmiGuard(new PompelmiService());
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ files: [{ buffer: Buffer.from('eicar') }] }),
      }),
    };
    assert.equal(await guard.canActivate(ctx), false);
  });
});

// ── PompelmiInterceptor ───────────────────────────────────────────────────────

describe('PompelmiInterceptor', () => {
  function makeContext(file) {
    return { switchToHttp: () => ({ getRequest: () => ({ file }) }) };
  }

  const makeNext = () => ({ handle: () => Promise.resolve('handler-result') });

  it('passes through when no file is present', async () => {
    mockScanResult = Clean;
    const result = await new PompelmiInterceptor(new PompelmiService())
      .intercept(makeContext(null), makeNext());
    assert.equal(result, 'handler-result');
  });

  it('passes through for a clean file', async () => {
    mockScanResult = Clean;
    const result = await new PompelmiInterceptor(new PompelmiService())
      .intercept(makeContext({ buffer: Buffer.from('clean') }), makeNext());
    assert.equal(result, 'handler-result');
  });

  it('throws BadRequestException for malicious file', async () => {
    mockScanResult = Malicious;
    await assert.rejects(
      () => new PompelmiInterceptor(new PompelmiService())
        .intercept(makeContext({ buffer: Buffer.from('eicar') }), makeNext()),
      (err) => {
        assert.equal(err.name, 'BadRequestException');
        assert.match(err.message, /Malicious/);
        return true;
      }
    );
  });
});

// ── PompelmiModule ────────────────────────────────────────────────────────────

describe('PompelmiModule', () => {
  it('forRoot() returns a dynamic module with correct shape', () => {
    const mod = PompelmiModule.forRoot({ host: 'localhost', port: 3310 });
    assert.equal(mod.module, PompelmiModule);
    assert.ok(Array.isArray(mod.providers));
    assert.ok(Array.isArray(mod.exports));
    assert.ok(mod.exports.includes(PompelmiService));
  });

  it('forRoot() options provider carries the supplied options', () => {
    const opts = { host: 'clamd', port: 3310 };
    const mod = PompelmiModule.forRoot(opts);
    const optsProv = mod.providers.find(p => p.provide === POMPELMI_OPTIONS);
    assert.ok(optsProv, 'POMPELMI_OPTIONS provider must exist');
    assert.deepEqual(optsProv.useValue, opts);
  });

  it('forRoot() service factory creates a PompelmiService', () => {
    const opts = { port: 3310 };
    const mod  = PompelmiModule.forRoot(opts);
    const svcProv = mod.providers.find(p => p.provide === PompelmiService);
    assert.ok(svcProv, 'PompelmiService provider must exist');
    const svc = svcProv.useFactory(opts);
    assert.ok(svc instanceof PompelmiService);
    assert.deepEqual(svc.options, opts);
  });

  it('forRoot() with no arguments defaults to empty options', () => {
    const mod = PompelmiModule.forRoot();
    const optsProv = mod.providers.find(p => p.provide === POMPELMI_OPTIONS);
    assert.deepEqual(optsProv.useValue, {});
  });

  it('forRootAsync() with useFactory returns async dynamic module', () => {
    const factory = () => ({ host: 'localhost' });
    const mod = PompelmiModule.forRootAsync({ useFactory: factory });
    assert.equal(mod.module, PompelmiModule);
    const optsProv = mod.providers.find(p => p.provide === POMPELMI_OPTIONS);
    assert.ok(optsProv, 'async POMPELMI_OPTIONS provider must exist');
    assert.equal(optsProv.useFactory, factory);
  });

  it('forRootAsync() includes imports array when provided', () => {
    const fakeModule = {};
    const mod = PompelmiModule.forRootAsync({
      imports: [fakeModule],
      useFactory: () => ({}),
    });
    assert.ok(mod.imports.includes(fakeModule));
  });
});
