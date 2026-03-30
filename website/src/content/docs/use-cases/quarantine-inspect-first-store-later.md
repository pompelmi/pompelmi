---
title: Quarantine / inspect-first-store-later workflows
description: Use Pompelmi verdicts to support quarantine-first upload workflows where suspicious files are isolated, reviewed, and promoted only after inspection.
---

Many production systems need more than `allow` or `reject`. A quarantine-first workflow lets you isolate suspicious files without pretending they are safe.

## Recommended flow

1. Receive the upload into memory or a restricted staging area.
2. Scan with Pompelmi.
3. Reject `malicious`.
4. Quarantine `suspicious`.
5. Promote `clean` files into the live storage path.

## Good fits

- Document portals with human review.
- High-sensitivity internal tools.
- Direct-to-object-storage flows where you need a promotion step anyway.

## Repository example

The repository includes an end-to-end example under [`examples/quarantine-workflow.ts`](https://github.com/pompelmi/pompelmi/blob/main/examples/quarantine-workflow.ts).

## Continue

- [Upload quarantine and review flows](/pompelmi/blog/upload-quarantine-review-flows/)
- [S3 / presigned upload security](./s3-presigned-upload-security/)
- [Document upload security](./document-upload-security/)
