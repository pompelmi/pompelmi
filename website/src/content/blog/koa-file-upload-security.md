---
title: "Koa File Upload Security: Practical Middleware Patterns with Pompelmi"
description: "Learn how to add robust file upload security to your Koa.js application using Pompelmi's createUploadGuard middleware — with MIME validation, size limits, and heuristic scanning."
pubDate: 2024-06-01
author: "Pompelmi Team"
tags: ["koa", "nodejs", "security", "middleware", "tutorial"]
---

# Koa File Upload Security: Practical Middleware Patterns with Pompelmi

Koa's minimal, middleware-first design makes it excellent for building lean APIs. But that minimalism cuts both ways — there's no built-in protection against malicious file uploads. Left unguarded, a simple `multipart/form-data` endpoint becomes a ZIP bomb waiting to happen, or an entry point for polyglot payloads.

**TL;DR:** Install `@pompelmi/koa-middleware`, wire `createUploadGuard` after your multipart parser, and you get extension filtering, MIME validation, size limits, and pluggable heuristic scanning in one pass — all in-process, zero cloud calls.

---

## Why File Uploads Are a Security Problem in Koa

Koa ships with nothing more than a context object and a `next()` chain. Multipart parsing usually means reaching for `@koa/multer` or `busboy`. Both are great libraries, but they focus on parsing, not security inspection.

Common threats Koa apps face without dedicated upload hardening:

- **ZIP bombs**: A 42 KB archive that expands to petabytes, exhausting memory or CPU.
- **Polyglot files**: A file that is simultaneously valid in two formats (e.g., both a JPEG and a valid ZIP), bypassing simple type checks.
- **Extension spoofing**: Renaming `malware.exe` to `report.pdf` tricks extension-only blocklists.
- **Oversized uploads**: No server-side limit means a slow `curl --data-binary @/dev/zero` can hold a worker indefinitely.

---

## Setup

```bash
npm install @pompelmi/koa-middleware @koa/multer multer
```

`@pompelmi/koa-middleware` has a peer dependency on the Koa types but no runtime dependency on Koa itself — it works with any context-and-next style Koa middleware stack.

---

## Basic Integration

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import multer from '@koa/multer';
import { createUploadGuard } from '@pompelmi/koa-middleware';

const app = new Koa();
const router = new Router();

// 1. Parse multipart into memory (req.files / ctx.files)
const upload = multer({ storage: multer.memoryStorage() });

// 2. Build the upload guard
const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'],
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  stopOn: 'suspicious',
  failClosed: true,
});

// 3. Route — multer first, then the guard, then your handler
router.post('/upload',
  upload.single('file'),
  guard,
  (ctx) => {
    const { verdict, results } = (ctx.state as any).pompelmi;
    ctx.body = { ok: true, verdict, results };
  }
);

app.use(router.routes());
app.listen(3000, () => console.log('Listening on :3000'));
```

After a successful scan, `ctx.state.pompelmi` contains:

| Field | Type | Description |
|---|---|---|
| `files` | `FileMeta[]` | Parsed file metadata |
| `results` | `ScanResult[]` | Per-file scan results |
| `verdict` | `'clean' \| 'suspicious' \| 'malicious'` | Worst-case verdict across all files |

---

## Adding a Heuristic Scanner

The guard accepts any scanner that matches the `ScannerFn` interface — a function or an object with a `scan` method. The `pompelmi` core package ships `CommonHeuristicsScanner` which detects Office macros, risky PDF actions, PE executables, and SVG payloads without any native dependencies.

```typescript
import { createUploadGuard } from '@pompelmi/koa-middleware';
import { CommonHeuristicsScanner, createZipBombGuard, composeScanners } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 1000,
      maxTotalUncompressedBytes: 200 * 1024 * 1024,
      maxCompressionRatio: 100,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', timeoutMsPerScanner: 3000, tagSourceName: true }
);

