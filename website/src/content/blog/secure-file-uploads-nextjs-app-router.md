---
title: "Secure File Uploads in Next.js App Router"
description: "Secure a Next.js App Router upload route with @pompelmi/next-upload, MIME enforcement, archive controls, and a scan-before-storage flow."
pubDate: 2026-03-31
updatedDate: 2026-03-31
author: "Pompelmi Team"
category: "Framework guide"
tags: ["nextjs", "app-router", "security", "nodejs", "uploads"]
---

# Secure File Uploads in Next.js App Router

If you are building secure file uploads in Next.js App Router, the route handler is where the trust decision belongs.

That is the point where your application still has the raw bytes, can validate what the upload claims to be, and can stop the file before it reaches storage. If you skip that boundary, you end up trusting client metadata, writing risky files to S3 too early, or pushing security decisions into asynchronous cleanup code.

## Put the upload gate in a Node runtime route handler

For App Router uploads, a good default is:

1. Use a route handler on the Node runtime.
2. Validate extension, MIME, and size.
3. Inspect the bytes before storage.
4. Return a structured verdict to the client.

That keeps the decision inside your own infrastructure and avoids the common mistake of treating direct object storage as a security boundary.

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
  allowArchives: true,
  archive: {
    maxEntries: 512,
    maxTotalUncompressedBytes: 100 * 1024 * 1024,
    maxDepth: 1,
  },
  failClosed: true,
});
```

This is a good App Router fit because `@pompelmi/next-upload` already understands Node route handlers, MIME detection, and archive limits.

## Why App Router still needs more than basic validation

A Next.js upload route can still be abused even when the parser succeeds:

- MIME spoofing can make a file look acceptable in client metadata.
- Extension mismatch can hide a file behind a safe-looking name.
- ZIP uploads can blow up downstream workers or storage budgets.
- Suspicious document structures can pass simple type checks and still deserve a block or review path.

That is why a secure App Router flow combines validation with deeper inspection and a storage decision.

## Keep storage after the verdict

The core rule is simple: do not write the file to durable storage until the route returns `clean`.

For smaller synchronous uploads, that means scan in the route handler and only then persist. For direct-to-S3 flows, the same idea becomes quarantine then promote:

1. upload to a quarantine bucket or prefix
2. scan in a worker you control
3. promote only after `clean`

If the browser writes straight into a live bucket, you did not build a scan-before-storage workflow. You built a cleanup workflow.

## Next.js-specific hardening notes

- Use the Node runtime for upload inspection.
- Keep file uploads out of Edge runtimes when you need byte-level inspection.
- Avoid mixing avatars, documents, and archives in one generic route.
- Return machine-readable JSON so the UI can distinguish reject vs review.

## Conclusion

Secure file uploads in Next.js App Router start with a route handler that makes the trust decision before storage. That keeps validation, inspection, and verdict handling close to the real upload boundary instead of spreading them across client code and background cleanup.

The fastest production path is the canonical [Next.js guide](/how-to/nextjs/), then a storage workflow that only promotes files after the route or worker returns `clean`.

## Related reading

- [Secure file uploads in Node.js: Beyond extension and MIME checks](/blog/secure-file-uploads-nodejs/)
- [Secure file uploads in Next.js](/how-to/nextjs/)
- [Secure S3 presigned uploads with malware scanning](/tutorials/secure-s3-presigned-uploads-with-malware-scanning/)
- [Pompelmi vs cloud malware scanning APIs](/comparisons/pompelmi-vs-cloud-malware-scanning-apis/)
- [Next.js examples on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples/next-app-router)
