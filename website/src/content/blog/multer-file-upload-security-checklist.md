---
title: "Multer File Upload Security Checklist for Node.js"
description: "A practical Multer security checklist for Node.js: memory storage, route-specific limits, archive controls, verdict handling, and scan-before-storage."
pubDate: 2026-03-31
updatedDate: 2026-03-31
author: "Pompelmi Team"
category: "Checklist"
tags: ["multer", "express", "security", "nodejs", "checklist"]
---

# Multer File Upload Security Checklist for Node.js

Multer is a multipart parser, not an upload security system. That is fine, as long as you treat it that way.

If you are using Multer in Node.js, the goal is not to replace it. The goal is to pair it with the controls it does not provide: deeper inspection, archive policy, and a clear decision before storage.

## A secure Multer baseline

Before the checklist, this is the baseline shape you want:

```ts
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});
```

`memoryStorage()` is the key default for untrusted uploads because it keeps the route from persisting the file before your app has a verdict.

## The checklist

### 1. Keep untrusted bytes out of disk storage

Use `multer.memoryStorage()` for synchronous upload routes. If you need large-file or direct-to-storage flows, switch to quarantine storage instead of default `diskStorage()`.

### 2. Set parser limits

Multer should reject oversized requests early. Keep `limits.fileSize` aligned with the security policy you enforce later.

### 3. Use route-specific file policies

Do not accept avatars, PDFs, archives, and mixed documents through one generic Multer config. Different file types need different controls.

### 4. Treat extension checks as a first filter only

Extensions help with obvious mismatches. They do not prove the file is what it claims to be.

### 5. Do not trust `req.file.mimetype` as the final answer

Client-declared MIME is helpful for triage, not trust. It can be wrong or spoofed.

### 6. Add content inspection after Multer parsing

This is where Pompelmi fits. Multer parses the request. `@pompelmi/express-middleware` turns that parsed upload into a real gate before storage.

### 7. Handle archives explicitly

ZIP files need their own policy for expansion, entry counts, compression ratio, and traversal. A `.zip` allowlist entry is not a security strategy.

### 8. Decide what `suspicious` means

Public routes often hard-block suspicious files. Internal document workflows often quarantine them for review. Pick one deliberately.

### 9. Store only after the verdict

If the file lands in S3 or on disk before the route decides, you do not have scan-before-storage.

### 10. Log verdicts as security events

Blocked uploads, suspicious uploads, and scan failures are operational signals. They should be visible in logs and dashboards, not buried in generic 422s.

## Where Pompelmi fits in a Multer route

For Multer, the useful insertion point is after parsing and before storage. That is where Pompelmi can inspect the bytes, catch risky archives or suspicious document structure, and return a route-level verdict that your handler can act on.

That is the missing layer in most "secure upload" examples that only show extension and MIME checks.

## Conclusion

Multer remains a good parser for Node.js uploads, but it needs help at the trust boundary. Keep uploads in memory, enforce route-specific limits, scan before storage, and make archive handling an explicit policy instead of an afterthought.

If you want the shortest implementation path, start with [how to scan file uploads in Multer](/pompelmi/tutorials/how-to-scan-file-uploads-in-multer/) and then tighten the policy for the file types your product actually accepts.

## Related reading

- [How to scan file uploads in Express before storage](/pompelmi/blog/scan-file-uploads-express-before-storage/)
- [How to scan file uploads in Multer](/pompelmi/tutorials/how-to-scan-file-uploads-in-multer/)
- [Secure file uploads in Express](/pompelmi/how-to/express/)
- [Archive / ZIP upload security](/pompelmi/use-cases/archive-zip-upload-security/)
- [Express + Multer example on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples/express-multer-presets)
