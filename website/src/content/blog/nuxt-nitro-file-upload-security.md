---
title: "Nuxt/Nitro File Upload Security with Pompelmi"
description: "Add in-process malware scanning to your Nuxt 3 application's Nitro server routes using Pompelmi — with ZIP protection, MIME sniffing, and zero cloud dependencies."
pubDate: 2024-07-15
author: "Pompelmi Team"
tags: ["nuxt", "nitro", "nodejs", "security", "vue", "tutorial"]
---

# Nuxt/Nitro File Upload Security with Pompelmi

Nuxt 3's Nitro server runs on Node.js and handles multipart uploads through server API routes. That makes it a great environment for Pompelmi — files can be scanned in-process, in the same runtime, before any application logic stores or processes them.

**TL;DR:** In a Nitro server route (`server/api/upload.post.ts`), read the multipart form data, pass the file buffer to `scanBytes` (or use `createNextUploadHandler` from `@pompelmi/next-upload` which works with Nitro's Web `Request`/`Response` API), and return the verdict before persisting anything.

---

## How Nitro Handles File Uploads

Nitro server routes receive a standard Web API `Request` object. File uploads arrive as `multipart/form-data` and can be parsed with `request.formData()`:

```typescript
// server/api/upload.post.ts
export default defineEventHandler(async (event) => {
  const request = event.node.req; // Node.js IncomingMessage
  // OR use the Web API Request in Nitro:
  const formData = await readFormData(event);
  const file = formData.get('file') as File | null;
  // ...
});
```

Nitro's `readFormData(event)` returns a standard `FormData` object — the same interface as the browser. This makes it compatible with `@pompelmi/next-upload`'s `createNextUploadHandler`, which was designed for the Web `Request`/`Response` API.

---

## Option 1: Using @pompelmi/next-upload (Recommended)

`createNextUploadHandler` returns an `async function POST(request: Request): Promise<Response>` handler. Nitro event handlers can delegate to Web API handlers directly.

```bash
npm install @pompelmi/next-upload pompelmi
```

```typescript
// server/api/upload.post.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';
import { CommonHeuristicsScanner } from 'pompelmi';

const handler = createNextUploadHandler({
  scanner: CommonHeuristicsScanner,
  includeExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  detectMime: true,
  enforceMime: true,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  allowArchives: true,
  archive: {
    maxEntries: 500,
    maxTotalUncompressedBytes: 100 * 1024 * 1024,
    maxDepth: 1,
  },
  failClosed: true,
});

export default defineEventHandler(async (event) => {
  // Wrap Nitro's event into a Web API Request
  const req = toWebRequest(event);
  return handler(req);
});
```

`toWebRequest(event)` is provided by the `h3` package (Nitro's underlying framework) since Nitro 2.x / h3 1.x.

The handler returns a `Response` — Nitro automatically serializes it back to the HTTP response.

---

## Option 2: Manual scanBytes Integration

If you need more control over the scan pipeline, call `scanBytes` directly:

```typescript
// server/api/upload.post.ts
import { scanBytes } from 'pompelmi';
import { CommonHeuristicsScanner, createZipBombGuard, composeScanners } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 1000,
      maxTotalUncompressedBytes: 200 * 1024 * 1024,
      maxCompressionRatio: 100,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', timeoutMsPerScanner: 3000 }
);

const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'docx']);
const MAX_SIZE = 10 * 1024 * 1024;

export default defineEventHandler(async (event) => {
  let formData: FormData;
  try {
    formData = await readFormData(event);
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid multipart data' });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw createError({ statusCode: 400, message: 'No file provided' });
  }

  // Extension check
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw createError({ statusCode: 415, message: `Extension .${ext} not allowed` });
  }

  // Size check
  if (file.size > MAX_SIZE) {
    throw createError({ statusCode: 413, message: 'File too large' });
  }

  // Convert to Uint8Array
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Scan
  const matches = await scanner(bytes, { filename: file.name, size: file.size });
  const verdict = matches.length === 0
    ? 'clean'
    : matches.some((m) => ['critical', 'high', 'malicious'].includes(m.severity ?? ''))
      ? 'malicious'
      : 'suspicious';

  if (verdict !== 'clean') {
    throw createError({
      statusCode: 422,
      message: 'File failed security scan',
      data: { verdict, rules: matches.map((m) => m.rule) },
    });
  }

  // File is clean — store it, return response
  return { ok: true, filename: file.name, size: file.size, verdict };
});
```

---

## Configuring nuxt.config.ts

Pompelmi uses Node.js built-ins (`fs`, `path`, etc.) and should only run in the Nitro server context, not in the browser-side bundle:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    // Ensure pompelmi is not bundled into client-side code
    externals: {
      external: ['pompelmi', '@pompelmi/next-upload', '@pompelmi/core'],
    },
  },
  // If you use the @pompelmi/next-upload adapter:
  serverExternals: ['@pompelmi/next-upload'],
});
```

---

## Frontend Upload Component

A minimal Vue 3 component that calls your secure upload endpoint:

```vue
<script setup lang="ts">
const file = ref<File | null>(null);
const result = ref<{ verdict: string; filename: string } | null>(null);
const error = ref<string | null>(null);
const isScanning = ref(false);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
  result.value = null;
  error.value = null;
}

