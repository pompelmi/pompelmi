---
title: "Fastify Upload Security: Scan Files Before They Reach Storage"
description: "Use @fastify/multipart and @pompelmi/fastify-plugin to block risky uploads in Fastify before your handler writes to disk or object storage."
pubDate: 2026-03-31
updatedDate: 2026-03-31
author: "Pompelmi Team"
category: "Framework guide"
tags: ["fastify", "multipart", "security", "nodejs", "uploads"]
---

# Fastify Upload Security: Scan Files Before They Reach Storage

Fastify gives you a clean place to secure uploads: the request lifecycle before your handler touches storage.

That matters because the real risk in file uploads is usually not multipart parsing. It is what happens after parsing, when the route trusts a file too early and writes it somewhere durable.

## Use `preHandler` as the upload gate

For Fastify, the practical default is:

1. parse multipart with `@fastify/multipart`
2. scan the file before your main handler runs
3. stop the request early on risky uploads
4. only store files after a clean verdict

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
    [
      'zipGuard',
      createZipBombGuard({
        maxEntries: 512,
        maxTotalUncompressedBytes: 100 * 1024 * 1024,
        maxCompressionRatio: 12,
      }),
    ],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious', tagSourceName: true }
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
    }),
  },
  async (request) => {
    return { ok: true, verdict: (request as any).pompelmi?.verdict ?? 'clean' };
  }
);
```

This is where `@pompelmi/fastify-plugin` fits well: it plugs into Fastify's lifecycle and prevents the route from reaching business logic when the upload should never be trusted.

## What to harden besides the scanner

Fastify upload security is not only one library call. A strong route usually combines:

- multipart size limits
- a route-specific extension allowlist
- MIME allowlists for obvious mismatches
- content inspection for disguised or risky files
- archive controls for ZIP-heavy routes

That is especially important when a single product accepts images, PDFs, CSV exports, and archives. Those should not all share one generic upload policy.

## Why early blocking matters

Early blocking reduces the blast radius:

- no write to disk before the verdict
- no live object in S3 before review
- no downstream image, PDF, or indexing jobs on risky input

It also keeps security behavior easier to reason about. The upload either reaches the handler because it passed policy, or it does not.

## Common Fastify mistakes

- Reading multipart and storing immediately, then scanning later
- Letting archives through with only a `.zip` allowlist
- Treating request MIME as authoritative
- Using one upload route for every file type in the product
- Logging parser failures but not blocked security verdicts

## Conclusion

Fastify upload security is strongest when the trust decision happens in `preHandler`, before your main route writes anything durable. That gives you a small, explicit upload boundary instead of a best-effort cleanup job after storage.

The fastest way to implement that pattern is the canonical [Fastify guide](/how-to/fastify/) with route-specific policies for the file types your application actually accepts.

## Related reading

- [Secure file uploads in Node.js: Beyond extension and MIME checks](/blog/secure-file-uploads-nodejs/)
- [Secure file uploads in Fastify](/how-to/fastify/)
- [Archive / ZIP upload security](/use-cases/archive-zip-upload-security/)
- [Extension checks vs MIME sniffing vs content inspection](/comparisons/extension-checks-vs-mime-sniffing-vs-content-inspection/)
- [Fastify package source on GitHub](https://github.com/pompelmi/pompelmi/tree/main/packages/fastify-plugin)