const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'png', 'zip', 'docx'],
  maxFileSizeBytes: 25 * 1024 * 1024,
  stopOn: 'suspicious',
  scanner,
  onScanEvent: (ev) => {
    // Emit to your metrics/APM system
    console.log('[pompelmi]', JSON.stringify(ev));
  },
});
```

`composeScanners` runs `zipGuard` first, then only proceeds to `heuristics` if the verdict so far is below `stopOn`. The `tagSourceName` flag adds `meta._sourceName` to each match so you can identify which scanner produced each finding.

---

## Handling Multiple File Uploads

Koa + multer supports both `upload.single(field)` and `upload.fields([...])`. The guard handles both transparently — it collects files from `ctx.file`, `ctx.files`, `ctx.request.file`, and `ctx.request.files`.

```typescript
// Multiple fields, different types
const upload = multer({ storage: multer.memoryStorage() });

router.post('/docs',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'attachments', maxCount: 5 },
  ]),
  createUploadGuard({
    includeExtensions: ['jpg', 'png', 'pdf'],
    maxFileSizeBytes: 5 * 1024 * 1024,
    stopOn: 'suspicious',
  }),
  (ctx) => {
    const { verdict } = (ctx.state as any).pompelmi;
    if (verdict !== 'clean') {
      ctx.status = 422;
      ctx.body = { error: 'upload_blocked', verdict };
      return;
    }
    ctx.body = { ok: true };
  }
);
```

---

## Reporting vs. Blocking

During a gradual rollout you may want to audit without blocking live traffic. Set `stopOn` to `'malicious'` (only block confirmed threats) and log everything else:

```typescript
const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'png'],
  maxFileSizeBytes: 10 * 1024 * 1024,
  stopOn: 'malicious', // only hard-block truly malicious files
  failClosed: false,   // scanner errors → warn, don't block
  scanner,
  onScanEvent: (ev) => {
    if (ev.type === 'end' && ev.verdict !== 'clean') {
      myApmClient.issue('upload_suspicious', { filename: ev.filename, verdict: ev.verdict });
    }
  },
});
```

---

## Returning Structured Errors

A blocked upload should return a consistent JSON error body rather than a cryptic 422 with no context. Use Koa's error event:

```typescript
// Global error handler — add before routes
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    ctx.status = err.status || 500;
    ctx.body = {
      ok: false,
      code: err.code || 'server_error',
      message: err.message,
    };
  }
});
```

The guard sets `ctx.status = 422` and `ctx.body` for policy violations, so this handler only fires for unexpected errors.

---

## Production Checklist

Before deploying to production, verify:

- [ ] `memoryStorage()` is used for multer — disk storage means the file hits disk before scanning.
- [ ] `maxFileSizeBytes` is also enforced in multer's `limits.fileSize` to prevent parsing huge streams before the guard runs.
- [ ] `failClosed: true` so scanner errors block rather than silently pass.
- [ ] `allowedMimeTypes` restricts to only types your application actually needs.
- [ ] `onScanEvent` is wired to your observability pipeline (see the [Reason Codes post](/pompelmi/blog/reason-codes-security-observability/)).
- [ ] Rate limiting is applied upstream of the upload endpoint.

```typescript
// Combine multer size limit + guard size limit for defense in depth
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // fail fast at parse time
});

const guard = createUploadGuard({
  maxFileSizeBytes: 10 * 1024 * 1024, // enforce at scan time
  // ...
});
```

---

## Summary

Koa's composable middleware model makes adding Pompelmi straightforward: one import, one guard, wired after your multipart parser. The result is a security layer that checks extensions, MIME types, size, and file content — all in-process, with no external API calls and no file touching disk between upload and verdict.

**Next steps:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: ZIP bombs and archive security](/pompelmi/blog/preventing-zip-bombs/)
- [Blog: Reason codes and observability](/pompelmi/blog/reason-codes-security-observability/)
