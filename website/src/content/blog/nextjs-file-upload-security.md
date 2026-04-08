---
title: "Next.js File Upload Security for App Router"
description: "Secure a Next.js App Router upload route with @pompelmi/next-upload, Node runtime route handlers, and inspect-before-storage handling."
pubDate: 2024-03-15
updatedDate: 2026-03-30
author: "Pompelmi Team"
category: "Framework guide"
tags: ["nextjs", "app-router", "security", "nodejs", "tutorial"]
---

# Next.js File Upload Security for App Router

Next.js makes it easy to accept files through App Router route handlers. That does not mean the route is safe by default.

The question is still the same: should this file reach storage or any downstream processor?

## Route handlers are the right boundary

For App Router, the upload-security boundary belongs in a route handler running on the Node runtime:

- It has direct access to the multipart body.
- It can inspect bytes before writing to storage.
- It can return a structured verdict to the client.

## Minimal App Router pattern

```ts
// app/api/upload/route.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';
import {
  CommonHeuristicsScanner,
  composeScanners,
  createZipBombGuard,
} from 'pompelmi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);

export const POST = createNextUploadHandler({
  scanner,
  includeExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'zip'],
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/zip',
  ],
  maxFileSizeBytes: 10 * 1024 * 1024,
  detectMime: true,
  enforceMime: true,
  failClosed: true,
});
```

## What to avoid

- Edge runtimes for upload inspection.
- Treating a presigned S3 upload as "already validated".
- Mixing avatars, PDFs, archives, and SVG into one route and one policy.

## Presigned uploads still need a decision point

If your product uses presigned uploads, move the security decision to the storage workflow:

1. Upload into a quarantine bucket or prefix.
2. Scan asynchronously in your own infrastructure.
3. Promote only after the verdict is `clean`.

That preserves the performance benefits of direct uploads without trusting the object immediately.

## Where to go next

Use the canonical [Next.js guide](/how-to/nextjs/) for the shortest integration path. If you want the broader Node.js model behind the route-level pattern, read [Secure file uploads in Node.js: Beyond Extension and MIME Checks](/blog/secure-file-uploads-nodejs/). If you need object-storage patterns, go straight to [Scan Files Before S3 Upload in Node.js](/blog/scan-files-before-s3-upload-nodejs/) or the companion tutorial on [secure S3 presigned uploads with malware scanning](/tutorials/secure-s3-presigned-uploads-with-malware-scanning/). For examples and package sources, start at the [GitHub repo](https://github.com/pompelmi/pompelmi).
