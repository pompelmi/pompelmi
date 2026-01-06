---
title: Use Pompelmi in Next.js
description: Add upload malware scanning to a Next.js app (UI + API route helper).
---

This guide shows a concrete task: integrate in a Next.js app.

## Client (App Router)

```tsx
import { UploadButton } from '@pompelmi/ui-react';

<UploadButton action={`${process.env.NEXT_PUBLIC_POMPELMI_URL?.replace(/\/$/, '')}/scan`} />;
---
title: Use Pompelmi in Next.js
description: Add upload malware scanning to a Next.js app (UI component + API Route Handler).
---

This guide shows a concrete integration for **Next.js (App Router)**. You’ll add a client upload button and a **Route Handler** that accepts the file, validates it (size/MIME), forwards it to your **scan engine**, and returns a clear **CLEAN / MALICIOUS** verdict.

> Requires Node **18+**. Uses native `fetch`, `Blob`, and `FormData`—no extra HTTP client.

---

## 1) Install

```bash
pnpm add @pompelmi/ui-react
```

---

## 2) Environment

Add your engine URL to `.env.local` (server‑only):

```env
POMPELMI_ENGINE_URL=https://your-engine.example
```

> The client will call **your own** Next.js API route (same origin), which will forward the file to `${POMPELMI_ENGINE_URL}/scan` and return the engine’s JSON.

---

## 3) API Route Handler (server)

Create `app/api/scan/route.ts`:

```ts
// app/api/scan/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';           // use Node runtime
export const dynamic = 'force-dynamic';    // never cache uploads

const ENGINE = (process.env.POMPELMI_ENGINE_URL || '').replace(/\/$/, '');
const ACTION = ENGINE ? `${ENGINE}/scan` : '';

// Optional: tighten per your needs
const ALLOW = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const f = form.get('file');

    if (!(f instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const type = f.type || 'application/octet-stream';
    if (!ALLOW.has(type)) {
      return NextResponse.json({ error: `Unsupported content-type: ${type}` }, { status: 415 });
    }

    // Forward to the engine
    const relay = new FormData();
    // @ts-ignore - name is present for File, may be empty for Blob
    const filename = (f as File).name || 'upload.bin';
    relay.append('file', f, filename);

    if (!ACTION) {
      return NextResponse.json({ error: 'Engine URL not configured' }, { status: 500 });
    }

    const r = await fetch(ACTION, { method: 'POST', body: relay });
    const data = await r.json().catch(() => ({ error: 'Invalid JSON from engine' }));

    if (!r.ok) {
      return NextResponse.json({ error: (data as any)?.error || 'Scan error' }, { status: r.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('[pompelmi] /api/scan error', err);
    return NextResponse.json({ error: 'Internal error while scanning' }, { status: 500 });
  }
}
```

> If you must call this API **cross‑origin** (e.g. from another site), add an `OPTIONS` handler and CORS headers to responses. For same‑origin Next apps this is unnecessary.

---

## 4) Client (App Router)

Use the UI component and point it to your API route. Put this in any client component/page:

```tsx
'use client';
import { UploadButton } from '@pompelmi/ui-react';

export default function Demo() {
  return (
    <UploadButton
      action="/api/scan"
      accept={["image/jpeg", "image/png", "application/pdf"]}
      maxSize={50 * 1024 * 1024}
      label="Choose file & scan"
      onResult={(res) => console.log(res?.result?.malicious ? 'MALICIOUS' : 'CLEAN')}
      onError={(e) => console.error(e)}
      onProgress={(p) => console.log('progress', p)}
      className="inline-flex items-center rounded-md border px-3 py-2"
    />
  );
}
```

---

## 5) Test the flow

- Upload a **clean JPG** → expect **CLEAN**
- Use the official **EICAR** test file → expect **MALICIOUS** (download it from eicar.org)
- Check the Network panel for the `/api/scan` request and your terminal for server logs

---

## 6) Production hardening (checklist)

- Tighten the **MIME/extension** allowlist.
- Add **auth** (API key/JWT) to your route before forwarding to the engine.
- Use a reverse proxy/CDN with **body size** and **rate limits**.
- If you expect large files, consider streaming to temp files and/or a background scan pipeline.

---

## Troubleshooting

- **415 Unsupported content-type** → Add the needed MIME(s) to `ALLOW` or remove the guard.
- **Engine 5xx / timeouts** → Verify `POMPELMI_ENGINE_URL` and engine health; add timeouts/retries.
- **UI only shows ERROR** → Inspect the `/api/scan` response payload in DevTools → Network.

---

## Alternative: `@pompelmi/next-upload`

The monorepo ships a convenience wrapper for Next Route Handlers. Its API may evolve; see the package README. Typical usage:

```ts
// app/api/scan/route.ts
import { NextResponse } from 'next/server';
import { pompelmi } from '@pompelmi/next-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = pompelmi({ engineUrl: process.env.POMPELMI_ENGINE_URL! });
```

> The custom helper is optional—the plain Route Handler above is fully functional and gives you maximum control.