---
title: Executable detector
---

# Executable detector

Detects **native executables** by file header (aka *magic bytes*). It catches
Windows **PE** (`MZ`), Linux **ELF** (`0x7F 45 4C 46`) and macOS **Mach‑O**
(`FE ED FA CE` / `FE ED FA CF` / `CA FE BA BE` / `BE BA FE CA`) and flags the
upload.

> This rule is header-based, not extension-based — it does **not** rely on the
> filename. If the first bytes look like an executable, it triggers.

**Default severity:** `malicious`  
**Good for:** public upload endpoints (avatars, attachments, PDFs, images),
where native binaries should never appear.

## What it flags

- Windows PE/COFF (`MZ…`) including `.exe`, `.dll`, `.sys`.
- Linux/Unix ELF (starts with `0x7F 'E' 'L' 'F'`).
- macOS Mach‑O & Fat binaries (Mach‑O & Universal headers).

> Note: This scanner looks at the *outer* file only. Executables **inside ZIPs**
> are handled by the **[ZIP deep‑inspection](/docs/zip-inspection)** feature.

## Usage

### Engine (stand‑alone)
```ts
import { compose, ExecutableDetector } from 'pompelmi'

export const scan = compose([
  ExecutableDetector(),
])
```

### Express middleware
```ts
import express from 'express'
import multer from 'multer'
import { createPompelmiMiddleware } from '@pompelmi/express-middleware'
import { compose, ExecutableDetector } from 'pompelmi'

const app = express()
const upload = multer()

app.post(
  '/upload',
  upload.single('file'),
  createPompelmiMiddleware({
    scan: compose([ExecutableDetector()])
  }),
  (req, res) => res.send('ok')
)
```

### Next.js API route (edge/server)
```ts
import type { NextRequest } from 'next/server'
import { compose, ExecutableDetector } from 'pompelmi'
// …use your preferred Next upload adapter; pass the composed scan
const scan = compose([ExecutableDetector()])
```

## Options
This rule currently has **no runtime options**. If you need to relax the rule,
consider:

- Running it only on specific routes (e.g. image‑only endpoints).
- Downgrading decisions in your own logic (treat `malicious` as `block` or
  `review`).

## False‑positive notes
- Some non‑binary files may contain the text `MZ` elsewhere; this rule checks
  **at offset `0`** only to avoid those.
- If you legitimately accept native binaries (e.g. developer tooling), run this
  rule only on the endpoints that should *not* accept them.

## See also
- **[PDF actions](/docs/scan/pdf-actions)** — flags `/OpenAction`, `/AA`, `/JS`, `/EmbeddedFile` in PDFs.
- **[SVG active content](/docs/scan/svg-active-content)** — flags `<script>` and `on*=` in SVGs.
- **[Polyglot magic](/docs/scan/polyglot-magic)** — flags files with 2+ different magic headers.
- **[Compose scanners](/docs/compose-scanners)** — run multiple rules together.
