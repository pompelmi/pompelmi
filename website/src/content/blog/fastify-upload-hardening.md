---
title: "Fastify Upload Hardening with @fastify/multipart and Early Blocking"
description: "Use @pompelmi/fastify-plugin as a Fastify preHandler to inspect uploads early, enforce route-specific policies, and keep risky files out of storage."
pubDate: 2024-06-15
updatedDate: 2026-03-30
author: "Pompelmi Team"
category: "Framework guide"
tags: ["fastify", "multipart", "security", "nodejs", "tutorial"]
---

# Fastify Upload Hardening with @fastify/multipart and Early Blocking

Fastify gives you a strong place to make the upload decision: the `preHandler`.

That matters because you want the route blocked before business logic, storage code, or downstream processing gets involved.

## Minimal pattern

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

app.post('/upload', {
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
  }),
}, async (request) => {
  return { ok: true, scan: (request as any).pompelmi };
});
```

## Why Fastify works well here

- The route never reaches the main handler on blocked uploads.
- The guard composes cleanly with route-specific schemas and logging.
- You can reuse the same scanner composition across frameworks.

## Where to go next

The canonical integration page is [secure file uploads in Fastify](/how-to/fastify/). For archive-heavy routes, continue to [archive / ZIP upload security](/use-cases/archive-zip-upload-security/). For runnable code and package sources, use the [GitHub repo](https://github.com/pompelmi/pompelmi).
