---
title: "Secure File Uploads in Nuxt/Nitro Server Routes"
description: "Use Nitro server routes and Pompelmi's core scanner to inspect files in-process before storage, with a clear path for quarantine-first object storage flows."
pubDate: 2024-07-15
updatedDate: 2026-03-30
author: "Pompelmi Team"
category: "Framework guide"
tags: ["nuxt", "nitro", "security", "nodejs", "tutorial"]
---

# Secure File Uploads in Nuxt/Nitro Server Routes

Nuxt/Nitro does not need a dedicated upload-security abstraction. The simplest path is to read `FormData` in a Nitro handler, inspect the bytes locally, and only then decide whether the file deserves storage.

## Minimal Nitro route

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
    throw createError({ statusCode: 422, statusMessage: 'Upload blocked', data: report });
  }

  return { ok: true, verdict: report.verdict };
});
```

## Why this works

- Nitro routes already run on the Node side where the bytes are available.
- You keep the upload-security decision inside your own infrastructure.
- The same core scanner can be reused later in a background worker for presigned uploads.

## Where to go next

Use the canonical [Nuxt/Nitro guide](/pompelmi/how-to/nuxt-nitro/) for the shortest setup. If you plan to upload directly to object storage, continue to [secure S3 presigned uploads with malware scanning](/pompelmi/tutorials/secure-s3-presigned-uploads-with-malware-scanning/). The repo is the best place to follow current examples and package changes: [pompelmi/pompelmi](https://github.com/pompelmi/pompelmi).
