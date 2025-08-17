---
title: Quickstart (Express)
outline: deep
---

# Quickstart (Express)

This page shows a minimal _route-level_ integration with **Express**. It assumes you use the Pompelmi adapter for Express and a basic file policy (extensions, size, simple MIME sniff).

> **Note**  
> Package names and API names may be slightly different in your setup (monorepo vs published scope). Adapt imports to your actual packages (e.g. `@pompelmi/express-middleware`). The flow below is the same.

## Requirements

- Node.js **>= 18**
- Express
- An upload middleware (e.g. **multer** or **busboy**)
- Pompelmi core + Express adapter

## Install

```bash
pnpm add express multer
pnpm add @pompelmi/pompelmi @pompelmi/express-middleware
# or: npm i express multer @pompelmi/pompelmi @pompelmi/express-middleware
```

## Basic policy

A policy combines simple guards you typically want on uploads:

- **Extension allowlist** (e.g. `.zip`, `.png`, `.jpg`, `.pdf`)
- **Max size** (e.g. 25MB)
- **MIME present** (avoid empty/`application/octet-stream` where possible)

```ts
// policy.ts (example)
export const basicPolicy = {
  rules: [
    // pseudo-guards — adapt to your real helpers
    ['allowExtensions', ['.zip', '.png', '.jpg', '.jpeg', '.pdf']],
    ['maxBytes', 25 * 1024 * 1024],
    ['sniffMime', true]
  ]
}
```

## Express setup

Below is a simplified example using **multer**. Replace the adapter import with your real one.

```ts
import express from 'express'
import multer from 'multer'

// Replace with your real adapter import:
import { pompelmi } from '@pompelmi/express-middleware'
// If your adapter exposes different names, adapt accordingly.
// e.g. import createMiddleware from '@pompelmi/express-middleware'

import { basicPolicy } from './policy'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

// Apply scanning middleware only on the route that handles uploads
app.post('/upload',
  upload.single('file'),                 // puts the file in req.file (buffer/stream)
  pompelmi({ policy: basicPolicy }),     // scans the file against the policy
  (req, res) => {
    // If we get here, the file passed the checks.
    res.json({ ok: true })
  }
)

// Optional centralized error handler (adapter should forward failures)
app.use((err, req, res, next) => {
  if (err && err.name === 'PompelmiError') {
    return res.status(400).json({ ok: false, reason: err.message })
  }
  next(err)
})

app.listen(3000, () => {
  console.log('Server listening on http://localhost:3000')
})
```

## Try it locally

```bash
curl -F "file=@/path/to/safe-file.png" http://localhost:3000/upload
```

If you upload a disallowed extension or an oversized file, you should get a `400` with a short reason.

## Next steps

- Read the **Policy** reference → [/docs/policy](/docs/policy) *(coming next)*
- Enable **ZIP deep-inspection** to open archives safely → [/docs/zip-inspection](/docs/zip-inspection) *(coming next)*
- Add **YARA** rules for advanced detection → [/docs/yara](/docs/yara) *(coming next)*
- Use the **Koa**, **Fastify**, or **Next.js** adapters → [/docs/adapters](/docs/adapters) *(coming next)*
