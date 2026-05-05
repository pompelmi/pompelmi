'use strict';

const { scan, scanBuffer, scanStream, Verdict } = require('pompelmi');

function buildScanOptions(options) {
  const keys = ['host', 'port', 'socket', 'timeout', 'retries', 'retryDelay'];
  const out = {};
  for (const k of keys) {
    if (options[k] !== undefined) out[k] = options[k];
  }
  return out;
}

function pompelmiPlugin(fastify, options, done) {
  const scanOptions = buildScanOptions(options || {});

  const pompelmi = {
    Verdict,

    scan(filePath) {
      return scan(filePath, scanOptions);
    },

    scanBuffer(buffer) {
      return scanBuffer(buffer, scanOptions);
    },

    scanStream(stream) {
      return scanStream(stream, scanOptions);
    },

    preHandler(opts) {
      const { field = 'file', onMalicious } = opts || {};
      return async function pompelmiPreHandler(request, reply) {
        const body = request.body;
        if (!body) return;
        const raw = body[field];
        if (!raw) return;
        const buffer = Buffer.isBuffer(raw) ? raw : (raw._buf || raw.data || null);
        if (!buffer) return;
        const result = await scanBuffer(buffer, scanOptions);
        if (result === Verdict.Malicious) {
          if (typeof onMalicious === 'function') return onMalicious(request, reply);
          return reply.code(400).send({ error: 'Malicious file detected' });
        }
      };
    },
  };

  fastify.decorate('pompelmi', pompelmi);
  done();
}

pompelmiPlugin[Symbol.for('skip-override')] = true;

module.exports = pompelmiPlugin;
