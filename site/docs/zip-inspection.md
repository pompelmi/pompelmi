---
title: ZIP Deep‑Inspection
outline: deep
---

# ZIP Deep‑Inspection

Archives are convenient, but they can hide **zip bombs**, nested archives, path‑traversal attempts (`../`), or very large uncompressed payloads. Pompelmi’s ZIP deep‑inspection is meant to **open** and **inspect** archives safely *before* your app persists or processes them.

> **Note**  
> The examples below use a **pseudo‑API** to stay adapter‑agnostic. Names may differ in your packages (engine/core/adapter). Focus on the **controls** you want to enforce.

## Why it matters

- **Zip bombs / over‑compression**: tiny input expands into GBs of data.  
- **Path traversal**: entries such as `../../etc/passwd` or absolute paths.  
- **Nested archives**: archives inside archives to bypass shallow checks.  
- **Huge files**: single entries beyond reasonable limits.  
- **Too many entries**: resource exhaustion.

## Recommended safe defaults

| Control | Suggested default | Rationale |
|---|---:|---|
| `maxEntries` | **512** | avoid resource exhaustion |
| `maxDepth` | **5** | limit nested archives |
| `maxFileBytes` | **25 MiB** | aligns with typical upload caps |
| `maxTotalBytes` | **100 MiB** | cap total uncompressed size |
| `maxCompressionRatio` | **12** | guard over‑compression (bombs) |
| `allowNestedArchives` | **false** | keep it simple unless needed |
| `forbidSymlinks` | **true** | prevent symlink tricks |
| `pathPolicy` | **"no-parent-refs"** | reject `../` and absolute paths |
| `innerAllowExtensions` | e.g. `['.png','.jpg','.pdf']` | deny by default |

Adjust these to your application needs (e.g., developer uploads vs. customer avatars).

## Policy example (pseudo‑API)

```ts
// zip-policy.ts
export const zipPolicy = {
  zip: {
    enabled: true,
    maxEntries: 512,
    maxDepth: 5,
    maxFileBytes: 25 * 1024 * 1024,
    maxTotalBytes: 100 * 1024 * 1024,
    maxCompressionRatio: 12,
    allowNestedArchives: false,
    forbidSymlinks: true,
    pathPolicy: 'no-parent-refs',           // also rejects absolute paths
    innerAllowExtensions: ['.png','.jpg','.jpeg','.pdf'],
    sniffInnerMime: true                    // magic‑bytes on inner files
  }
}
```

You can merge this with your base **Policy**:

```ts
import { basicPolicy } from './policy'
import { zipPolicy } from './zip-policy'

export const policy = {
  ...basicPolicy,
  ...zipPolicy
}
```

## Integration sketch (Express)

```ts
import express from 'express'
import multer from 'multer'
import { pompelmi } from '@pompelmi/express-middleware'
import { policy } from './policy-with-zip'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.post('/upload-zip',
  upload.single('file'),
  pompelmi({ policy }),
  (req, res) => res.json({ ok: true })
)
```

> **Tip**: If you only want to allow **images** inside an archive, restrict `innerAllowExtensions` accordingly and keep `allowNestedArchives: false`.

## Path policy notes

- Reject **absolute** paths (e.g., `/etc/passwd`, `C:\Windows\...`).  
- Normalize and reject any entry containing `..` after normalization.  
- Collapse duplicated separators and handle oddities like `./`, `~`, or control characters.

## Tuning & telemetry

Log the reason whenever you block an archive (limit exceeded, traversal, etc.). A simple counter of *blocked by reason* helps tune legitimate use‑cases later.

## Next steps

- **YARA integration** for advanced detection → [/docs/yara](/docs/yara) *(coming soon)*  
- **Adapters** overview (Koa/Fastify/Next.js) → [/docs/adapters](/docs/adapters) *(coming soon)*
