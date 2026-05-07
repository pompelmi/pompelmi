# @pompelmi/sveltekit

SvelteKit helper for [pompelmi](https://pompelmi.app) — in-process ClamAV virus scanning with zero extra dependencies.

Works with both **+page.server.ts actions** and **+server.ts API routes** on Node.js.

## Installation

```bash
npm install @pompelmi/sveltekit pompelmi
```

> **Requires** the [`@sveltejs/adapter-node`](https://kit.svelte.dev/docs/adapter-node) adapter. ClamAV is a Node.js process and cannot run on edge runtimes.

## Quick Start

### Form action (+page.server.ts)

```ts
import { scanUpload } from '@pompelmi/sveltekit'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Throws HTTP 422 Response automatically if malware is detected
    await scanUpload(file, { host: 'localhost', port: 3310 })

    // File is guaranteed clean here — save to storage, etc.
    return { success: true, name: file.name }
  }
}
```

If a malicious file is uploaded, `scanUpload` throws a `Response` with HTTP **422** and a JSON body `{ error: 'Malware detected', filename }`. SvelteKit's error boundary catches it automatically.

### API route (+server.ts)

```ts
import { scanUpload } from '@pompelmi/sveltekit'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData()
  const file = formData.get('file') as File

  await scanUpload(file, { host: 'localhost', port: 3310 })

  return json({ ok: true, name: file.name, size: file.size })
}
```

## Scan all files in FormData

Use `scanFormData` to scan every file field at once. Throws on the first malicious file:

```ts
import { scanFormData } from '@pompelmi/sveltekit'

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData()

    // Scans all File/Blob values; throws 422 if any is malicious
    await scanFormData(formData, { host: 'localhost', port: 3310 })

    return { success: true }
  }
}
```

## Custom error handling

```ts
import { scanUpload } from '@pompelmi/sveltekit'
import { fail } from '@sveltejs/kit'

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File

    await scanUpload(file, {
      host: 'localhost',
      port: 3310,
      onInfected: ({ filename }) => {
        console.warn(`Blocked malicious upload: ${filename}`)
        // Use SvelteKit's fail() to return a form error
        throw fail(422, { error: `${filename} contains malware` })
      },
    })

    return { success: true }
  }
}
```

## Route component example (full)

```svelte
<!-- src/routes/upload/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms'
  import type { ActionData } from './$types'

  export let form: ActionData
</script>

<form method="POST" enctype="multipart/form-data" use:enhance>
  <input type="file" name="file" required />
  <button type="submit">Upload & Scan</button>

  {#if form?.error}
    <p style="color: red">{form.error}</p>
  {:else if form?.success}
    <p>Uploaded: {form.name}</p>
  {/if}
</form>
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `string` | — | clamd hostname (enables TCP mode) |
| `port` | `number` | `3310` | clamd port |
| `socket` | `string` | — | UNIX domain socket path |
| `timeout` | `number` | `15000` | Socket idle timeout in ms |
| `retries` | `number` | `0` | Retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries in ms |
| `onInfected` | `Function` | — | Called with `{ filename }` when malware detected; must throw |

## License

ISC — see root [LICENSE](../../LICENSE).
