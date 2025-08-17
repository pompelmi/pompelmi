---
title: Introduction
outline: deep
---

# Pompelmi — Documentation

Welcome! This site covers **setup**, framework **adapters** (Express/Koa/Next.js), **policies** (size/MIME/extension), ZIP deep‑inspection, and optional **YARA** integration.

> Looking for a quick taste?  
> 👉 **Demo:** [/demo/](/demo/) · **GitHub:** https://github.com/pompelmi/pompelmi

## Install

```bash
pnpm add pompelmi
# or: npm i pompelmi
# or: yarn add pompelmi
```

## What Pompelmi does

- **ZIP deep‑inspection** with safe extraction rules (bomb/traversal guards).
- **Policy guards**: extension allowlist, size limits, basic MIME sniffing (magic bytes).
- **DX‑first**: TypeScript types, ESM/CJS builds, simple adapters.

## Quickstart (Express)

```ts
// Pseudocode – adjust to your package names/exports.
import express from 'express'
import { createScanner, allowExtensions, maxBytes, sniffMime } from 'pompelmi'

const app = express()

// Basic file policy
const policy = {
  rules: [
    allowExtensions(['.zip', '.png', '.jpg', '.jpeg', '.pdf']),
    maxBytes(25 * 1024 * 1024),
    sniffMime()
  ]
}

const scanner = createScanner(policy)

// Example: handle single file upload (multer/busboy/any)
app.post('/upload', async (req, res) => {
  // get file stream/buffer from your upload middleware
  const file = /* ... */
  const result = await scanner.scan(file)
  if (!result.ok) {
    return res.status(400).json({ ok: false, reason: result.reason })
  }
  res.json({ ok: true })
})

app.listen(3000)
```

> **Note:** The exact API names may differ depending on which Pompelmi package you use (core/engine/adapter). We'll provide adapter‑specific pages next.

## Next steps

- **Express quickstart (end‑to‑end)** — *coming soon*
- **Koa adapter** — *coming soon*
- **Next.js API Route adapter** — *coming soon*
- **YARA integration** — *coming soon*
- **Policy reference** — *coming soon*