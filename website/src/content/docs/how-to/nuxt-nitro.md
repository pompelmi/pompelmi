---
title: Secure file uploads in Nuxt/Nitro
description: Secure Nuxt 3 and Nitro upload routes with readFormData(), scanBytes(), MIME checks, and inspect-first-store-later handling.
---

Nuxt/Nitro does not need a dedicated adapter to use Pompelmi. The simplest path is to read `FormData` in a Nitro handler, scan the bytes locally, and only persist files after a clean verdict.

If you want the broader Node.js reasoning behind this inspect-first-store-later pattern, start with [Secure file uploads in Node.js: Beyond Extension and MIME Checks](/pompelmi/blog/secure-file-uploads-nodejs/).

## Install

```bash
npm install pompelmi
```

## Nitro route

```ts
// server/api/upload.post.ts
import { readFormData, createError, defineEventHandler } from 'h3';
import { scanBytes, STRICT_PUBLIC_UPLOAD } from 'pompelmi';

const MAX_BYTES = 10 * 1024 * 1024;

export default defineEventHandler(async (event) => {
  const form = await readFormData(event);
  const file = form.get('file');

  if (!(file instanceof File)) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' });
  }

  if (file.size > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'File too large' });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const report = await scanBytes(bytes, {
    filename: file.name,
    mimeType: file.type,
    policy: STRICT_PUBLIC_UPLOAD,
    failClosed: true,
  });

  if (report.verdict !== 'clean') {
    throw createError({
      statusCode: 422,
      statusMessage: 'Upload blocked',
      data: {
        verdict: report.verdict,
        reasons: report.reasons,
      },
    });
  }

  return { ok: true, verdict: report.verdict, file: file.name };
});
```

## Why this path

- It keeps the scan inside the Nitro server process.
- It avoids a second service hop for the upload gate itself.
- It works well for smaller, synchronous upload routes where you want an immediate verdict.

## Nuxt-specific notes

- Use Node/Nitro routes, not edge runtimes, for file inspection.
- Treat SVG as a separate risk class from raster images.
- If you upload directly to object storage, use a quarantine bucket or staging area first.

## Continue

- [Secure file uploads in Nuxt/Nitro](/pompelmi/blog/nuxt-nitro-file-upload-security/)
- [Image upload security](../use-cases/image-upload-security/)
- [Scan files before S3 upload in Node.js](/pompelmi/blog/scan-files-before-s3-upload-nodejs/)
- [Secure S3 presigned uploads with malware scanning](../tutorials/secure-s3-presigned-uploads-with-malware-scanning/)
