---
title: Secure file uploads in Express
description: Add an in-process upload gate to an Express route with Multer, @pompelmi/express-middleware, archive guards, and local-first scanning.
---

This is the canonical Express integration path for Pompelmi.

Use it when you already accept files through Multer and want a clear allow, quarantine, or reject decision before writing anything to disk or object storage.

For the longer reasoning behind this route shape, see [How to Scan File Uploads in Express Before Storage](/pompelmi/blog/scan-file-uploads-express-before-storage/).

## Install

```bash
npm install pompelmi @pompelmi/express-middleware express multer
```

## Minimal route

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

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (scan?.verdict !== 'clean') {
      return res.status(422).json({
        ok: false,
        verdict: scan?.verdict,
        results: scan?.results ?? [],
      });
    }

    res.json({ ok: true, verdict: 'clean', file: req.file.originalname });
  }
);
```

## Why this pattern

- `multer.memoryStorage()` keeps bytes in memory until the route has a verdict.
- `createUploadGuard()` gives Express a real upload gate instead of ad hoc checks inside the handler.
- `createZipBombGuard()` covers archive-specific abuse that a MIME allowlist cannot see.
- `CommonHeuristicsScanner` adds structural checks for PDFs, SVGs, Office files, executables, and EICAR-like test content.

## Production notes

- Keep parser limits and `maxFileSizeBytes` aligned.
- Treat `suspicious` as quarantine or manual review for document-heavy workflows.
- Store files only after the route returns `clean`.
- Add auth, rate limits, and non-executable storage outside the scanner itself.

## Continue

- [How to scan file uploads in Express before storage](/pompelmi/blog/scan-file-uploads-express-before-storage/)
- [How to scan file uploads in Multer](../tutorials/how-to-scan-file-uploads-in-multer/)
- [Document upload security](../use-cases/document-upload-security/)
- [Secure S3 presigned uploads with malware scanning](../tutorials/secure-s3-presigned-uploads-with-malware-scanning/)
- [Express examples on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples)
