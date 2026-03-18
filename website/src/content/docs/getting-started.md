---
title: Getting started
description: Secure your first file upload endpoint with Pompelmi in under 5 minutes. No daemon, no cloud API, no external services required.
---

Start with one upload route and one policy. This guide gets you from zero to a working upload gate in a few minutes.

Pompelmi is most useful when you treat uploaded files as untrusted input and decide what to do with them before storage or downstream processing.

## Prerequisites

- Node.js 18 or higher
- An existing Node.js app, or a new project (`npm init -y`)

---

## 1. Install

```bash
npm install pompelmi
```

That is the only required dependency. No daemon to start and no API key to configure.

---

## 2. Scan one file locally

Create a file named `scan-test.mjs`:

```js
import { scanBytes } from 'pompelmi';
import { readFileSync } from 'node:fs';

const buffer = readFileSync('./package.json');

const result = await scanBytes(buffer, {
  filename: 'package.json',
  mimeType: 'application/json',
});

console.log('Verdict:', result.verdict);
console.log('Reasons:', result.reasons);
console.log('Duration:', result.durationMs, 'ms');
```

Run it:

```bash
node scan-test.mjs
```

You should see `Verdict: clean` for a normal JSON file. Try the [EICAR test string](https://www.eicar.org/download-anti-malware-testfile/) if you want a safe way to exercise a malicious verdict.

---

## 3. Put it in an Express upload route

Install Express and Multer if needed:

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
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const result = await scanBytes(req.file.buffer, {
    policy: STRICT_PUBLIC_UPLOAD,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    failClosed: true,
  });

  if (result.verdict !== 'clean') {
    return res.status(422).json({
      error: 'Upload rejected',
      verdict: result.verdict,
      reasons: result.reasons,
    });
  }

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
curl -F "file=@package.json;type=application/json" http://localhost:3000/upload

curl -F "file=@/path/to/anything.exe;type=application/octet-stream" http://localhost:3000/upload
```

In a real system, `suspicious` uploads often go to quarantine or manual review instead of an immediate permanent reject.

---

## 4. Understand the verdict

`scanBytes` returns a `ScanReport`:

```ts
{
  verdict: 'clean' | 'suspicious' | 'malicious',
  ok: boolean,
  matches: Match[],
  reasons: string[],
  durationMs: number,
  file: {
    name?: string,
    mimeType?: string,
    size?: number,
    sha256?: string,
  },
}
```

Recommended handling:

- `clean` -> continue to storage or downstream processing.
- `suspicious` -> quarantine, hold for review, or reject based on your tolerance.
- `malicious` -> reject, log, and investigate as needed.

---

## 5. Tighten or change the policy

`STRICT_PUBLIC_UPLOAD` is a good starting point for untrusted uploads. Other built-in packs include:

| Policy | Best for |
| --- | --- |
| `STRICT_PUBLIC_UPLOAD` | Anonymous or untrusted uploaders |
| `CONSERVATIVE_DEFAULT` | General-purpose hardened default |
| `DOCUMENTS_ONLY` | PDF, Word, Excel, and CSV portals |
| `IMAGES_ONLY` | Avatar or image-only endpoints |
| `ARCHIVES` | Archive handling with ZIP bomb protection |

```js
import { scanBytes, IMAGES_ONLY } from 'pompelmi';

const result = await scanBytes(buffer, { policy: IMAGES_ONLY });
```

You can also configure rules manually:

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

## What runs during a scan

By default, Pompelmi can combine:

1. Size and extension checks.
2. Declared MIME and magic-byte validation.
3. Structural heuristics for suspicious file content.
4. Archive protections for ZIP expansion and traversal cases.
5. Optional YARA matching when you add it.

---

## Next steps

- [Framework integration guides](./how-to/express/)
- [Threat model and architecture](./explaination/architecture/)
- [Production-readiness checklist](./production-readiness/)
- [Support options](./support/)
