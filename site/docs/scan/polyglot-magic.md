

---
title: Polyglot magic
---

# Polyglot magic

Flags files whose bytes contain **two or more distinct file signatures** (aka
*magic headers*) — classic examples: **PNG+ZIP**, **PDF+ZIP**, **GIF+ZIP**. Such
*polyglot* files can bypass simple extension/MIME checks and be interpreted
**differently by different parsers/viewers**.

**Default severity:** `suspicious`

> Why it matters: An upload pipeline might validate an image, but the same file
> could also be parsed as a ZIP by another component later and contain harmful
> payloads.

## What it checks
The rule scans the beginning of the file for well‑known magics and also checks
for container signatures that may appear slightly later in the blob. It looks
for combinations across formats such as:

- **Images:** PNG (`89 50 4E 47 0D 0A 1A 0A`), JPEG (`FF D8 FF`), GIF (`47 49 46 38 37|39 61`).
- **Docs/containers:** ZIP (`50 4B 03 04` etc.), PDF (`25 50 44 46 2D`), 7z (`37 7A BC AF 27 1C`), RAR (`52 61 72 21`), GZIP (`1F 8B`).

A match occurs when **2+ distinct families** are detected in plausible
positions (e.g. *image at offset 0* **and** *ZIP header later in the file*).

> Legit ZIP‑based formats (e.g. **.docx**, **.xlsx**, **.jar**) start with `PK`.
> They are **not** polyglots unless **another unrelated magic** is also present.

## Usage

### Engine (stand‑alone)
```ts
import { compose, PolyglotMagicScanner } from '@pompelmi/engine'

export const scan = compose([
  PolyglotMagicScanner(),
])
```

### Express middleware
```ts
import express from 'express'
import multer from 'multer'
import { createPompelmiMiddleware } from '@pompelmi/express-middleware'
import { compose, PolyglotMagicScanner } from '@pompelmi/engine'

const app = express()
const upload = multer()

app.post(
  '/upload',
  upload.single('file'),
  createPompelmiMiddleware({
    scan: compose([PolyglotMagicScanner()])
  }),
  (req, res) => res.send('ok')
)
```

### Next.js API route
```ts
import type { NextRequest } from 'next/server'
import { compose, PolyglotMagicScanner } from '@pompelmi/engine'
const scan = compose([PolyglotMagicScanner()])
// …wire `scan` into your upload handler
```

## Options
This rule currently exposes **no runtime options**. If needed, you can:

- Run it only on routes that accept *media* or *documents*.
- Combine with server‑side MIME sniffing to reduce noise.
- Downgrade the decision to `review` if your workflow accepts some dual‑format files.

## False‑positive notes
- Some binaries may coincidentally contain `PK` or `%PDF-` strings; the scanner
  mitigates this by checking **expected offsets/patterns**, but rare edge cases
  exist.
- ZIP‑based formats (DOCX/XLSX/ODT/JAR) are **ZIP only**; they should **not**
  also contain a valid image header at offset 0.

## Minimal example (PNG + ZIP)
A hand‑crafted polyglot often looks like this (hex, annotated):

```text
89 50 4E 47 0D 0A 1A 0A    ; PNG signature at offset 0
... (PNG IHDR/IDAT bytes) ...
50 4B 03 04                ; 'PK' — ZIP local file header later in the blob
```

This would render as a PNG in image viewers **and** be readable as a ZIP by
archive tools, allowing hidden payloads.

## See also
- **[Executable detector](/docs/scan/executable-detector)** — blocks PE/ELF/Mach‑O.
- **[PDF actions](/docs/scan/pdf-actions)** — flags `/OpenAction`, `/AA`, `/JS`, `/EmbeddedFile`.
- **[SVG active content](/docs/scan/svg-active-content)** — flags `<script>` and `on*=` in SVG.
- **[ZIP deep‑inspection](/docs/zip-inspection)** — traversal‑safe extraction & inner MIME checks.