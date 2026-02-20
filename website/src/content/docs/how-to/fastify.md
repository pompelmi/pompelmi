---
title: Use Pompelmi with Fastify
description: Add a /scan endpoint in Fastify that validates uploads with MIME guards, size limits, and optional YARA scanning.
---

This guide shows a minimal integration with **Fastify v5**. You'll register the `@pompelmi/fastify-plugin` preHandler and expose a `POST /scan` route that validates files (extension, MIME, size), runs an optional scanner, and returns a clear **clean / suspicious / malicious** verdict.

> Works with Node **18+** and requires `@fastify/multipart` v9+.

---

## 1) Install

```bash
pnpm add fastify @fastify/multipart @pompelmi/fastify-plugin
```

---

## 2) Environment

Create `.env` (or export the variable in your shell):

```bash
PORT=4200
```

---

## 3) Minimal server

Create `server.ts` (or `server.js`):

```ts
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { createUploadGuard } from '@pompelmi/fastify-plugin';

const app = Fastify({ logger: true });

// Register multipart support (required)
await app.register(multipart);

// Create the upload guard preHandler
const uploadGuard = createUploadGuard({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  maxFileSizeBytes: 50 * 1024 * 1024,   // 50 MB
  stopOn: 'suspicious',                   // block suspicious and above
  failClosed: true,                       // reject on scan errors
});

// POST /scan — protected by the upload guard
app.post('/scan', { preHandler: uploadGuard }, async (request, reply) => {
  const { verdict, results } = (request as any).pompelmi;

  if (verdict === 'malicious' || verdict === 'suspicious') {
    return reply.code(422).send({
      result: { malicious: true },
      verdict,
      reasons: results.map((r: any) => r.reason).filter(Boolean),
    });
  }

  return reply.send({ result: { malicious: false }, verdict });
});

const port = Number(process.env.PORT || 4200);
await app.listen({ port, host: '0.0.0.0' });
console.log(`pompelmi fastify listening on http://localhost:${port}`);
```

**Notes**

- `createUploadGuard` returns a Fastify `preHandler` that reads all multipart file parts and attaches `request.pompelmi = { files, results, verdict }` for use in the route handler.
- Rejected uploads (bad extension, bad MIME, too large, or malicious verdict) send a `422` response and stop processing before the route handler is called.
- If your engine requires headers/auth, bring your own scanner function (see below).

---

## 4) Add a custom scanner (optional)

Pass any async function with signature `(bytes: Uint8Array, meta: FileMeta) => Promise<ScanResult>`:

```ts
import { createUploadGuard, type FileMeta, type ScanResult } from '@pompelmi/fastify-plugin';

async function myScanner(bytes: Uint8Array, meta: FileMeta): Promise<ScanResult> {
  // Forward to an external engine, run YARA locally, etc.
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: meta.mimetype }), meta.originalname);
  const res = await fetch(`${process.env.POMPELMI_ENGINE_URL}/scan`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  return {
    severity: data?.result?.malicious ? 'malicious' : 'clean',
    reason: data?.result?.reason,
  };
}

const uploadGuard = createUploadGuard({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  maxFileSizeBytes: 50 * 1024 * 1024,
  scanner: myScanner,
});
```

---

## 5) Wire up the UI (client)

Point the UI components to your Fastify route:

```env
# Next.js (client)
NEXT_PUBLIC_POMPELMI_URL=http://localhost:4200
```

```tsx
import { UploadButton } from '@pompelmi/ui-react';

<UploadButton action={`${process.env.NEXT_PUBLIC_POMPELMI_URL?.replace(/\/$/, '')}/scan`} />
```

---

## 6) Test the flow

- Upload a **clean JPG** → expect `{ result: { malicious: false }, verdict: "clean" }`
- Use the official **EICAR** test file → expect `{ result: { malicious: true }, verdict: "malicious" }` (requires a scanner)
- Watch the Fastify logger output for request details

---

## 7) Production hardening (checklist)

- Tighten `allowedMimeTypes` and add `includeExtensions` to restrict file types further.
- Add **auth** middleware (e.g., JWT) before the upload guard.
- Set a **reverse proxy** (Nginx/Cloudflare) with body size limits and rate limits.
- Use `onScanEvent` callback for telemetry/logging of scan verdicts.
- Make the engine URL configurable via secret manager/ENV.

---

## API reference

### `createUploadGuard(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `allowedMimeTypes` | `string[]` | `[]` (allow all) | MIME types to accept; others get `422` |
| `includeExtensions` | `string[]` | `[]` (allow all) | File extensions (without dot) to accept |
| `maxFileSizeBytes` | `number` | `MAX_SAFE_INTEGER` | Max bytes per file; larger files get `422` |
| `stopOn` | `"suspicious" \| "malicious"` | `"suspicious"` | Minimum verdict level that triggers rejection |
| `failClosed` | `boolean` | `true` | If `true`, scan errors are treated as malicious |
| `scanner` | `ScannerFn` | `undefined` | Custom scanner function or `{ scan }` object |
| `onScanEvent` | `(ev: unknown) => void` | `undefined` | Callback for scan telemetry |

### `request.pompelmi` (injected by the preHandler)

```ts
{
  files: string[];        // original filenames processed
  results: ScanResult[];  // per-file scan results
  verdict: Severity;      // overall verdict: "clean" | "suspicious" | "malicious"
}
```

---

## Troubleshooting

- **422 extension_not_allowed** → Add the extension to `includeExtensions` or remove the guard.
- **422 mime_not_allowed** → Add the MIME type to `allowedMimeTypes` or remove the guard.
- **422 file_too_large** → Increase `maxFileSizeBytes` or reject large files on the client.
- **UI shows only ERROR** → Open DevTools → Network, inspect the `/scan` response JSON from your server.
