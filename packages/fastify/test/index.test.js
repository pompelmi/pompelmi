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

const POMPELMI_MOCK = path.join(__dirname, '__mock_pompelmi_fastify__');

const _origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, opts) {
  if (request === 'pompelmi') return POMPELMI_MOCK;
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

const plugin = require('../index');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFastify() {
  const decorators = {};
  return {
    decorate(name, value) { decorators[name] = value; },
    get pompelmi() { return decorators.pompelmi; },
  };
}

function register(options) {
  return new Promise((resolve, reject) => {
    const fastify = makeFastify();
    plugin(fastify, options || {}, (err) => {
      if (err) reject(err);
      else resolve(fastify);
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('@pompelmi/fastify plugin', () => {
  it('decorates fastify instance with pompelmi object', async () => {
    const fastify = await register({ host: 'localhost', port: 3310 });
    assert.ok(fastify.pompelmi, 'decorator should exist');
    assert.equal(typeof fastify.pompelmi.scan,        'function');
    assert.equal(typeof fastify.pompelmi.scanBuffer,  'function');
    assert.equal(typeof fastify.pompelmi.scanStream,  'function');
    assert.equal(typeof fastify.pompelmi.preHandler,  'function');
  });

  it('exposes Verdict on the decorator', async () => {
    const fastify = await register();
    assert.equal(fastify.pompelmi.Verdict.Clean,    Clean);
    assert.equal(fastify.pompelmi.Verdict.Malicious, Malicious);
  });

  it('scan() resolves to Clean', async () => {
    mockScanResult = Clean;
    const fastify = await register();
    assert.equal(await fastify.pompelmi.scan('/tmp/file.pdf'), Clean);
  });

  it('scanBuffer() resolves to Malicious', async () => {
    mockScanResult = Malicious;
    const fastify = await register();
    assert.equal(await fastify.pompelmi.scanBuffer(Buffer.from('eicar')), Malicious);
  });

  it('scanBuffer() resolves to Clean', async () => {
    mockScanResult = Clean;
    const fastify = await register();
    assert.equal(await fastify.pompelmi.scanBuffer(Buffer.from('safe')), Clean);
  });

  it('scanStream() resolves to Clean', async () => {
    mockScanResult = Clean;
    const fastify = await register();
    const { Readable } = require('stream');
    const stream = new Readable({ read() { this.push(Buffer.from('data')); this.push(null); } });
    assert.equal(await fastify.pompelmi.scanStream(stream), Clean);
  });

  it('preHandler() returns a function', async () => {
    const fastify = await register();
    assert.equal(typeof fastify.pompelmi.preHandler({ field: 'file' }), 'function');
  });

  it('preHandler() sends 400 for malicious file', async () => {
    mockScanResult = Malicious;
    const fastify  = await register();
    const handler  = fastify.pompelmi.preHandler({ field: 'file' });

    let sentCode, sentBody;
    const reply   = { code(c) { sentCode = c; return this; }, send(b) { sentBody = b; } };
    const request = { body: { file: Buffer.from('eicar') } };

    await handler(request, reply);
    assert.equal(sentCode, 400);
    assert.equal(sentBody.error, 'Malicious file detected');
  });

  it('preHandler() passes through for clean file', async () => {
    mockScanResult = Clean;
    const fastify  = await register();
    const handler  = fastify.pompelmi.preHandler({ field: 'file' });

    let sent = false;
    const reply   = { code() { return this; }, send() { sent = true; } };
    const request = { body: { file: Buffer.from('clean') } };

    await handler(request, reply);
    assert.equal(sent, false);
  });

  it('preHandler() skips scan when field is absent in body', async () => {
    mockScanResult = Malicious;
    const fastify  = await register();
    const handler  = fastify.pompelmi.preHandler({ field: 'file' });

    let sent = false;
    const reply   = { code() { return this; }, send() { sent = true; } };
    await handler({ body: {} }, reply);
    assert.equal(sent, false);
  });

  it('preHandler() skips scan when body is absent', async () => {
    mockScanResult = Malicious;
    const fastify  = await register();
    const handler  = fastify.pompelmi.preHandler();

    let sent = false;
    const reply   = { code() { return this; }, send() { sent = true; } };
    await handler({ body: null }, reply);
    assert.equal(sent, false);
  });

  it('preHandler() calls custom onMalicious handler when provided', async () => {
    mockScanResult = Malicious;
    const fastify  = await register();

    let customCalled = false;
    const onMalicious = () => { customCalled = true; };
    const handler  = fastify.pompelmi.preHandler({ field: 'file', onMalicious });

    let sent = false;
    const reply   = { code() { return this; }, send() { sent = true; } };
    const request = { body: { file: Buffer.from('eicar') } };

    await handler(request, reply);
    assert.equal(customCalled, true);
    assert.equal(sent, false, 'default reply.send should not be called');
  });

  it('plugin sets skip-override symbol for encapsulation', () => {
    assert.equal(plugin[Symbol.for('skip-override')], true);
  });

  it('registers without options (no-arg)', async () => {
    const fastify = await register();
    assert.ok(fastify.pompelmi);
  });
});
