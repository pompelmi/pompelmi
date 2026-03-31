---
title: Getting started
description: Install Pompelmi, scan one file locally, and choose the right integration path for your Node.js upload route.
---

Start with one upload route and one clear decision: inspect first, store later.

Pompelmi is most useful when you treat uploaded files as untrusted input and make a policy decision before persistence or downstream parsing.

If you want the wider architecture first, read [Secure file uploads in Node.js: Beyond Extension and MIME Checks](/pompelmi/blog/secure-file-uploads-nodejs/) before picking a framework-specific path.

## 1. Install the core package

```bash
npm install pompelmi
```

That is enough to scan bytes locally. Framework adapters are optional.

## 2. Scan one file

```js
import { readFileSync } from 'node:fs';
import { scanBytes, STRICT_PUBLIC_UPLOAD } from 'pompelmi';

const bytes = readFileSync('./package.json');

const report = await scanBytes(bytes, {
  filename: 'package.json',
  mimeType: 'application/json',
  policy: STRICT_PUBLIC_UPLOAD,
  failClosed: true,
});

console.log(report.verdict);
console.log(report.reasons);
```

## 3. Understand the verdict

| Verdict | Meaning | Typical action |
| --- | --- | --- |
| `clean` | No blocking indicators from the configured checks | Continue to storage or downstream processing |
| `suspicious` | Something risky was detected, but not necessarily confirmed malware | Quarantine, manual review, or reject |
| `malicious` | High-confidence match or a policy condition you treat as malicious | Reject and investigate |

## 4. Pick a first policy

Built-in policy packs cover common starting points:

| Policy | Best for |
| --- | --- |
| `STRICT_PUBLIC_UPLOAD` | Public or semi-trusted upload endpoints |
| `CONSERVATIVE_DEFAULT` | Balanced default for most server-side upload flows |
| `DOCUMENTS_ONLY` | PDF and Office-oriented intake portals |
| `IMAGES_ONLY` | Avatar, gallery, and image-only routes |
| `ARCHIVES` | ZIP-heavy endpoints when paired with archive guards |

For archive handling, pair the policy with `createZipBombGuard()` and `CommonHeuristicsScanner`:

```ts
import { composeScanners, createZipBombGuard, CommonHeuristicsScanner } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);
```

## 5. Choose your integration path

- [Secure file uploads in Express](./how-to/express/)
- [Secure file uploads in Next.js](./how-to/nextjs/)
- [Secure file uploads in NestJS](./how-to/nestjs/)
- [Secure file uploads in Fastify](./how-to/fastify/)
- [Secure file uploads in Koa](./how-to/koa/)
- [Secure file uploads in Nuxt/Nitro](./how-to/nuxt-nitro/)

## 6. Decide how you will store files

The most common safe sequence is:

1. Receive the upload into memory or an isolated temp area.
2. Scan bytes and archive structure.
3. Reject malicious files immediately.
4. Quarantine suspicious files if you need review instead of hard blocking.
5. Persist only the files your application is ready to trust.

## Next steps

- [Secure file uploads in Node.js: Beyond extension and MIME checks](/pompelmi/blog/secure-file-uploads-nodejs/)
- [Scan files before S3 upload in Node.js](/pompelmi/blog/scan-files-before-s3-upload-nodejs/)
- [How to scan file uploads in Multer](./tutorials/how-to-scan-file-uploads-in-multer/)
- [Node.js file upload validation best practices](./tutorials/nodejs-file-upload-validation-best-practices/)
- [Quarantine / inspect-first-store-later workflows](./use-cases/quarantine-inspect-first-store-later/)
- [Production readiness](./production-readiness/)
