---
title: Secure file uploads in Fastify
description: Add an early upload gate to Fastify with @fastify/multipart, @pompelmi/fastify-plugin, MIME checks, and in-process scanners.
---

Fastify is a good fit for upload security because you can make the decision in a `preHandler` before the main route runs.

## Install

```bash
npm install pompelmi @pompelmi/fastify-plugin fastify @fastify/multipart
```

## Minimal Fastify route

```ts
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { createUploadGuard } from '@pompelmi/fastify-plugin';
import {
  CommonHeuristicsScanner,
  composeScanners,
  createZipBombGuard,
} from 'pompelmi';

const app = Fastify({ logger: true });
await app.register(multipart);

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);

app.post(
  '/upload',
  {
    preHandler: createUploadGuard({
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
      stopOn: 'suspicious',
    }),
  },
  async (request) => {
    return { ok: true, scan: (request as any).pompelmi };
  }
);
```

## Why use the Fastify plugin

- It rejects blocked uploads before the route body runs.
- It fits the Fastify lifecycle cleanly.
- It lets you reuse the same scanner composition you use in Express or Next.js.

## Production notes

- Keep multipart limits aligned with the guard limits.
- Use route-specific allowlists instead of one global list.
- Log blocked verdicts and scanner errors as security-relevant events.

## Continue

- [Fastify upload hardening](/pompelmi/blog/fastify-upload-hardening/)
- [Archive / ZIP upload security](../use-cases/archive-zip-upload-security/)
- [Extension checks vs MIME sniffing vs content inspection](../comparisons/extension-checks-vs-mime-sniffing-vs-content-inspection/)
