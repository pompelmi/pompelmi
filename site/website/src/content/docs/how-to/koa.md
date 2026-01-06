---
title: Use Pompelmi with Koa
description: Scan uploads in a Koa app via middleware.
---

## Install
```bash
pnpm add @pompelmi/koa-middleware
---
title: Use Pompelmi with Koa
description: Add a /scan endpoint in Koa that validates uploads and forwards them to your scan engine.
---

This guide shows a minimal integration with **Koa**. You’ll expose a `POST /scan` route that accepts a file, performs basic checks (size/MIME), forwards it to your **scan engine** (e.g., ClamAV/YARA service), and returns a clear **CLEAN / MALICIOUS** verdict to the client UI.

> Works with Node **18+** (uses the built‑in `fetch`, `Blob`, and `FormData`).

---

## 1) Install

```bash
pnpm add koa @koa/router @koa/cors @koa/multer
```

No extra HTTP client is needed—Node 18+ has `fetch` and `FormData` built in.

---

## 2) Environment

Create `.env` (or export the variable in your shell):

```bash
POMPELMI_ENGINE_URL=https://your-engine.example
PORT=4100
```

> The UI will call **your** Koa route (e.g., `http://localhost:4100/scan`). Your route will forward the file to `${POMPELMI_ENGINE_URL}/scan` and return the engine’s JSON.

---

## 3) Minimal server

Create `server.ts` (or `server.js` if you prefer JS):

```ts
import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import multer from '@koa/multer';

const app = new Koa();
const router = new Router();

// Allow your site origins (adjust for prod)
app.use(
  cors({
    origin: (ctx) => {
      const allowed = new Set([
        'http://localhost:3000', // Next.js dev
        'http://localhost:4321', // Astro dev (docs/demo)
      ]);
      const reqOrigin = ctx.request.header.origin || '';
      return allowed.has(reqOrigin) ? reqOrigin : '';
    },
    credentials: false,
  })
);

// Multer in-memory storage + size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB client guard
});

const ENGINE = (process.env.POMPELMI_ENGINE_URL || '').replace(/\/$/, '');
const ACTION = ENGINE ? `${ENGINE}/scan` : '';
if (!ACTION) {
  console.warn('[pompelmi] POMPELMI_ENGINE_URL not set — /scan will fail until you configure it');
}

// Optional: quick MIME allowlist (tighten per your needs)
const ALLOW = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

router.post('/scan', upload.single('file'), async (ctx) => {
  try {
    const f = (ctx.request as any).file as Express.Multer.File | undefined;
    if (!f) {
      ctx.status = 400;
      ctx.body = { error: 'No file provided' };
      return;
    }

    if (!ALLOW.has(f.mimetype)) {
      ctx.status = 415;
      ctx.body = { error: `Unsupported content-type: ${f.mimetype}` };
      return;
    }

    // Build multipart body for the engine
    const form = new FormData();
    const blob = new Blob([f.buffer], { type: f.mimetype });
    form.append('file', blob, f.originalname);

    const r = await fetch(ACTION, { method: 'POST', body: form });
    const data = await r.json().catch(() => ({ error: 'Invalid JSON from engine' }));

    if (!r.ok) {
      ctx.status = r.status;
      ctx.body = { error: (data as any)?.error || 'Scan error' };
      return;
    }

    ctx.status = 200;
    ctx.body = data;
  } catch (err) {
    console.error('[pompelmi] scan error', err);
    ctx.status = 500;
    ctx.body = { error: 'Internal error while scanning' };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  console.log(`pompelmi koa listening on http://localhost:${port}`);
});
```

**Notes**

- The route expects a single `file` field (that’s what the React UI components send).
- Keep **size/MIME** guards server‑side even if the UI also enforces limits.
- If your engine requires headers/auth, add them to the `fetch` call.

---

## 4) Wire up the UI (client)

Point the UI to **your** Koa route:

```env
# Next.js (client)
NEXT_PUBLIC_POMPELMI_URL=http://localhost:4100
```

```tsx
import { UploadButton } from '@pompelmi/ui-react';

<UploadButton action={`${process.env.NEXT_PUBLIC_POMPELMI_URL?.replace(/\/$/, '')}/scan`} />
```

---

## 5) Test the flow

- Upload a **clean JPG** → expect **CLEAN**
- Use the official **EICAR** test file → expect **MALICIOUS** (download it from eicar.org)
- Watch the server logs for errors and the browser Network panel for the `/scan` call

---

## 6) Production hardening (checklist)

- Tighten the **MIME/extension** allowlist to your use‑case.
- Add an **auth layer** (e.g., API key/JWT) on your `/scan` endpoint.
- Set a **reverse proxy** (Nginx/Cloudflare) with body size limits and rate‑limits.
- Stream to temp files if you expect very large uploads (switch multer storage).
- Make the engine URL configurable via secret manager/ENV.

---

## Troubleshooting

- **415 Unsupported content-type** → Add the needed MIME(s) to `ALLOW` or remove the guard.
- **CORS errors** → Update the origin logic in `@koa/cors` with your production domain.
- **Engine 5xx / timeouts** → Check engine logs and network reachability; consider a timeout/retry policy around `fetch`.
- **UI shows only ERROR** → Open DevTools → Network, inspect the `/scan` response JSON from your server.

---

## Alternative: using `@pompelmi/koa-middleware`

If you prefer a one‑liner, the monorepo ships `@pompelmi/koa-middleware`. Its exact API may evolve; see the package README in your repo. A typical usage looks like:

```ts
import Koa from 'koa';
import Router from '@koa/router';
import { pompelmi } from '@pompelmi/koa-middleware';

const app = new Koa();
const router = new Router();

router.post('/scan', pompelmi({ engineUrl: process.env.POMPELMI_ENGINE_URL! }));

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(4100);
```

> The custom middleware is optional—the plain Koa example above is fully functional and gives you maximum control.