# @pompelmi/fastify

Fastify plugin for [pompelmi](https://pompelmi.app) — in-process ClamAV virus scanning with zero extra dependencies.

## Installation

```bash
npm install @pompelmi/fastify pompelmi
```

## Plugin Setup

```js
const fastify = require('fastify')();
const pompelmi = require('@pompelmi/fastify');

await fastify.register(pompelmi, {
  host: 'localhost',
  port: 3310,
  timeout: 5000,
});
```

### UNIX socket

```js
await fastify.register(pompelmi, {
  socket: '/run/clamav/clamd.sock',
});
```

## Decorated Instance

After registration, `fastify.pompelmi` is available everywhere:

```js
// Scan a file path
const result = await fastify.pompelmi.scan('/uploads/report.pdf');

// Scan an in-memory Buffer
const result = await fastify.pompelmi.scanBuffer(file.buffer);

// Scan a Readable stream
const result = await fastify.pompelmi.scanStream(readableStream);

// Compare against Verdict symbols
const { Verdict } = require('pompelmi');
if (result === Verdict.Malicious) { /* ... */ }
```

## preHandler Hook

Use the built-in `preHandler` helper to scan uploaded files before your route handler runs:

```js
const multipart = require('@fastify/multipart');
await fastify.register(multipart);

fastify.post('/upload', {
  preHandler: fastify.pompelmi.preHandler({ field: 'file' }),
}, async (request, reply) => {
  return { message: 'File is clean' };
});
```

When a malicious file is detected the preHandler automatically responds with HTTP 400:

```json
{ "error": "Malicious file detected" }
```

### Custom malicious handler

```js
fastify.post('/upload', {
  preHandler: fastify.pompelmi.preHandler({
    field: 'file',
    onMalicious: async (request, reply) => {
      request.log.warn({ ip: request.ip }, 'malicious upload blocked');
      reply.code(422).send({ error: 'File rejected by security scan' });
    },
  }),
}, handler);
```

## Configuration Reference

All options are forwarded to pompelmi's `ScanOptions`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `string` | — | clamd hostname (enables TCP mode) |
| `port` | `number` | `3310` | clamd port |
| `socket` | `string` | — | UNIX domain socket path |
| `timeout` | `number` | `15000` | Socket idle timeout in ms |
| `retries` | `number` | `0` | Number of retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries in ms |

## TypeScript

```ts
import fastify from 'fastify';
import pompelmi from '@pompelmi/fastify';
import { Verdict } from 'pompelmi';

const app = fastify();
await app.register(pompelmi, { host: 'localhost', port: 3310 });

const result = await app.pompelmi.scanBuffer(buffer);
if (result === Verdict.Malicious) throw new Error('Infected');
```

## License

ISC — see root [LICENSE](../../LICENSE).
