---
title: Adapters Overview
outline: deep
---

# Adapters Overview

Pompelmi provides lightweight integrations for popular Node.js frameworks. This page shows **minimal** examples for **Koa**, **Fastify**, and **Next.js**. See also the Express quickstart: [/docs/quickstart-express](/docs/quickstart-express).

> **Note**  
> Import names and exact options may differ slightly depending on your package versions and monorepo layout. Use the names that exist in your codebase (e.g. `@pompelmi/koa-middleware`, `@pompelmi/fastify-plugin`, `@pompelmi/next-upload`).

---

## Koa

**Install**
```bash
pnpm add koa @koa/router @koa/bodyparser
pnpm add @pompelmi/pompelmi @pompelmi/koa-middleware
```

**Usage**
```ts
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from '@koa/bodyparser'

// Replace with your actual adapter import
import { pompelmiKoa } from '@pompelmi/koa-middleware'
import { basicPolicy } from '../policy'

const app = new Koa()
const router = new Router()

app.use(bodyParser({ enableTypes: ['json', 'form', 'text'] })) // for fields; use a proper file parser if needed

router.post('/upload',
  pompelmiKoa({ policy: basicPolicy }), // scans the file(s) in the request (see your adapter docs)
  async ctx => {
    ctx.body = { ok: true }
  }
)

app.use(router.routes()).use(router.allowedMethods())
app.listen(3000)
```

> Depending on your upload approach you may use a file parser (e.g., `koa-multer` or `busboy`) and let the adapter read from `ctx.request.files`/`ctx.req` stream.

---

## Fastify

**Install**
```bash
pnpm add fastify fastify-multipart
pnpm add @pompelmi/pompelmi @pompelmi/fastify-plugin
```

**Usage**
```ts
import Fastify from 'fastify'
import multipart from 'fastify-multipart'

// Replace with your actual plugin import
import pompelmiPlugin from '@pompelmi/fastify-plugin'
import { basicPolicy } from '../policy'

const app = Fastify()
app.register(multipart)

// Register plugin globally (policy can be passed here, or per-route)
app.register(pompelmiPlugin, { policy: basicPolicy })

app.post('/upload', async (req, reply) => {
  // Depending on your plugin, scanning may have already occurred,
  // or you might call a utility exposed by the plugin here.
  return reply.send({ ok: true })
})

app.listen({ port: 3000 })
```

> For streaming uploads, use `req.file()`/`req.files()` from `fastify-multipart` and pass streams to your scanner if the plugin expects it.

---

## Next.js

Install your chosen adapter or helper functions. Below are two patterns: **App Router** and **Pages Router**.

**Install**
```bash
pnpm add next
pnpm add @pompelmi/pompelmi @pompelmi/next-upload
```

### App Router (Next 13+)

`app/api/upload/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
// Replace with your actual helper
import { handleUpload } from '@pompelmi/next-upload'
import { basicPolicy } from '@/lib/policy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const result = await handleUpload(req, { policy: basicPolicy })
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, reason: err?.message ?? 'Upload error' }, { status: 400 })
  }
}
```

### Pages Router (Next ≤12/13)

`pages/api/upload.ts`

```ts
import type { NextApiRequest, NextApiResponse } from 'next'
// Replace with your actual helper
import { handleNodeApiUpload } from '@pompelmi/next-upload'
import { basicPolicy } from '../../lib/policy'

export const config = { api: { bodyParser: false } } // typically needed for streaming

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const result = await handleNodeApiUpload(req, { policy: basicPolicy })
    if (!result.ok) return res.status(400).json({ ok: false, reason: result.reason })
    return res.json({ ok: true })
  } catch (err: any) {
    return res.status(400).json({ ok: false, reason: err?.message ?? 'Upload error' })
  }
}
```

---

## See also

- **Introduction** → [/docs/](/docs/)
- **Policy** → [/docs/policy](/docs/policy)
- **ZIP Deep-Inspection** → [/docs/zip-inspection](/docs/zip-inspection)
- **Quickstart (Express)** → [/docs/quickstart-express](/docs/quickstart-express)
