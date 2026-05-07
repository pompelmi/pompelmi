# @pompelmi/remix

Remix upload handler for [pompelmi](https://pompelmi.app) — in-process ClamAV virus scanning with zero extra dependencies.

Works with **Remix v1 and v2** on Node.js, and is compatible with the `unstable_parseMultipartFormData` API.

## Installation

```bash
npm install @pompelmi/remix pompelmi
```

## Quick Start

```ts
import { unstable_parseMultipartFormData, json } from '@remix-run/node'
import { pompelmiUploadHandler } from '@pompelmi/remix'
import type { ActionFunctionArgs } from '@remix-run/node'

export async function action({ request }: ActionFunctionArgs) {
  const formData = await unstable_parseMultipartFormData(
    request,
    pompelmiUploadHandler({ host: 'localhost', port: 3310 })
  )

  const file = formData.get('file') as File
  return json({ name: file.name, size: file.size, ok: true })
}
```

If a malicious file is uploaded, `pompelmiUploadHandler` throws a `Response` with HTTP **422** — Remix catches it automatically and returns it to the client.

## With an inner handler

Chain with any Remix upload handler (e.g. `unstable_createFileUploadHandler`) to store clean files to disk:

```ts
import {
  unstable_parseMultipartFormData,
  unstable_createFileUploadHandler,
  json,
} from '@remix-run/node'
import { pompelmiUploadHandler } from '@pompelmi/remix'

const uploadToTmp = unstable_createFileUploadHandler({ directory: '/tmp/uploads' })

export async function action({ request }) {
  const formData = await unstable_parseMultipartFormData(
    request,
    pompelmiUploadHandler({
      host: 'localhost',
      port: 3310,
      inner: uploadToTmp,   // called only if file is clean
    })
  )
  const file = formData.get('file')  // NodeOnDiskFile from inner handler
  return json({ ok: true })
}
```

## Scan a specific field only

Use `field` to restrict scanning to a single form field. Other file fields are passed through to `inner` (or returned as `File` objects) without scanning:

```ts
pompelmiUploadHandler({
  host: 'localhost',
  port: 3310,
  field: 'avatar',  // only scan the 'avatar' field
})
```

## Custom error response

```ts
pompelmiUploadHandler({
  host: 'localhost',
  port: 3310,
  onInfected: ({ filename }) => {
    console.warn(`Blocked malicious upload: ${filename}`)
    throw new Response(
      JSON.stringify({ error: 'Malware detected', filename }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  },
})
```

## Route example (full)

```tsx
// app/routes/upload.tsx
import {
  unstable_parseMultipartFormData,
  json,
  type ActionFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { pompelmiUploadHandler } from '@pompelmi/remix'

export async function action({ request }: ActionFunctionArgs) {
  // Throws HTTP 422 automatically if malware is detected
  const formData = await unstable_parseMultipartFormData(
    request,
    pompelmiUploadHandler({ host: 'localhost', port: 3310 })
  )

  const file = formData.get('document') as File
  if (!file) return json({ error: 'No file provided' }, { status: 400 })

  return json({ name: file.name, size: file.size, ok: true })
}

export default function Upload() {
  const data = useActionData<typeof action>()
  return (
    <Form method="post" encType="multipart/form-data">
      <input type="file" name="document" />
      <button type="submit">Upload</button>
      {data?.ok && <p>Uploaded: {data.name} ({data.size} bytes)</p>}
    </Form>
  )
}
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `field` | `string` | — | Only scan this field; others pass through unscanned |
| `inner` | `UploadHandler` | — | Inner handler for clean files (e.g. file-upload, memory) |
| `host` | `string` | — | clamd hostname (enables TCP mode) |
| `port` | `number` | `3310` | clamd port |
| `socket` | `string` | — | UNIX domain socket path |
| `timeout` | `number` | `15000` | Socket idle timeout in ms |
| `retries` | `number` | `0` | Retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries in ms |
| `onInfected` | `Function` | — | Called with `{ name, filename }` when malware detected |

## License

ISC — see root [LICENSE](../../LICENSE).
