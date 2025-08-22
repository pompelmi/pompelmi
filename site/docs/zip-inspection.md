---
title: ZIP deep-inspection
---

# ZIP deep-inspection

Guards against **zip bombs**, **path traversal**, and **format spoofing** inside
ZIP uploads. It can also **sniff inner MIME types** and (optionally) compare
header fields for integrity (LFH vs CEN).

**Default severity:** `suspicious` for risky content/limits exceeded;  
`malicious` for traversal attempts or clearly dangerous structures.

## What it checks

- **Bomb limits**
  - `maxEntries` — maximum number of entries
  - `maxTotalUncompressedBytes` — cap on total expanded size
  - `maxCompressionRatio` — expanded/original ratio guard
  - `maxDepth` — nested archive depth (ZIP‑in‑ZIP)

- **Traversal‑safe extraction**
  - Rejects entries with `../` segments
  - Rejects absolute paths (`/…` / `C:\…`)
  - Rejects NUL/control characters in names
  - (Option) reject symlinks

- **Header integrity (LFH vs CEN)**
  - **Name/size/flags** must be consistent between Local File Header and Central
    Directory header. Mismatches are flagged (spoofed filenames / sizes).

- **Inner MIME sniffing**
  - Optionally reads the first bytes of each file to validate claimed type
    (e.g., `image/png` that is actually a script).

## Recommended safe defaults

| Control | Suggested default | Rationale |
|---|---:|---|
| `maxEntries` | **512** | avoid resource exhaustion |
| `maxDepth` | **2–5** | limit nested archives |
| `maxTotalUncompressedBytes` | **100 MiB** | cap total uncompressed size |
| `maxCompressionRatio` | **12** | guard over‑compression (bombs) |
| `allowSymlinks` | **false** | prevent symlink tricks |
| `disallowParentRefs` | **true** | reject `../` and absolute paths |
| `sniffInnerMime` | **true** | verify inner content type |
| `checkHeaderIntegrity` | **true** | detect LFH≠CEN spoofing |

Adjust to your application needs (developer uploads vs. customer avatars).

## Usage

### Engine

```ts
import {
  compose,
  createZipBombGuard,
} from '@pompelmi/engine'

const zipGuard = createZipBombGuard({
  maxEntries: 512,
  maxTotalUncompressedBytes: 100 * 1024 * 1024, // 100MB
  maxCompressionRatio: 12,
  maxDepth: 2,
  disallowParentRefs: true,
  disallowAbsolutePaths: true,
  allowSymlinks: false,
  sniffInnerMime: true,
  checkHeaderIntegrity: true, // compare LFH vs CEN
})

export const scan = compose([ zipGuard ])
```

### Express middleware

```ts
import express from 'express'
import multer from 'multer'
import { createPompelmiMiddleware } from '@pompelmi/express-middleware'
import { compose, createZipBombGuard } from '@pompelmi/engine'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

const scan = compose([ createZipBombGuard({
  maxEntries: 512,
  maxTotalUncompressedBytes: 100 * 1024 * 1024,
  maxCompressionRatio: 12,
  disallowParentRefs: true,
  disallowAbsolutePaths: true,
  allowSymlinks: false,
  sniffInnerMime: true,
  checkHeaderIntegrity: true,
}) ])

app.post('/upload-zip',
  upload.single('file'),
  createPompelmiMiddleware({ scan }),
  (req, res) => res.json({ ok: true })
)
```

## Options

```ts
type ZipGuardOptions = {
  maxEntries?: number;                 // default: 1000
  maxTotalUncompressedBytes?: number;  // default: 256 * 1024 * 1024 (256MB)
  maxCompressionRatio?: number;        // default: 10
  maxDepth?: number;                   // default: 1
  disallowParentRefs?: boolean;        // default: true
  disallowAbsolutePaths?: boolean;     // default: true
  allowSymlinks?: boolean;             // default: false
  sniffInnerMime?: boolean;            // default: true
  checkHeaderIntegrity?: boolean;      // default: true
}
```

> Names and defaults above reflect typical safe values. Adjust to your workload
> (e.g., raise `maxTotalUncompressedBytes` for large data sets).

## What triggers a match?

- **Bomb limits exceeded** → `suspicious`
- **Traversal attempt** (`../`, absolute paths) → `malicious`
- **Header integrity mismatch** (LFH≠CEN name/size/flags) → `suspicious`
- **Inner MIME mismatch** (claimed vs sniffed) → `suspicious`

## Examples

**Traversal**
```
../../etc/passwd
```

**Header mismatch (illustrative)**
- CEN: `name="safe.txt"` / size=12  
- LFH: `name="evil.sh"` / size=4096  
→ Flagged: inconsistent metadata

## See also
- **[Executable detector](/docs/scan/executable-detector)**
- **[PDF actions](/docs/scan/pdf-actions)**
- **[SVG active content](/docs/scan/svg-active-content)**
- **[Polyglot magic](/docs/scan/polyglot-magic)**
- **[Compose scanners](/docs/compose-scanners)**
