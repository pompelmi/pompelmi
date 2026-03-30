---
title: Secure file uploads in Koa
description: Protect a Koa upload route with @koa/multer, @pompelmi/koa-middleware, archive guards, and in-process scanning.
---

Koa leaves upload policy to your middleware stack. Pompelmi fits that model well: parse the file into memory, run the upload guard, and store only after the verdict is acceptable.

## Install

```bash
npm install pompelmi @pompelmi/koa-middleware koa @koa/router @koa/multer
```

## Minimal route

```ts
import Koa from 'koa';
import Router from '@koa/router';
import multer from '@koa/multer';
import { createUploadGuard } from '@pompelmi/koa-middleware';
import {
  CommonHeuristicsScanner,
  composeScanners,
  createZipBombGuard,
} from 'pompelmi';

const app = new Koa();
const router = new Router();

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  '/upload',
  upload.single('file'),
  createUploadGuard({
    scanner,
    includeExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'zip'],
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/zip',
    ],
    maxFileSizeBytes: 10 * 1024 * 1024,
    failClosed: true,
  }),
  (ctx) => {
    ctx.body = { ok: true, scan: (ctx.state as any).pompelmi };
  }
);

app.use(router.routes()).use(router.allowedMethods());
```

## Why this path

- It keeps Koa minimal while still giving you a real upload-security boundary.
- It attaches the verdict to `ctx.state.pompelmi`, which is easy to pass into audit, quarantine, or storage code.
- It works well when you want route-specific policies instead of a larger framework abstraction.

## Continue

- [Koa upload middleware patterns](/pompelmi/blog/koa-file-upload-security/)
- [Defense in depth for file uploads](../use-cases/defense-in-depth-for-file-uploads/)
- [Node.js file upload validation best practices](../tutorials/nodejs-file-upload-validation-best-practices/)
