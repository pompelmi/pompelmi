---
title: S3 / presigned upload security
description: Design S3 presigned upload flows around quarantine storage, delayed promotion, and post-upload inspection instead of trusting direct uploads by default.
---

Direct-to-S3 flows move the upload off your app server, but they do not remove the need for an upload-security decision.

If you want the longer Node.js walkthrough for this storage boundary, read [Scan Files Before S3 Upload in Node.js](/pompelmi/blog/scan-files-before-s3-upload-nodejs/).

## Safer default

Send the client to a quarantine bucket or prefix first, then promote only after a clean scan.

## Why this works

- You keep the large-file benefits of presigned uploads.
- You avoid exposing unreviewed objects through your live storage path.
- You can reuse the same Pompelmi policies in a worker or review service.

## Continue

- [Scan files before S3 upload in Node.js](/pompelmi/blog/scan-files-before-s3-upload-nodejs/)
- [Secure S3 presigned uploads with malware scanning](../tutorials/secure-s3-presigned-uploads-with-malware-scanning/)
- [Quarantine / inspect-first-store-later workflows](./quarantine-inspect-first-store-later/)
- [Pompelmi vs cloud malware scanning APIs](../comparisons/pompelmi-vs-cloud-malware-scanning-apis/)
