---
title: "Secure File Uploads in Node.js: Beyond Extension and MIME Checks"
description: "A practical guide to secure file uploads in Node.js with scan-before-storage, archive controls, suspicious document handling, and route-specific policies."
pubDate: 2026-03-31
updatedDate: 2026-03-31
author: "Pompelmi Team"
category: "Architecture"
tags: ["nodejs", "uploads", "security", "architecture", "malware-scanning"]
---

# Secure File Uploads in Node.js: Beyond Extension and MIME Checks

Secure file uploads in Node.js require more than an extension allowlist and a MIME check. Those are useful first filters, but they do not answer the real question: should this file be trusted by your application?

That question matters before storage, before queues, and before any parser or converter sees the file. If your upload route cannot answer it, you are not building an upload boundary. You are building a cleanup process.

## What a secure Node.js upload route actually needs

A strong upload path is layered. Each layer solves a different problem.

| Layer | What it does | Why it is not enough alone |
| --- | --- | --- |
| Parser limits | caps file size, request size, and file count | does not inspect content |
| Extension allowlist | rejects obviously wrong filenames | easy to bypass |
| MIME checks | filters obvious type mismatches | client MIME can be spoofed |
| Content inspection | looks for risky structure in the bytes | still needs route policy around it |
| Archive controls | handles ZIP traversal, expansion, and entry counts | only applies to archives |
| Storage decision | decides allow, quarantine, or reject | depends on good signals upstream |

That layered model is the difference between basic upload validation and a secure upload route.

## The scan-before-storage rule

For Node.js applications, the clean default is:

1. receive the upload
2. keep untrusted bytes out of durable storage
3. inspect before trust
4. persist only after `clean`

In a small synchronous route, that often means memory-backed uploads and an in-process decision. In a large-file or presigned workflow, it means quarantine first and promotion later.

## A practical Node.js scanning step

If you need a minimal route-level scanning step in Node.js, start with a local scan and a clear verdict.

```ts
import { scan } from 'pompelmi';

async function handleUpload(file: { buffer: Buffer; originalname: string }) {
  const report = await scan(file.buffer, { preset: 'balanced' });

  if (report.verdict === 'malicious') {
    return { action: 'reject', findings: report.findings };
  }

  if (report.verdict === 'suspicious') {
    return { action: 'quarantine', findings: report.findings };
  }

  return { action: 'store' };
}
```

That is not the whole architecture, but it captures the right order of operations: inspect first, store second.

## Real attack-surface issues to design for

These are the cases that keep showing up in Node.js upload routes:

- MIME spoofing where request metadata claims a safe type
- extension mismatch where the name looks harmless but the bytes do not
- risky archives that expand far beyond what the route expected
- ZIP traversal entries that try to escape the intended path
- suspicious PDF, SVG, or Office structures that should never be treated like plain files

Different file types need different controls. An avatar route, a PDF intake route, and a ZIP import route should not all share the same policy.

## Where Pompelmi fits

Pompelmi is designed for the application-layer upload boundary:

- scan before storage
- no cloud API
- no daemon
- privacy-friendly local execution
- framework adapters for real Node.js upload paths

That makes it a good fit when you want the first decision to stay close to the route instead of shipping bytes to another service before the app can respond.

## The storage decision is part of security

A secure upload route is not finished when it returns a verdict. It also needs a storage action:

- `clean`: move into the normal storage path
- `suspicious`: quarantine for review or asynchronous follow-up
- `malicious`: reject or retain in a restricted evidence path

This is where many Node.js systems still fail. They scan, but they write to the live bucket first. That is too late for a true upload boundary.

## Conclusion

Secure file uploads in Node.js are about ordering and control, not just a bigger allowlist. Put limits at the parser, validate what the route expects, inspect the bytes, handle archives explicitly, and keep storage behind the verdict.

If you are implementing this now, start with [Getting started](/pompelmi/getting-started/) and then jump into the framework guide that matches your actual route instead of inventing a generic one-size-fits-all upload policy.

## Related reading

- [How to scan file uploads in Express before storage](/pompelmi/blog/scan-file-uploads-express-before-storage/)
- [Scan files before S3 upload in Node.js](/pompelmi/blog/scan-files-before-s3-upload-nodejs/)
- [Node.js file upload security checklist](/pompelmi/tutorials/nodejs-file-upload-security-checklist/)
- [File-type validation vs malware scanning](/pompelmi/comparisons/file-type-validation-vs-malware-scanning/)
- [Defense in depth for file uploads](/pompelmi/use-cases/defense-in-depth-for-file-uploads/)
- [Examples on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples)
