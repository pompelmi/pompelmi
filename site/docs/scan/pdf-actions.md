

---
title: PDF actions
---

# PDF actions

Flags **interactive/active entries** inside PDF files that may execute code or
run unexpected behavior when the document is opened. This rule scans the raw
PDF bytes and looks for high‑risk keys:

- **/OpenAction** — triggers actions **as soon as the PDF is opened**.
- **/AA** (Additional Actions) — UI‑driven actions (e.g. page open, mouse events).
- **/JS** — embedded JavaScript.
- **/EmbeddedFile** — file attachments that can be extracted/launched by viewers.

**Default severity:** `suspicious`

> Why it matters: PDFs are commonly allowed on upload endpoints. Attackers embed
> JavaScript or auto‑open actions to phish or pivot. Many viewers will **prompt**
> before executing, but servers should still **flag** these documents.

## What it flags

- PDFs containing **/OpenAction** (auto‑open behavior).
- PDFs with **/AA** entries (e.g. `/AA << /O … /C … >>`).
- PDFs with **/JS** keys (inline or in a stream).
- PDFs with **/EmbeddedFile** (attachments).

It is **header/content‑based** and does not rely on the file extension.

> This scanner inspects the **outer file**. PDFs **inside ZIPs** are covered by
> the **ZIP deep‑inspection** feature.

## Usage

### Engine (stand‑alone)
```ts
import { compose, PdfActionScanner } from 'pompelmi'

export const scan = compose([
  PdfActionScanner(),
])
```

### Express middleware
```ts
import express from 'express'
import multer from 'multer'
import { createPompelmiMiddleware } from '@pompelmi/express-middleware'
import { compose, PdfActionScanner } from 'pompelmi'

const app = express()
const upload = multer()

app.post(
  '/upload',
  upload.single('file'),
  createPompelmiMiddleware({
    // Run the PDF scanner only when the client claims PDF to reduce noise
    shouldScan: (f) => f.mimetype === 'application/pdf',
    scan: compose([PdfActionScanner()])
  }),
  (req, res) => res.send('ok')
)
```

### Next.js API route (edge/server)
```ts
import type { NextRequest } from 'next/server'
import { compose, PdfActionScanner } from 'pompelmi'
const scan = compose([PdfActionScanner()])
// …wire scan into your Next upload handler
```

## Options
This rule currently exposes **no tunables**. If you need to relax it:

- Only run it on endpoints that accept PDFs.
- Treat matches as `review` instead of block in your app logic.
- Combine with MIME checks to avoid scanning non‑PDFs.

## False‑positive notes
- Some **benign enterprise PDFs** include attachments (e.g. invoices with XML
  payloads) — these will be marked *suspicious* due to **/EmbeddedFile**.
- Certain authoring tools add inert **/AA** stubs; still uncommon but possible.

## Minimal example (malicious‑leaning)
```pdf
%PDF-1.7
1 0 obj << /Type /Catalog /OpenAction 2 0 R >> endobj
2 0 obj << /S /JavaScript /JS (app.alert('hi')) >> endobj
xref
0 3
0000000000 65535 f 
0000000010 00000 n 
0000000070 00000 n 
trailer << /Root 1 0 R /Size 3 >>
startxref
120
%%EOF
```

## See also
- **[Executable detector](/docs/scan/executable-detector)** — blocks PE/ELF/Mach‑O.
- **[SVG active content](/docs/scan/svg-active-content)** — flags `<script>` & `on*=` in SVG.
- **[Polyglot magic](/docs/scan/polyglot-magic)** — detects files with multiple magic headers.
- **[Compose scanners](/docs/compose-scanners)** — run multiple rules together.