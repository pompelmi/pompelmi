---
title: "Scan Files Before S3 Upload in Node.js"
description: "A practical Node.js pattern for scanning uploads before they reach live S3 storage, using memory-backed routes or quarantine-then-promote workflows."
pubDate: 2026-03-31
updatedDate: 2026-03-31
author: "Pompelmi Team"
category: "Workflow"
tags: ["s3", "object-storage", "security", "nodejs", "uploads"]
---

# Scan Files Before S3 Upload in Node.js

If you want to scan files before S3 upload in Node.js, the important detail is what "before S3" means in your architecture.

If your Node.js route receives the multipart body itself, you can scan the bytes before calling `PutObject`. If your browser uploads directly to S3 with a presigned URL, you cannot scan before the object exists. In that case, the secure pattern is quarantine first, then promote to live storage only after a clean verdict.

## The best pattern when Node.js receives the file

When the application server is in the byte path, keep the file in memory, scan it, and write to S3 only after `clean`.

```ts
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { scan } from 'pompelmi';

const s3 = new S3Client({});

async function storeCleanUpload(file: { buffer: Buffer; originalname: string; mimetype: string }) {
  const report = await scan(file.buffer, { preset: 'balanced' });

  if (report.verdict !== 'clean') {
    return {
      ok: false,
      verdict: report.verdict,
      findings: report.findings,
    };
  }

  const key = `live/${randomUUID()}-${file.originalname}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.UPLOAD_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return { ok: true, key };
}
```

This is the cleanest interpretation of scan before S3 upload: your app does not write the object until the upload route has made a decision.

## Why not write to the live bucket first

Writing first and scanning second sounds simpler, but it changes the trust boundary in the wrong direction.

Once the object is in the live bucket:

- other systems may start processing it
- the object may become downloadable too early
- cleanup becomes a race instead of a gate

That is especially risky for document pipelines, archive imports, and user-generated content that triggers asynchronous workers.

## The quarantine-then-promote pattern

For presigned uploads or large-file flows, the safer pattern is:

1. issue a presigned URL for a quarantine bucket or prefix
2. let the client upload there
3. scan in your own worker or review service
4. promote only after `clean`
5. keep `suspicious` in quarantine and delete or retain `malicious` in a restricted path

That pattern is still "scan before storage" in the sense that you never trust the live storage path until the verdict is in.

## What to inspect before promotion

S3 itself does not validate the file for you. Your Node.js worker still needs to consider:

- MIME spoofing and extension mismatch
- risky archives and ZIP bombs
- suspicious document structure
- route-specific file-type policy

In other words, object storage changes where the boundary lives. It does not remove the need for the boundary.

## Where Pompelmi fits

Pompelmi works well in both versions of the pattern:

- inside the synchronous Node.js route before `PutObject`
- inside a worker that scans quarantine objects before promotion

That keeps the initial security decision local to your own infrastructure without sending uploads to a cloud scanning API first.

## Conclusion

The safest Node.js approach is not "scan after S3." It is "do not trust live S3 until the scan is done." For app-server uploads, scan before `PutObject`. For presigned uploads, quarantine first and promote only after `clean`.

If your product already uses direct object storage, start with the canonical [secure S3 presigned uploads tutorial](/tutorials/secure-s3-presigned-uploads-with-malware-scanning/) and build promotion logic instead of retroactive cleanup.

## Related reading

- [Secure file uploads in Node.js: Beyond extension and MIME checks](/blog/secure-file-uploads-nodejs/)
- [Secure S3 presigned uploads with malware scanning](/tutorials/secure-s3-presigned-uploads-with-malware-scanning/)
- [S3 / presigned upload security](/use-cases/s3-presigned-upload-security/)
- [Quarantine / inspect-first-store-later workflows](/use-cases/quarantine-inspect-first-store-later/)
- [Quarantine workflow example on GitHub](https://github.com/pompelmi/pompelmi/blob/main/examples/quarantine-workflow.ts)
