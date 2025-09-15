
---
title: Quickstart (Express)
description: Minimal Express route with a size cap and a composed scanner pipeline (Executable, PDF actions, SVG active content, Polyglot, ZIP guard).
sidebar:
  label: Quickstart (Express)
  order: 2
---

This page shows a minimal route‑level integration with **Express** using:
- a simple **policy** (size cap via `multer` — see [/docs/policy](/docs/policy) for full allowlists)
- a **composed scanner** pipeline from `pompelmi`

## Requirements
- Node.js ≥ 18
- Express + an upload middleware (e.g. `multer`)
- `pompelmi` + `@pompelmi/express-middleware`

```bash
pnpm add express multer pompelmi @pompelmi/express-middleware
# or: npm i express multer pompelmi @pompelmi/express-middleware
```

## Basic policy (size cap)
```ts
// policy.ts
export const basicPolicy = {
  maxFileSizeBytes: 25 * 1024 * 1024, // 25 MiB
  timeoutMs: 5000,
  failClosed: true,
}
```

## Express setup (compose scanners)
```ts
import express from 'express'
import multer from 'multer'
import { createUploadGuard } from '@pompelmi/express-middleware'
import {
  compose,
  ExecutableDetector,
  PdfActionScanner,
  SvgActiveContentScanner,
  PolyglotMagicScanner,
  createZipBombGuard,
} from 'pompelmi'
import { basicPolicy } from './policy'

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: basicPolicy.maxFileSizeBytes },
})

// Compose a single scanner out of several rules
const scan = compose([
  ExecutableDetector(),
  PdfActionScanner(),
  SvgActiveContentScanner(),
  PolyglotMagicScanner(),
  createZipBombGuard({
    maxEntries: 512,
    maxTotalUncompressedBytes: 100 * 1024 * 1024, // 100 MiB
    maxCompressionRatio: 12,
    maxDepth: 2,
    disallowParentRefs: true,
    disallowAbsolutePaths: true,
    allowSymlinks: false,
    sniffInnerMime: true,
    checkHeaderIntegrity: true,
  })
])

app.post('/upload',
  upload.any(),
  createUploadGuard({
    ...basicPolicy,
    scanner: scan, // run the composed pipeline
  }),
  (req, res) => res.json({ ok: true, scan: (req as any).pompelmi ?? null })
)

// Surface friendly errors
app.use((err, req, res, next) => {
  if (err?.name === 'PompelmiError') {
    return res.status(400).json({ ok: false, reason: err.message })
  }
  next(err)
})

app.listen(3000, () => console.log('http://localhost:3000'))
```

## Try it
```bash
# 1) A safe image should pass
curl -F "file=@/path/to/safe.png" http://localhost:3000/upload

# 2) A suspicious SVG with a script should be flagged
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' \
  | curl -F "file=@-;filename=bad.svg;type=image/svg+xml" http://localhost:3000/upload
```

## Notes
- Add **extension/MIME allowlists** and other caps in [/docs/policy](/docs/policy).
- If you only accept specific types per route, you can conditionally run
  scanners (e.g., only run `PdfActionScanner()` when `mimetype` is PDF).
- For advanced orchestration (timeouts, stop‑on‑first, parallel), see
  [/docs/compose-scanners](/docs/compose-scanners).
```
