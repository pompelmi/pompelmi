---
title: Use Pompelmi with Express
description: Scan uploads in an Express app via middleware.
---

## Install
```bash
pnpm add @pompelmi/express-middleware
---
title: Use Pompelmi with Express
description: Add a /scan endpoint in Express that validates uploads and forwards them to your scan engine.
---

This guide shows a concrete, minimal integration with **Express**. You’ll expose a `POST /scan` route that accepts a file, performs basic checks (size/MIME), forwards it to your **scan engine** (e.g., ClamAV/YARA service), and returns a clear **CLEAN / MALICIOUS** verdict to the client UI.

> Works with Node **18+** (uses the built‑in `fetch`, `Blob`, and `FormData`).

---

## 1) Install

```bash
pnpm add express multer cors
```

No extra HTTP client is needed—Node 18+ has `fetch` and `FormData` built in.

---

## 2) Environment

Create `.env` (or export the variable in your shell):

```bash
POMPELMI_ENGINE_URL=https://your-engine.example
PORT=4000
```

> The UI will call **your** Express route (e.g., `http://localhost:4000/scan`). Your Express route will forward the file to `${POMPELMI_ENGINE_URL}/scan` and return the engine’s JSON.

---

## 3) Minimal server

Create `server.ts` (or `server.js` if you prefer JS):

```ts
import express from 'express';
import multer from 'multer';
import cors from 'cors';

const app = express();

// Allow your site origins (adjust for prod)
app.use(cors({
  origin: [
    'http://localhost:3000', // Next.js dev
    'http://localhost:4321', // Astro dev (docs/demo)
  ],
}));

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

app.post('/scan', upload.single('file'), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'No file provided' });

    if (!ALLOW.has(f.mimetype)) {
      return res.status(415).json({ error: `Unsupported content-type: ${f.mimetype}` });
    }

    // Build multipart body for the engine
    const form = new FormData();
    const blob = new Blob([f.buffer], { type: f.mimetype });
    form.append('file', blob, f.originalname);

    const r = await fetch(ACTION, { method: 'POST', body: form });
    const data = await r.json().catch(() => ({ error: 'Invalid JSON from engine' }));

    // Pass-through status + body (normalize a bit for the UI)
    if (!r.ok) return res.status(r.status).json({ error: data?.error || 'Scan error' });
    return res.status(200).json(data);
  } catch (err) {
    console.error('[pompelmi] scan error', err);
    return res.status(500).json({ error: 'Internal error while scanning' });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`pompelmi express listening on http://localhost:${port}`);
});
```

**Notes**

- The route expects a single `file` field (that’s what the React UI components send).
- Keep **size/MIME** guards server‑side even if the UI also enforces limits.
- If your engine requires headers/auth, add them to the `fetch` call.

---

## 4) Wire up the UI (client)

In your Next.js/React app, point the UI to **your** Express route:

```env
# Next.js (client)
NEXT_PUBLIC_POMPELMI_URL=http://localhost:4000
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
- Stream to temp files if you expect very large uploads (switch Multer storage).
- Make the engine URL configurable via secret manager/ENV.

---

## Troubleshooting

- **415 Unsupported content-type** → Add the needed MIME(s) to `ALLOW` or remove the guard.
- **CORS errors** → Update `cors({ origin: [...] })` with your production domain.
- **Engine 5xx / timeouts** → Check engine logs and network reachability; consider a timeout/retry policy around `fetch`.
- **UI shows only ERROR** → Open DevTools → Network, inspect the `/scan` response JSON from your server.

---

## Alternative: using `@pompelmi/express-middleware`

If you prefer a one‑liner, the monorepo ships `@pompelmi/express-middleware`. Its exact API may evolve; see the package README in your repo. A typical usage looks like:

```ts
import express from 'express';
import { pompelmi } from '@pompelmi/express-middleware';

const app = express();
app.post('/scan', pompelmi({ engineUrl: process.env.POMPELMI_ENGINE_URL! }));
```

> The custom middleware is optional—the plain Express example above is fully functional and gives you maximum control.