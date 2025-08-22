

---
title: SVG active content
---

# SVG active content

Flags **active/scriptable content** inside SVG files. This scanner looks for:

- `<script>` elements (inline or external).
- Inline **event handlers** like `onload`, `onclick`, etc. (`on*=` attributes).

These features enable script execution in some renderers and can be abused for
**cross‑site scripting (XSS)** or UX spoofing when SVGs are displayed inline on
web pages.

**Default severity:** `suspicious`

> Why it matters: Teams often allow SVG uploads for logos/icons. Inline SVGs can
> execute JavaScript in certain contexts. Even if your app sanitizes SVGs later,
> it’s safer to flag them at the upload boundary.

## What it flags
- Presence of **`<script>`** tags anywhere in the SVG.
- Any attribute starting with **`on`** (case‑insensitive), e.g. `onload`,
  `onclick`, `onmouseover`, etc.

> Note: This rule focuses on **script and event handler primitives**. It does
> not parse every possible dangerous URL (`javascript:`) or external reference.

## Usage

### Engine (stand‑alone)
```ts
import { compose, SvgActiveContentScanner } from '@pompelmi/engine'

export const scan = compose([
  SvgActiveContentScanner(),
])
```

### Express middleware
```ts
import express from 'express'
import multer from 'multer'
import { createPompelmiMiddleware } from '@pompelmi/express-middleware'
import { compose, SvgActiveContentScanner } from '@pompelmi/engine'

const app = express()
const upload = multer()

app.post(
  '/upload',
  upload.single('file'),
  createPompelmiMiddleware({
    // Narrow to likely SVGs if desired
    shouldScan: (f) => /svg\+xml/.test(f.mimetype) || /\.svg$/i.test(f.originalname),
    scan: compose([SvgActiveContentScanner()])
  }),
  (req, res) => res.send('ok')
)
```

### Next.js API route
```ts
import type { NextRequest } from 'next/server'
import { compose, SvgActiveContentScanner } from '@pompelmi/engine'
const scan = compose([SvgActiveContentScanner()])
// …wire `scan` into your upload handler
```

## Options
This rule currently exposes **no runtime options**. To reduce noise you can:

- Run it only on endpoints that accept SVGs.
- Treat matches as **review** rather than block, if your pipeline sanitizes SVGs
  (e.g. SVGO/DOMPurify/`sanitize-url`).

## False‑positive notes
- Some design tools export harmless `on*` attributes for interactivity previews;
  these still trigger as *suspicious*.
- Embedded `<script>` is rarely required for simple icons/logos; in that case
  the flag is desired.

## Minimal examples
```xml
<!-- 1) Script tag -->
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <script>alert('hi')</script>
</svg>
```

```xml
<!-- 2) Inline event handler -->
<svg xmlns="http://www.w3.org/2000/svg" onload="alert('hi')">
  <circle cx="50" cy="50" r="40" />
</svg>
```

## See also
- **[PDF actions](/docs/scan/pdf-actions)** — flags `/OpenAction`, `/AA`, `/JS`, `/EmbeddedFile` in PDFs.
- **[Polyglot magic](/docs/scan/polyglot-magic)** — detects multiple magic headers.
- **[Executable detector](/docs/scan/executable-detector)** — blocks PE/ELF/Mach‑O.
- **[Compose scanners](/docs/compose-scanners)** — run multiple rules together.