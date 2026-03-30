---
title: "Koa Upload Security with @koa/multer and In-Process Scanning"
description: "Add an upload-security boundary to Koa with @koa/multer, @pompelmi/koa-middleware, and route-specific content inspection before storage."
pubDate: 2024-06-01
updatedDate: 2026-03-30
author: "Pompelmi Team"
category: "Framework guide"
tags: ["koa", "multer", "security", "nodejs", "tutorial"]
---

# Koa Upload Security with @koa/multer and In-Process Scanning

Koa does not try to hide the request pipeline from you. That is useful for upload security because the route policy can stay explicit.

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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);

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
```

## Why this pattern is a good Koa fit

- The middleware stack stays readable.
- You can keep separate policies for separate routes.
- `ctx.state.pompelmi` is a natural place to pass verdicts into logging or storage code.

## Where to go next

Start with the canonical [Koa guide](/pompelmi/how-to/koa/). For broader validation strategy, continue to [Node.js file upload validation best practices](/pompelmi/tutorials/nodejs-file-upload-validation-best-practices/). Examples and package code live in the [repository](https://github.com/pompelmi/pompelmi).
