---
title: Secure file uploads in Next.js
description: Secure a Next.js App Router upload route with @pompelmi/next-upload, MIME enforcement, archive limits, and in-process scanning.
---

Use this guide when your Next.js application accepts uploads through an App Router route handler and you want the upload decision to stay inside your own infrastructure.

## Install

```bash
npm install pompelmi @pompelmi/next-upload
```

## App Router route handler

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
  allowArchives: true,
  archive: {
    maxEntries: 512,
    maxTotalUncompressedBytes: 100 * 1024 * 1024,
    maxDepth: 1,
  },
});
```

## Why this path

- It keeps scanning inside the Node runtime instead of a cloud API or sidecar service.
- It fits naturally into App Router route handlers.
- It returns structured JSON that can drive UI feedback or object-storage promotion logic.

## Next.js-specific notes

- Use the Node runtime for multipart routes.
- Keep uploads out of Server Actions when you need byte-level inspection, archive controls, or predictable route-level error handling.
- Treat the route as the gate; store to S3 or another object store only after the response is `clean`.

## Continue

- [Next.js file upload security patterns](/pompelmi/blog/nextjs-file-upload-security/)
- [Secure S3 presigned uploads with malware scanning](../tutorials/secure-s3-presigned-uploads-with-malware-scanning/)
- [Pompelmi vs cloud malware scanning APIs](../comparisons/pompelmi-vs-cloud-malware-scanning-apis/)
- [Next.js examples on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples)
