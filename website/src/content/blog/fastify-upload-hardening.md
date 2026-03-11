---
title: "Fastify Upload Hardening: MIME Checks, Early Blocking, and In-Process Scanning"
description: "Add robust file upload security to Fastify v5 applications with Pompelmi's createUploadGuard preHandler — zero cloud calls, MIME sniffing, ZIP bomb protection included."
pubDate: 2024-06-15
author: "Pompelmi Team"
tags: ["fastify", "nodejs", "security", "middleware", "tutorial"]
---

# Fastify Upload Hardening: MIME Checks, Early Blocking, and In-Process Scanning

Fastify's hook system is purpose-built for layering in cross-cutting concerns. File upload security is a perfect fit: validate, inspect, and block — all before your handler touches the request data. With `@pompelmi/fastify-plugin`, you get a `preHandler` that runs every check in-process without a single cloud API call.

**TL;DR:** `createUploadGuard` from `@pompelmi/fastify-plugin` wires as a Fastify `preHandler`. It checks extension allowlists, MIME type allowlists, file size limits, and runs your pluggable scanner against the raw bytes — all before your route handler executes.

---

## The Fastify Upload Security Gap

Fastify's multipart handling (via `@fastify/multipart`) is efficient and well-designed. But it does not validate or inspect file content — that's explicitly out of scope for a parsing library. This leaves a gap:

- Files arrive and are buffered in memory.
- Your handler receives them without any security checks applied.
- A malicious actor can upload a ZIP bomb, an Office file with macros, or an executable disguised as an image.

Filling this gap early — in a `preHandler` — means your business logic never sees an attacker's payload.

---

## Setup

```bash
npm install @pompelmi/fastify-plugin @fastify/multipart
```

`@pompelmi/fastify-plugin` has `fastify` as a peer dependency and works with Fastify v4 and v5.

---

## Minimal Integration

```typescript
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { createUploadGuard } from '@pompelmi/fastify-plugin';

const app = Fastify({ logger: true });

// Register multipart parser — store files in memory
await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB parse limit
});

const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxFileSizeBytes: 10 * 1024 * 1024,
  stopOn: 'suspicious',
  failClosed: true,
});

app.post('/upload', { preHandler: guard }, async (req, reply) => {
  const { verdict, results } = (req as any).pompelmi;
  return { ok: true, verdict, scannedFiles: results.length };
});

await app.listen({ port: 3000 });
```

After the `preHandler` runs, `req.pompelmi` is available in your handler:

```typescript
interface PompelmiResult {
  files: FileMeta[];          // originalname, mimetype, size, fieldname
  results: ScanResult[];      // per-file: { severity, ruleId, reason, tags }
  verdict: 'clean' | 'suspicious' | 'malicious';
}
```

If any file violates a policy or triggers the scanner, the guard sets the response to `422` and calls `reply.send(errorBody)` — your handler never runs.

---

## Wiring the Heuristic Scanner

`@fastify/multipart` buffers files into memory. The guard receives these buffers and passes them to your `scanner`. Use `composeScanners` from the `pompelmi` core package to chain guards:

```typescript
import { createUploadGuard } from '@pompelmi/fastify-plugin';
import {
  CommonHeuristicsScanner,
  createZipBombGuard,
  composeScanners,
} from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 1000,
      maxTotalUncompressedBytes: 200 * 1024 * 1024,
      maxCompressionRatio: 100,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  {
    parallel: false,
    stopOn: 'malicious',
    timeoutMsPerScanner: 3000,
    tagSourceName: true,
  }
);

const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'png', 'zip', 'docx'],
  maxFileSizeBytes: 25 * 1024 * 1024,
  stopOn: 'suspicious',
  failClosed: true,
  scanner,
  onScanEvent: (ev) => {
    app.log.info({ pompelmi: ev }, 'scan_event');
  },
});
```

`composeScanners` in sequential mode (`parallel: false`) passes file bytes through each scanner in order. The `stopOn` option short-circuits the chain as soon as a match meets the threshold — avoiding unnecessary work on already-flagged files.

---

## Applying the Guard to Multiple Routes

You can share one `guard` instance across routes:

