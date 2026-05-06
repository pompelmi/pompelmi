# @pompelmi/nextjs

Next.js middleware for [pompelmi](https://pompelmi.app) — in-process ClamAV virus scanning with zero extra dependencies.

Supports both the **App Router** (Next.js 13+) and the **Pages Router** (Next.js ≤ 12).

## Installation

```bash
npm install pompelmi @pompelmi/nextjs
```

ClamAV must be available on the server — either via the system `clamscan` binary or a running `clamd` daemon.

## App Router (Next.js 13+)

```js
// app/api/upload/route.js
import { withPompelmi } from '@pompelmi/nextjs'

export const POST = withPompelmi(async (req) => {
  const formData = await req.formData()
  const file = formData.get('file')
  // req.pompelmiVerdict is set — Verdict.Clean is guaranteed here
  return Response.json({ ok: true })
}, {
  host: 'localhost',
  port: 3310,
})
```

With TypeScript:

```ts
// app/api/upload/route.ts
import { withPompelmi } from '@pompelmi/nextjs'

export const POST = withPompelmi(async (req: Request) => {
  return Response.json({ ok: true })
}, { host: 'localhost', port: 3310 })
```

## Pages Router (Next.js ≤ 12)

```js
// pages/api/upload.js
import { withPompelmiHandler } from '@pompelmi/nextjs'

async function handler(req, res) {
  // req.pompelmiVerdict is set — Verdict.Clean is guaranteed here
  res.json({ ok: true })
}

export default withPompelmiHandler(handler, {
  host: 'localhost',
  port: 3310,
})
```

## Options

All options are forwarded to `pompelmi.scanBuffer()`:

| Option | Type | Default | Description |
|---|---|---|---|
| `host` | `string` | — | clamd hostname (TCP mode) |
| `port` | `number` | `3310` | clamd port |
| `socket` | `string` | — | UNIX socket path |
| `timeout` | `number` | `15000` | Connection timeout in ms |
| `retries` | `number` | `0` | Auto-retry count on failure |

When neither `host` nor `socket` is provided, pompelmi falls back to the local `clamscan` binary.

## Behaviour

- The raw request body is buffered and scanned **before** your handler runs.
- If the body is malicious, a **400 JSON** response is returned immediately: `{ "error": "Malicious file detected" }`.
- `req.pompelmiVerdict` is set to the `Verdict` symbol so your handler can inspect it if needed.
- Scan errors (e.g. clamd unreachable) are **not** blocking — the request proceeds with `Verdict.ScanError`.

## License

ISC
