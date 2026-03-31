---
title: "How to Scan File Uploads in Express Before Storage"
description: "Use Multer, memory-backed uploads, and @pompelmi/express-middleware to inspect untrusted files in Express before disk or object storage."
pubDate: 2026-03-31
updatedDate: 2026-03-31
author: "Pompelmi Team"
category: "Framework guide"
tags: ["express", "multer", "security", "nodejs", "uploads"]
---

# How to Scan File Uploads in Express Before Storage

If you need to scan file uploads in Express, the important decision is not where to parse multipart. It is where to trust the file.

That trust boundary should sit before disk storage, before S3, and before any downstream thumbnailing, PDF processing, or document indexing. Multer helps parse the request. It does not tell you whether the uploaded bytes are safe to keep.

## Why extension and MIME checks are not enough

An Express route usually sees three easy signals first:

- the filename extension
- `req.file.mimetype`
- the fact that Multer accepted the multipart body

Those are useful filters, but they are not a verdict.

A renamed executable can still look like a document. A client-declared MIME type can be wrong. A ZIP can be small on the wire and still expand into an abusive archive. A PDF can match the expected type and still contain risky structure that deserves a block or review path.

That is why the safest Express pattern is scan before storage, not validate after storage.

## The Express upload boundary that works

For synchronous uploads, the cleanest boundary is:

1. Parse multipart with Multer.
2. Keep the file in memory.
3. Scan the bytes.
4. Return a route-level verdict.
5. Persist only after `clean`.

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
  { stopOn: 'malicious', tagSourceName: true }
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
    stopOn: 'malicious',
    failClosed: true,
  }),
  async (req, res) => {
    const scan = (req as any).pompelmi;

    if (scan?.verdict === 'suspicious') {
      return res.status(202).json({
        ok: false,
        action: 'quarantine',
        results: scan.results,
      });
    }

    if (scan?.verdict === 'malicious') {
      return res.status(422).json({
        ok: false,
        verdict: 'malicious',
        results: scan.results,
      });
    }

    // Only store the file after a clean verdict.
    return res.json({ ok: true, verdict: 'clean' });
  }
);
```

`multer.memoryStorage()` matters here. It keeps untrusted bytes out of durable storage until the route has a decision.

## What Pompelmi adds to the Express flow

In an Express upload route, Pompelmi fits at the application layer:

- `@pompelmi/express-middleware` turns the route into a real upload gate.
- `CommonHeuristicsScanner` adds deeper checks for suspicious document structures and disguised payloads.
- `createZipBombGuard()` handles archive-specific abuse that an extension or MIME allowlist cannot see.

That model keeps the first scan in your own Node.js process. No cloud API. No daemon. No extra hop before the route can answer.

## Verdict handling should be explicit

A lot of upload routes only know two outcomes: success or failure. That is often too blunt.

A practical Express route usually needs three actions:

- `clean`: accept and store
- `suspicious`: quarantine or review
- `malicious`: reject outright

That is especially useful for document-heavy products where a suspicious PDF or Office file should not reach live storage, but you still want an audit trail or manual review path.

If your route should hard-block both `suspicious` and `malicious`, keep `stopOn: 'suspicious'`. If you need a review workflow, let `suspicious` reach your handler and decide there.

## Common Express mistakes

- Using `diskStorage()` as the default for untrusted uploads
- Trusting `req.file.mimetype` as the final answer
- Reusing one upload policy for avatars, PDFs, and ZIPs
- Writing to S3 before the app returns a verdict
- Treating blocked uploads as generic validation errors instead of security events

## Conclusion

The safest way to scan file uploads in Express is to make the route itself the trust boundary: parse with Multer, inspect in memory, return a verdict, and only then store the bytes. That keeps security logic close to the real upload path instead of pushing it into cleanup jobs after the fact.

For a production-ready starting point, use the canonical [Express guide](/pompelmi/how-to/express/) and adapt the route policy to the file types you actually accept.

## Related reading

- [Secure file uploads in Node.js: Beyond extension and MIME checks](/pompelmi/blog/secure-file-uploads-nodejs/)
- [How to scan file uploads in Multer](/pompelmi/tutorials/how-to-scan-file-uploads-in-multer/)
- [Scan files before S3 upload in Node.js](/pompelmi/blog/scan-files-before-s3-upload-nodejs/)
- [Extension checks vs MIME sniffing vs content inspection](/pompelmi/comparisons/extension-checks-vs-mime-sniffing-vs-content-inspection/)
- [Quarantine / inspect-first-store-later workflows](/pompelmi/use-cases/quarantine-inspect-first-store-later/)
- [Express examples on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples/express-minimal)
