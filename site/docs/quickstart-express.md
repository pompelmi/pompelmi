---
title: Quickstart (Express)
description: Minimal Express route with a safe policy and the built-in CommonHeuristicsScanner (no EICAR).
sidebar:
  label: Quickstart (Express)
  order: 2
---

This page shows a minimal route-level integration with **Express** using:
- a basic **policy** (extensions, size, MIME sniff)
- the built-in **CommonHeuristicsScanner** (no EICAR)
- optional composition with other scanners

## Requirements
- Node.js ≥ 18
- Express + an upload middleware (e.g. multer)
- `pompelmi` core + Express adapter

```bash
pnpm add express multer
pnpm add pompelmi @pompelmi/express-middleware
# or: npm i express multer pompelmi @pompelmi/express-middleware
```

## Basic policy
```ts
// policy.ts
export const basicPolicy = {
  includeExtensions: ['zip','png','jpg','jpeg','pdf'],
  allowedMimeTypes: [
    'application/zip','image/png','image/jpeg','application/pdf','text/plain'
  ],
  maxFileSizeBytes: 25 * 1024 * 1024,
  timeoutMs: 5000,
  failClosed: true,
}
```

## Express setup
```ts
import express from 'express'
import multer from 'multer'
import { createUploadGuard } from '@pompelmi/express-middleware'
import { CommonHeuristicsScanner } from 'pompelmi'
import { basicPolicy } from './policy'

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: basicPolicy.maxFileSizeBytes }
})

app.post('/upload',
  upload.any(),
  createUploadGuard({ ...basicPolicy, scanner: CommonHeuristicsScanner }),
  (req, res) => res.json({ ok: true, scan: (req as any).pompelmi ?? null })
)

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
curl -F "file=@/path/to/safe-file.png" http://localhost:3000/upload
```