async function upload() {
  if (!file.value) return;
  isScanning.value = true;
  error.value = null;

  const form = new FormData();
  form.append('file', file.value);

  try {
    const res = await $fetch<{ ok: boolean; verdict: string; filename: string }>(
      '/api/upload',
      { method: 'POST', body: form }
    );
    result.value = res;
  } catch (err: any) {
    error.value = err?.data?.message ?? 'Upload failed';
  } finally {
    isScanning.value = false;
  }
}
</script>

<template>
  <div>
    <input type="file" @change="onFileChange" />
    <button :disabled="!file || isScanning" @click="upload">
      {{ isScanning ? 'Scanning…' : 'Upload & Scan' }}
    </button>

    <div v-if="result">
      <span :class="result.verdict === 'clean' ? 'text-green-600' : 'text-red-600'">
        {{ result.verdict }}
      </span>
      — {{ result.filename }}
    </div>
    <div v-if="error" class="text-red-600">{{ error }}</div>
  </div>
</template>
```

---

## Deployment Considerations

Pompelmi runs in the Node.js Nitro runtime — not in edge workers or browser environments. Check your deployment target:

| Target | Works? | Notes |
|---|---|---|
| `node-server` (default) | ✅ | Full Node.js access |
| `vercel` (Node.js functions) | ✅ | Serverless Node.js runtime |
| `netlify` (functions) | ✅ | AWS Lambda-backed Node.js |
| `cloudflare-pages` / `edge` | ❌ | V8 isolate — no Node.js built-ins |
| `deno-deploy` | ❌ | Deno runtime, no native Node modules |

If you deploy to Cloudflare Workers or Deno Deploy, scanning must happen in a separate Node.js microservice that your edge function calls.

---

## Production Checklist

- [ ] File size limit is enforced both in the handler and via Nitro's `maxRequestBodySize`.
- [ ] `nuxt.config.ts` externalizes Pompelmi from the client bundle.
- [ ] Server routes are covered by CSRF protection (Nuxt's built-in CSRF headers or a plugin).
- [ ] Scan events are logged to your structured logging system.
- [ ] Test with EICAR test file in your CI/CD pipeline.

---

## Summary

Nuxt 3 / Nitro gives you a clean server-side environment where Pompelmi runs comfortably in-process. Whether you use the `createNextUploadHandler` adapter (fewest lines of code) or call `scanBytes` manually (most control), the result is the same: files are inspected before your application logic ever touches them.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: Building safe file uploads in Next.js App Router](/pompelmi/blog/nextjs-file-upload-security/)
- [Blog: Privacy-first upload security vs cloud scanning](/pompelmi/blog/privacy-first-vs-cloud-scanning/)
