---
title: How to scan file uploads in Multer
description: "A practical Multer virus-scan pattern for Node.js: buffer in memory, run Pompelmi before storage, and return a clear upload verdict."
---

If you are already using Multer, the safest default is simple: keep the file in memory, scan it, and only then decide whether it belongs in durable storage.

## Install

```bash
npm install pompelmi @pompelmi/express-middleware express multer
```

## Minimal Multer pattern

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
      return res.status(422).json({ ok: false, verdict: scan?.verdict });
    }

    res.json({ ok: true, verdict: 'clean' });
  }
);
```

## Why this works

- `memoryStorage()` prevents the file from landing on disk before inspection.
- Multer still gives you parser limits and familiar route ergonomics.
- The upload guard adds actual content inspection instead of trusting only `req.file.mimetype`.

## Common mistakes

- Using disk storage before you have a verdict.
- Letting the client decide the MIME type you trust.
- Treating ZIP uploads like any other file type.
- Returning `200 OK` for `suspicious` uploads with no quarantine plan.

## Continue

- [How to scan file uploads in Express before storage](/blog/scan-file-uploads-express-before-storage/)
- [Secure file uploads in Express](../how-to/express/)
- [Node.js file upload validation best practices](./nodejs-file-upload-validation-best-practices/)
- [Archive / ZIP upload security](../use-cases/archive-zip-upload-security/)