```typescript
// Declare the guard once
const imageGuard = createUploadGuard({
  includeExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeBytes: 5 * 1024 * 1024,
  stopOn: 'suspicious',
  scanner,
});

const docGuard = createUploadGuard({
  includeExtensions: ['pdf', 'docx', 'xlsx'],
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  maxFileSizeBytes: 20 * 1024 * 1024,
  stopOn: 'suspicious',
  scanner,
});

app.post('/avatars', { preHandler: imageGuard }, uploadAvatarHandler);
app.post('/documents', { preHandler: docGuard }, uploadDocHandler);
```

---

## Early Blocking Without a Scanner

Even without a custom `scanner`, the guard provides substantial protection:

```typescript
const guard = createUploadGuard({
  // Only allow specific extensions
  includeExtensions: ['pdf', 'jpg', 'png'],

  // Only allow specific MIME types (client-declared — pair with server-side sniffing when needed)
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],

  // Hard size limit
  maxFileSizeBytes: 5 * 1024 * 1024,

  // Block on first suspicious finding
  stopOn: 'suspicious',

  // On scanner errors, block rather than pass
  failClosed: true,
});
```

This alone stops:
- Executables (`.exe`, `.bat`, `.sh`) disguised as documents
- Oversized uploads (DoS via large buffer allocation)
- MIME type mismatches between `Content-Type` header and the allowlist

---

## Structured Error Responses

The guard returns consistent JSON error bodies. Add an error schema so Fastify generates accurate documentation:

```typescript
app.post('/upload', {
  preHandler: guard,
  schema: {
    response: {
      422: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          verdict: { type: 'string', enum: ['suspicious', 'malicious'] },
        },
      },
    },
  },
}, handler);
```

---

## Combining with Rate Limiting

File scanning is a CPU-bound operation. Pair the upload guard with `@fastify/rate-limit` to prevent scanner exhaustion:

```typescript
import rateLimit from '@fastify/rate-limit';

await app.register(rateLimit, {
  max: 20,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers['x-real-ip'] as string || req.ip,
});
```

Apply the rate limit globally or scope it specifically to upload routes.

---

## Logging Scan Events for Observability

Every scan event is surfaced through `onScanEvent`. Use this to emit structured logs:

```typescript
const guard = createUploadGuard({
  // ...options...
  onScanEvent: (ev: unknown) => {
    const event = ev as Record<string, unknown>;
    if (event.type === 'end') {
      app.log.info({
        event: 'file_scanned',
        filename: event.filename,
        verdict: event.verdict,
        matches: event.matches,
        durationMs: event.ms,
      });
    }
    if (event.type === 'blocked') {
      app.log.warn({
        event: 'upload_blocked',
        filename: event.filename,
        verdict: event.verdict,
      });
    }
  },
});
```

See the [Reason Codes and Observability post](/pompelmi/blog/reason-codes-security-observability/) for how to turn these events into metrics and dashboards.

---

## Performance Notes

- **In-process scanning** has ~0 ms network overhead compared to cloud scanning APIs.
- `CommonHeuristicsScanner` is synchronous and lightweight; it typically completes in under 1 ms for files under 1 MB.
- The ZIP bomb guard parses only the ZIP Central Directory — it reads a few kilobytes regardless of archive size — so it adds negligible overhead.
- Set a realistic `timeoutMsPerScanner` (e.g., 3000 ms) for YARA rules to protect against pathological inputs.

---

## Production Checklist

- [ ] `@fastify/multipart` `limits.fileSize` matches `maxFileSizeBytes` in the guard.
- [ ] `failClosed: true` so that scanner errors block uploads.
- [ ] `onScanEvent` is wired to your logging/APM system.
- [ ] Upload routes are covered by rate limiting.
- [ ] Test with EICAR test file (see [EICAR testing post](/pompelmi/blog/eicar-testing-upload-scanners/)).
- [ ] Review the `allowedMimeTypes` list with your product team quarterly.

---

## Summary

Fastify's `preHandler` is the right place for upload security: it runs before your handler, it can terminate the request early, and it's composable with Fastify's plugin system. `@pompelmi/fastify-plugin` wires directly into this model — one guard instance, clean option surface, and no external API calls required.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: Why extension checks are not enough](/pompelmi/blog/mime-sniffing-magic-bytes/)
- [Blog: ZIP bombs and archive security](/pompelmi/blog/preventing-zip-bombs/)
