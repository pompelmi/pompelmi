---
title: PDF upload security
description: Harden PDF upload routes with structural inspection, quarantine-friendly verdict handling, and storage decisions that do not trust PDFs by default.
---

PDF is not just a document container. It is a programmable format that often moves into previewers, OCR systems, and internal tooling.

## Recommended approach

- Give PDF uploads their own route or policy.
- Inspect before storage.
- Treat `suspicious` PDFs as review candidates when the business flow requires it.
- Keep downstream PDF processing away from untrusted or unreviewed files.

## Practical notes

- A clean extension and `application/pdf` header are not enough.
- Business portals often need quarantine, not only hard blocking.
- Combine PDF rules with storage isolation and review-friendly logging.

## Continue

- [Document upload security](./document-upload-security/)
- [How to block risky PDFs and SVG uploads](../tutorials/block-risky-pdf-and-svg-uploads/)
- [Do you need antivirus for file uploads?](../comparisons/do-you-need-antivirus-for-file-uploads/)
