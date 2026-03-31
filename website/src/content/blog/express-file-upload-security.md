---
title: "How to Scan File Uploads in Multer for Node.js"
description: "A practical Multer virus-scan pattern for Node.js using Express, memoryStorage, @pompelmi/express-middleware, and inspect-before-storage handling."
pubDate: 2024-03-01
updatedDate: 2026-03-30
author: "Pompelmi Team"
category: "Framework guide"
tags: ["express", "multer", "security", "nodejs", "tutorial"]
---

# How to Scan File Uploads in Multer for Node.js

Multer solves multipart parsing. It does not solve whether the file should be trusted.

That distinction matters because most upload bugs are not parser bugs. They are trust bugs: a renamed executable, a risky PDF, a ZIP that expands far beyond what the route expected, or a file that technically uploads fine but should never reach storage.

## The right Multer pattern

For untrusted uploads, the safest default is:

1. Buffer the file in memory.
2. Inspect it before storage.
3. Return a clear verdict.
4. Persist only if the route is ready to trust the file.

## Express + Multer + Pompelmi

```ts
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import {
  CommonHeuristicsScanner,
  composeScanners,
  createZipBombGuard,
} from 'pompelmi';

const app = express();
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

app.post(
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
  (req, res) => {
    const scan = (req as any).pompelmi;

    if (scan?.verdict !== 'clean') {
      return res.status(422).json({ ok: false, verdict: scan?.verdict, results: scan?.results });
    }

    res.json({ ok: true, verdict: 'clean' });
  }
);
```

## Why `memoryStorage()` matters

`memoryStorage()` is not only convenient. It keeps the route from writing untrusted bytes to disk before your app has a verdict.

If your product needs direct-to-object-storage uploads or very large files, the same idea still applies. You just move from memory buffering to a quarantine-first storage flow instead of writing directly to the live bucket.

## What Multer still does for you

Multer remains useful for:

- Request parsing.
- Size and field limits.
- Route-level ergonomics.

Pompelmi adds the upload gate after parsing and before trust.

## Common mistakes

- Using disk storage as the default upload backend.
- Treating `req.file.mimetype` as authoritative.
- Allowing ZIP, PDF, SVG, and raster images through the same generic policy.
- Returning success for `suspicious` uploads with no quarantine path.

## Where to go next

Start with the canonical [Express guide](/pompelmi/how-to/express/) if you want the shortest production-ready route. For a fuller explanation of why the upload boundary belongs before storage, read [How to Scan File Uploads in Express Before Storage](/pompelmi/blog/scan-file-uploads-express-before-storage/). If your route eventually promotes files into object storage, continue to [Scan Files Before S3 Upload in Node.js](/pompelmi/blog/scan-files-before-s3-upload-nodejs/). For runnable code, see the [Express examples](https://github.com/pompelmi/pompelmi/tree/main/examples). If the repo is useful, [star it on GitHub](https://github.com/pompelmi/pompelmi).
