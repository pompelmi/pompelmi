# @pompelmi/hono

Hono middleware for [pompelmi](https://pompelmi.app) — in-process ClamAV virus scanning with zero extra dependencies.

Works on **Node.js**, **Bun**, and **Cloudflare Workers** (simulation mode).

## Installation

```bash
npm install @pompelmi/hono pompelmi
# or
bun add @pompelmi/hono pompelmi
```

## Quick Start

```js
import { Hono } from 'hono'
import { pompelmiMiddleware } from '@pompelmi/hono'

const app = new Hono()

app.use('/upload/*', pompelmiMiddleware({
  host: 'localhost',
  port: 3310,
}))

app.post('/upload', async (c) => {
  // file is guaranteed clean here
  return c.json({ ok: true })
})

export default app
```

## Custom infected handler

```js
app.use('/upload/*', pompelmiMiddleware({
  host: 'localhost',
  port: 3310,
  field: 'file',
  onInfected: (c, filename) => {
    console.warn(`Blocked malicious upload: ${filename}`)
    return c.json({ error: 'Malware detected', filename }, 422)
  },
}))
```

## Hono on Node.js

```js
const { serve } = require('@hono/node-server')
const { Hono } = require('hono')
const { pompelmiMiddleware } = require('@pompelmi/hono')

const app = new Hono()

app.use('/upload/*', pompelmiMiddleware({
  host: '127.0.0.1',
  port: 3310,
}))

app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  return c.json({ name: file.name, size: file.size, ok: true })
})

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('Server running on http://localhost:3000')
})
```

## Hono on Bun

```ts
import { Hono } from 'hono'
import { pompelmiMiddleware } from '@pompelmi/hono'

const app = new Hono()

app.use('/upload/*', pompelmiMiddleware({
  socket: '/run/clamav/clamd.sock',  // UNIX socket — faster on Bun
}))

app.post('/upload', async (c) => {
  return c.json({ ok: true })
})

export default {
  port: 3000,
  fetch: app.fetch,
}
```

## Hono on Cloudflare Workers

> Note: clamd is not available inside Workers. Use pompelmi in a Node.js / Bun sidecar
> service and call it over HTTP, or use the UNIX socket approach with a co-located daemon.
>
> For Workers deployments without a sidecar, the middleware skips scanning gracefully
> and calls `next()` — you can gate the behaviour with an environment variable.

```ts
import { Hono } from 'hono'
import { pompelmiMiddleware } from '@pompelmi/hono'

const app = new Hono<{ Bindings: { SCAN_HOST: string; SCAN_PORT: string } }>()

app.use('/upload/*', async (c, next) => {
  if (!c.env.SCAN_HOST) return next()   // skip if no clamd configured
  return pompelmiMiddleware({
    host: c.env.SCAN_HOST,
    port: Number(c.env.SCAN_PORT) || 3310,
  })(c, next)
})

app.post('/upload', async (c) => {
  return c.json({ ok: true })
})

export default app
```

## Configuration Reference

All options are forwarded to pompelmi's `ScanOptions`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `field` | `string` | `'file'` | Form field name containing the uploaded file |
| `host` | `string` | — | clamd hostname (enables TCP mode) |
| `port` | `number` | `3310` | clamd port |
| `socket` | `string` | — | UNIX domain socket path |
| `timeout` | `number` | `15000` | Socket idle timeout in ms |
| `retries` | `number` | `0` | Number of retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries in ms |
| `onInfected` | `Function` | — | Called with `(c, filename)` when malware is detected |

## TypeScript

```ts
import { Hono } from 'hono'
import { pompelmiMiddleware } from '@pompelmi/hono'
import { Verdict } from 'pompelmi'

const app = new Hono()

app.use('/upload/*', pompelmiMiddleware({
  host: 'localhost',
  port: 3310,
  onInfected: (c, filename) =>
    c.json({ error: `${filename} is infected` }, 422),
}))
```

## License

ISC — see root [LICENSE](../../LICENSE).
