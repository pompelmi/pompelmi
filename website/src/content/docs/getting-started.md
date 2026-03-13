---
title: Getting started
description: Secure your first file upload endpoint with Pompelmi in under 5 minutes. No daemon, no cloud API, no external services required.
---

This guide takes you from zero to a working, secure upload endpoint. No external services required — Pompelmi scans files in your Node.js process.

## Prerequisites

- Node.js 18 or higher
- An existing Node.js app, or a new project (`npm init -y`)

---

## 1. Install

```bash
npm install pompelmi
```

That is the only required dependency. No daemon to start, no API key to configure.

---

## 2. Scan your first file

Create a file named `scan-test.mjs`:

```js
import { scanBytes } from 'pompelmi';
import { readFileSync } from 'node:fs';

// Read any file you have locally
const buffer = readFileSync('./package.json');

const result = await scanBytes(buffer, {
  filename: 'package.json',
  mimeType: 'application/json',
});

console.log('Verdict:', result.verdict);     // 'clean' | 'suspicious' | 'malicious'
console.log('Reasons:', result.reasons);
console.log('Duration:', result.durationMs, 'ms');
```

Run it:

```bash
node scan-test.mjs
```

You should see `Verdict: clean` for a normal JSON file. Try the [EICAR test string](https://www.eicar.org/download-anti-malware-testfile/) to see a `malicious` verdict.

---

## 3. Add scanning to an Express endpoint

Install Express (if you do not already have it):

```bash
npm install express multer
```

Create `server.mjs`:

```js
import express from 'express';
import multer from 'multer';
import { scanBytes, STRICT_PUBLIC_UPLOAD } from 'pompelmi';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const result = await scanBytes(req.file.buffer, {
    policy: STRICT_PUBLIC_UPLOAD,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  if (result.verdict === 'malicious') {
    return res.status(422).json({
      error: 'Upload rejected',
      reasons: result.reasons,
    });
  }

  // File passed — proceed to storage
  res.json({ ok: true, verdict: result.verdict });
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
```

Start the server:

```bash
node server.mjs
```

Test it:

```bash
# Should return { ok: true, verdict: 'clean' }
curl -F "file=@package.json;type=application/json" http://localhost:3000/upload

# Try with a disallowed content type — returns 422
curl -F "file=@/path/to/anything.exe;type=application/octet-stream" http://localhost:3000/upload
```

---

## 4. Understand the verdict

`scanBytes` returns a `ScanReport`:

```ts
{
  verdict: 'clean' | 'suspicious' | 'malicious',
  ok: boolean,           // true if verdict is 'clean'
  matches: Match[],      // individual rule matches
  reasons: string[],     // human-readable reasons for non-clean verdicts
  durationMs: number,    // scan time
  file: {
    name?: string,
    mimeType?: string,
    size?: number,
    sha256?: string,
  },
}
```

Your application should:

- `clean` → proceed to storage or processing.
- `suspicious` → hold for review, quarantine, or reject depending on your tolerance.
- `malicious` → reject the upload, log the event, return an appropriate error to the user.

---

## 5. Tighten the policy

The `STRICT_PUBLIC_UPLOAD` policy pack restricts uploads to images and PDFs with a 5 MB limit. Other built-in packs:

| Policy | Best for |
|---|---|
| `STRICT_PUBLIC_UPLOAD` | Anonymous or untrusted uploaders |
| `CONSERVATIVE_DEFAULT` | General-purpose hardened default |
| `DOCUMENTS_ONLY` | PDF, Word, Excel, CSV portals |
| `IMAGES_ONLY` | Avatar or image-only endpoints |
| `ARCHIVES` | Archive handling with ZIP bomb protection |

```js
import { scanBytes, IMAGES_ONLY } from 'pompelmi';

const result = await scanBytes(buffer, { policy: IMAGES_ONLY });
```

You can also configure manually:

```js
import { scanBytes } from 'pompelmi';

const result = await scanBytes(buffer, {
  maxFileSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  includeExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  filename: file.originalname,
});
```

---

## What Pompelmi checks

By default, every scan runs:

1. **Size limit** — rejects oversized files before reading bytes.
2. **Extension check** — rejects extensions not in the allowlist.
3. **MIME type check** — compares declared vs. actual magic-byte signature.
4. **Structural heuristics** — PE/ELF headers, embedded scripts, polyglot files.
5. **ZIP bomb protection** — entry count, per-entry size, nesting depth limits.

Optional: add YARA rules for custom signature-based detection.

---

## Next steps

- **Framework integration:** [Express](./how-to/express/) · [Next.js](./how-to/nextjs/) · [NestJS](./how-to/nestjs/) · [Fastify](./how-to/fastify/) · [Koa](./how-to/koa/)
- **React upload UI:** [React components reference](./reference/ui-react/)
- **Security model:** [Architecture & threat model](./explaination/architecture/)
- **Production hardening:** [Enterprise features](./enterprise/)
