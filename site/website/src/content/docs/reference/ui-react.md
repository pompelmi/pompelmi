---
title: "@pompelmi/ui-react API"
description: "Props, events, and usage examples for UploadButton and UploadDropzone."
---

This page documents the React UI components shipped by **@pompelmi/ui-react**.

> **React**: 18+ (works with React 19). Package ships **ESM** and **CJS** builds.

---

## Installation

```bash
pnpm add @pompelmi/ui-react
# or: npm i @pompelmi/ui-react / yarn add @pompelmi/ui-react
```

---

## Import

```tsx
import { UploadButton, UploadDropzone } from '@pompelmi/ui-react';
```

---

## Quick start (Next.js / React)

```tsx
'use client';
import { UploadButton } from '@pompelmi/ui-react';

export default function Demo() {
  return (
    <UploadButton
      action="/api/scan" // your backend route
      accept={["image/jpeg", "image/png", "application/pdf"]}
      maxSize={50 * 1024 * 1024}
      onResult={(res) => console.log(res?.result?.malicious ? 'MALICIOUS' : 'CLEAN')}
      onError={(e) => console.error(e)}
      className="inline-flex items-center px-3 py-2 rounded-md border"
      label="Choose file & scan"
    />
  );
}
```

---

## Common props

```ts
export type ScanResult = {
  result?: { malicious: boolean; [k: string]: unknown };
  error?: string;
};

export type UploadBaseProps = {
  /** Full URL of the scan endpoint, e.g., https://engine.example/scan or /api/scan */
  action: string;
  /** Acceptable file types (same syntax as <input type="file" accept=...>) */
  accept?: string | string[];
  /** Client-side max size in bytes (files larger than this are rejected before upload) */
  maxSize?: number;
  /** Called with the JSON response from the engine */
  onResult?: (res: ScanResult) => void;
  /** Called on client-side or network errors */
  onError?: (err: Error) => void;
  /** 0–100 upload progress percentage */
  onProgress?: (percent: number) => void;
  /** Optional label text for the control */
  label?: string;
  /** Extra CSS classes for styling */
  className?: string;
  /** Disable user interaction */
  disabled?: boolean;
};
```

All props below extend these **common props**.

---

## `<UploadButton />`

Renders a clickable control that opens the native file picker and uploads the selected file to your scan engine.

**Additional behavior**: none (uses only common props).

### Example

```tsx
'use client';
import { UploadButton } from '@pompelmi/ui-react';

const ENGINE = (process.env.NEXT_PUBLIC_POMPELMI_URL || '').replace(/\/$/, '');
const ACTION = ENGINE ? `${ENGINE}/scan` : '/api/scan';

export default function ButtonExample() {
  return (
    <UploadButton
      action={ACTION}
      accept={["image/jpeg", "image/png"]}
      maxSize={50 * 1024 * 1024}
      label="Choose file & scan"
      onProgress={(p) => console.log('progress', p)}
      onResult={(res) => console.log(res?.result?.malicious ? 'MALICIOUS' : 'CLEAN')}
      onError={(e) => console.error('error', e)}
      className="inline-flex items-center px-3 py-2 rounded-md border"
    />
  );
}
```

---

## `<UploadDropzone />`

Renders a drag-and-drop area to drop a file and trigger the upload.

**Additional behavior**: none (uses only common props).

### Example

```tsx
'use client';
import { UploadDropzone } from '@pompelmi/ui-react';

const ENGINE = (process.env.NEXT_PUBLIC_POMPELMI_URL || '').replace(/\/$/, '');
const ACTION = ENGINE ? `${ENGINE}/scan` : '/api/scan';

export default function DropzoneExample() {
  return (
    <UploadDropzone
      action={ACTION}
      maxSize={50 * 1024 * 1024}
      className="mt-3 w-full border-2 border-dashed rounded-lg p-6 text-center"
      onResult={(res) => console.log(res?.result?.malicious ? 'MALICIOUS' : 'CLEAN')}
      onError={(e) => console.error(e)}
      onProgress={(p) => console.log('progress', p)}
    />
  );
}
```

---

## Result payload

The UI posts the selected file to your **scan engine** and forwards the JSON response to `onResult`. The minimal shape expected by the UI is:

```ts
type ScanResult = {
  result?: { malicious: boolean; [k: string]: unknown };
  error?: string;
};
```

### Example JSON

```json
{
  "result": {
    "malicious": false,
    "engine": "clamav",
    "elapsedMs": 42
  }
}
```

> Your engine may include additional properties (e.g., signature names, rule IDs, timings). The components only read `result.malicious` to compute the verdict.

---

## Errors & retries

- **Size guard (client)**: files larger than `maxSize` are rejected and `onError` is called.
- **Network/server errors**: `onError` receives an `Error` (e.g., `Upload failed with status 500`).
- **Invalid JSON**: if the engine returns non‑JSON, `onError` is called.

> The components do not auto‑retry; add your own retry UI if needed.

---

## Accessibility

- Provide a clear `label` where appropriate.
- Both components are keyboard‑accessible; ensure focus styles are visible in your theme.
- Communicate verdicts (CLEAN / MALICIOUS) in your UI using visible text or ARIA live regions if needed.

---

## Styling

- Use `className` to apply your own styles (e.g., Tailwind utility classes).
- If you use Tailwind CSS, ensure your `content` config includes the package and your site sources, e.g.:

```js
// tailwind.config.cjs
module.exports = {
  content: [
    './src/**/*.{astro,html,md,mdx,tsx,jsx}',
    './node_modules/@pompelmi/ui-react/**/*.{js,mjs,cjs,ts,tsx}',
  ],
};
```

---

## Server expectations

- The endpoint in `action` must accept **`multipart/form-data`** with a single field named **`file`**.
- Respond with JSON that contains `result.malicious: boolean` (plus any extra metadata you like).
- See the engine contract reference for exact request/response shapes.

---

## See also

- Tutorial: [Getting started](../getting-started/)
- How‑to guides: [Next.js](../how-to/nextjs/), [Express](../how-to/express/), [Koa](../how-to/koa/)
- Engine contract: [Scan Engine HTTP API](../reference/example/)
- Explanations: [Architecture & threat model](../explaination/architecture/)