# Fastify Integration

Complete guide to integrating pompelmi into a Fastify application. Covers disk-based scanning, stream-based scanning with `scanStream()`, and error handling.

---

## Setup

```bash
npm install pompelmi fastify @fastify/multipart
```

---

## Disk-based scanning (save to disk first, then scan)

This pattern saves the uploaded file to disk via `pipeline`, then scans it by path. Most straightforward for large files.

```js
const Fastify   = require('fastify');
const { pipeline } = require('stream/promises');
const fs        = require('fs');
const path      = require('path');
const { scan, Verdict } = require('pompelmi');

const app = Fastify({ logger: true });
app.register(require('@fastify/multipart'));

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: Number(process.env.CLAMAV_PORT) || 3310,
  timeout: 30_000,
};

app.post('/upload', async (req, reply) => {
  const data     = await req.file();
  const filePath = path.join('./uploads', `${Date.now()}-${data.filename}`);

  // Write to disk
  await pipeline(data.file, fs.createWriteStream(filePath));

  let result;
  try {
    result = await scan(filePath, SCAN_OPTS);
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    return reply.code(500).send({ error: `Scan failed: ${err.message}` });
  }

  if (result !== Verdict.Clean) {
    try { fs.unlinkSync(filePath); } catch {}
    return reply.code(422).send({ error: `Upload rejected: ${result.description}` });
  }

  return reply.send({ ok: true, filename: path.basename(filePath) });
});

app.listen({ port: 3000 });
```

---

## Stream-based scanning (no disk I/O in TCP mode)

When using TCP mode (clamd sidecar), pass the upload stream directly to `scanStream()`. The file never touches the application host's disk.

```js
const Fastify = require('fastify');
const { scanStream, Verdict } = require('pompelmi');

const app = Fastify({ logger: true });
app.register(require('@fastify/multipart'));

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST || 'clamav',
  port: 3310,
  timeout: 30_000,
};

app.post('/upload', async (req, reply) => {
  const data = await req.file();

  let result;
  try {
    result = await scanStream(data.file, SCAN_OPTS);
  } catch (err) {
    return reply.code(500).send({ error: `Scan failed: ${err.message}` });
  }

  if (result === Verdict.Malicious) {
    return reply.code(422).send({ error: 'Malicious file rejected.' });
  }

  if (result === Verdict.ScanError) {
    return reply.code(422).send({ error: 'Scan incomplete — file rejected.' });
  }

  // Stream is consumed — if you need to store the file you must re-read it.
  // With stream scanning, save to storage (S3, disk) in a separate step
  // using the original source, not data.file (already consumed).
  return reply.send({ ok: true, filename: data.filename });
});

app.listen({ port: 3000 });
```

> **Note on stream consumption:** Once `scanStream()` consumes `data.file`, the stream is exhausted. If you need to store the file after scanning, either save it to disk first (disk-based pattern) or scan and upload to S3 in parallel using a passthrough stream.

---

## Scanning multiple files

```js
app.post('/upload-many', async (req, reply) => {
  const parts   = req.files();
  const results = [];

  for await (const part of parts) {
    const filePath = path.join('./uploads', `${Date.now()}-${part.filename}`);
    await pipeline(part.file, fs.createWriteStream(filePath));

    const verdict = await scan(filePath, SCAN_OPTS).catch(err => {
      try { fs.unlinkSync(filePath); } catch {}
      return null;
    });

    if (!verdict || verdict !== Verdict.Clean) {
      try { fs.unlinkSync(filePath); } catch {}
      results.push({ filename: part.filename, accepted: false, reason: verdict?.description ?? 'scan_error' });
    } else {
      results.push({ filename: part.filename, accepted: true });
    }
  }

  const anyRejected = results.some(r => !r.accepted);
  return reply.code(anyRejected ? 422 : 200).send({ results });
});
```

---

## Error handling with `setErrorHandler`

Register a global error handler for unexpected failures:

```js
app.setErrorHandler((err, req, reply) => {
  req.log.error(err);
  reply.code(500).send({ error: 'Internal server error.' });
});
```

For multer-equivalent size limits with `@fastify/multipart`:

```js
app.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

app.setErrorHandler((err, req, reply) => {
  if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
    return reply.code(413).send({ error: 'File too large.' });
  }
  reply.code(500).send({ error: err.message });
});
```

---

## HTTP status codes

| Situation | Status |
|-----------|--------|
| No file part in request | `400 Bad Request` |
| `Verdict.Malicious` | `422 Unprocessable Entity` |
| `Verdict.ScanError` | `422 Unprocessable Entity` |
| `scan()` / `scanStream()` throws | `500 Internal Server Error` |
| File too large | `413 Content Too Large` |
| `Verdict.Clean` | `200 OK` |

---

## TypeScript

```ts
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { scanStream, Verdict } from 'pompelmi';

const app = Fastify();
app.register(multipart);

app.post('/upload', async (req, reply) => {
  const data = await req.file();
  if (!data) return reply.code(400).send({ error: 'No file.' });

  const result = await scanStream(data.file, { host: 'clamav', port: 3310 });

  if (result !== Verdict.Clean) {
    return reply.code(422).send({ error: result.description });
  }

  return reply.send({ ok: true });
});
```
