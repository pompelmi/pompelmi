---
title: Getting started (5 minutes)
description: Install the UI package, point it to your scan engine, and verify CLEAN/MALICIOUS end‑to‑end.
---

This short tutorial gets you from zero to a working upload scan in minutes. Minimal choices, copy‑paste friendly.

## Prerequisites

- Node.js 18+
- A running Pompelmi scan engine (HTTP endpoint) with CORS allowing your app origin

---

## 1) Install the UI package

```bash
pnpm add @pompelmi/ui-react
```

> Monorepo/workspace? You can also depend on your local `@pompelmi/ui-react` build.

---

## 2) Configure the engine URL

Create `.env.local` in your app:

```bash
NEXT_PUBLIC_POMPELMI_URL=https://your-engine.example
```

> The UI posts to the `/scan` endpoint. We’ll build the final `action` as `${NEXT_PUBLIC_POMPELMI_URL}/scan`.

---

## 3) Use the components (Next.js App Router example)

Create a page like `app/page.tsx` (or any React component):

```tsx
'use client';

import React, { useState } from 'react';
import { UploadButton, UploadDropzone } from '@pompelmi/ui-react';

const ENGINE = (process.env.NEXT_PUBLIC_POMPELMI_URL || '').replace(/\/$/, '');
const ACTION = ENGINE ? `${ENGINE}/scan` : '';

export default function Page() {
  const [log, setLog] = useState<string[]>([]);
  const push = (msg: string) => setLog((L) => [msg, ...L]);

  return (
    <main className="max-w-3xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Pompelmi — Quick demo</h1>

      <div className="flex items-center gap-4">
        <UploadButton
          action={ACTION}
          maxSize={50 * 1024 * 1024}
          onResult={(res: any) => {
            const verdict = res?.result?.malicious ? 'MALICIOUS' : 'CLEAN';
            push(`Button → ${verdict}`);
          }}
          onError={(e: Error) => push(`Button ERROR → ${e.message}`)}
          onProgress={(p: number) => push(`Button progress → ${Math.round(p)}%`)}
          label="Choose file & scan"
        />
      </div>

      <UploadDropzone
        action={ACTION}
        maxSize={50 * 1024 * 1024}
        onResult={(res: any) => {
          const verdict = res?.result?.malicious ? 'MALICIOUS' : 'CLEAN';
          push(`Dropzone → ${verdict}`);
        }}
        onError={(e: Error) => push(`Dropzone ERROR → ${e.message}`)}
        onProgress={(p: number) => push(`Dropzone progress → ${Math.round(p)}%`)}
        className="mt-2"
      />

      <section>
        <h2 className="font-medium mb-2">Log</h2>
        <ul className="text-sm space-y-1">
          {log.map((l, i) => (
            <li key={i} className="font-mono">{l}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

**Notes**

- `action` is the full scan URL, e.g. `https://your-engine.example/scan`.
- Use `onResult`, `onError`, `onProgress` to update your UI or analytics.
- Tailwind is optional; classes above are just for quick styling.

---

## 4) Test the flow

1. Upload a **clean JPG** → expect **CLEAN**  
2. Try the **EICAR test file** → expect **MALICIOUS**  
3. Verify that both the button and dropzone callbacks fire as expected.

> If your engine is on a different origin, ensure CORS allows your site (e.g., `Access-Control-Allow-Origin: https://yourapp.example`).

---

## Troubleshooting

- **No result / network error** → Check `ACTION` is correct and the engine is reachable. Open DevTools → Network → request to `/scan`.
- **CORS error** → Allow your site origin in the engine’s CORS config.
- **Big files rejected** → Increase `maxSize` prop or server limits.
- **Props not applied** → Make sure you’re importing from `@pompelmi/ui-react` and not a stale local build.

---

## Next steps

- **How-to → Next.js / Express / Koa** for framework-specific recipes.  
- **Reference → `@pompelmi/ui-react`** for complete props & events.  
- **Explanations → Architecture & threat model** for deeper understanding.
