---
title: Use Pompelmi in Nuxt/Nitro
description: Add upload malware scanning to a Nuxt 3 app with Nitro server.
---

This guide shows a concrete integration for **Nuxt 3 with Nitro**. You'll add a client upload component and a **Nitro API route** that accepts the file, validates it (size/MIME), forwards it to your **scan engine**, and returns a clear **CLEAN / MALICIOUS** verdict.

> Requires Node **18+**. Uses native `fetch`, `Blob`, and `FormData`—no extra HTTP client.

---

## 1) Install

```bash
pnpm add pompelmi
```

For the UI component (optional):

```bash
pnpm add @pompelmi/ui-react
```

---

## 2) Environment

Add your engine URL to `.env` (or use Nuxt's runtime config):

```env
POMPELMI_ENGINE_URL=https://your-engine.example
```

Or use local scanning with pompelmi:

```env
# Leave POMPELMI_ENGINE_URL empty to use local scanning
```

> With local scanning, pompelmi runs the scan directly in your Nitro server process. For remote scanning, it forwards to an external engine service.

---

## 3) Nitro API Route (server)

Create `server/api/scan.post.ts`:

```ts
// server/api/scan.post.ts
import { readFiles } from 'h3';
import { scanFile } from 'pompelmi';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Optional: tighten per your needs
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/zip',
  'text/plain',
]);

export default defineEventHandler(async (event) => {
  try {
    // Parse multipart form data
    const files = await readFiles(event, {
      includeFields: true,
    });

    const file = files.find((f) => f.name === 'file');
    if (!file) {
      throw createError({
        statusCode: 400,
        message: 'No file provided',
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 413,
        message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.has(file.type)) {
      throw createError({
        statusCode: 415,
        message: `Unsupported file type: ${file.type}`,
      });
    }

    // Write to temp file for scanning
    const tempPath = join(tmpdir(), `upload-${Date.now()}-${file.filename}`);
    
    try {
      await writeFile(tempPath, Buffer.from(await file.data.arrayBuffer()));

      // Scan the file
      const result = await scanFile(tempPath, {
        timeout: 30000, // 30 second timeout
      });

      return {
        verdict: result.verdict,
        cleanedFile: result.cleanedFile,
        reason: result.reason,
        metadata: {
          filename: file.filename,
          size: file.size,
          type: file.type,
        },
      };
    } finally {
      // Always cleanup temp file
      try {
        await unlink(tempPath);
      } catch (err) {
        console.error('[pompelmi] Failed to cleanup temp file:', tempPath, err);
      }
    }
  } catch (err: any) {
    console.error('[pompelmi] /api/scan error:', err);
    
    // Return error details
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Internal error while scanning',
    });
  }
});
```

**Notes:**

- The route uses `readFiles` from `h3` (Nitro's HTTP server) to handle multipart uploads
- Files are temporarily written to `tmpdir()` for scanning, then immediately deleted
- The `finally` block ensures cleanup even if scanning fails
- Adjust `ALLOWED_TYPES` based on your requirements

### Alternative: Remote Engine

If you want to forward to a remote engine instead of local scanning:

```ts
// server/api/scan.post.ts (remote engine version)
import { readFiles } from 'h3';

const ENGINE_URL = process.env.POMPELMI_ENGINE_URL || '';
const ACTION = ENGINE_URL ? `${ENGINE_URL}/scan` : '';

export default defineEventHandler(async (event) => {
  if (!ACTION) {
    throw createError({
      statusCode: 500,
      message: 'POMPELMI_ENGINE_URL not configured',
    });
  }

  try {
    const files = await readFiles(event);
    const file = files.find((f) => f.name === 'file');

    if (!file) {
      throw createError({
        statusCode: 400,
        message: 'No file provided',
      });
    }

    // Forward to remote engine
    const form = new FormData();
    const blob = new Blob([await file.data.arrayBuffer()], { type: file.type });
    form.append('file', blob, file.filename);

    const response = await fetch(ACTION, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Scan failed' }));
      throw createError({
        statusCode: response.status,
        message: error.error || 'Scan error',
      });
    }

    return await response.json();
  } catch (err: any) {
    console.error('[pompelmi] /api/scan error:', err);
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Internal error while scanning',
    });
  }
});
```

---

## 4) Client Component

Create a Vue component to handle uploads:

```vue
<!-- components/FileUpload.vue -->
<template>
  <div class="file-upload">
    <div class="upload-area">
      <input
        ref="fileInput"
        type="file"
        @change="handleFileSelect"
        :disabled="scanning"
      />
      <button @click="uploadFile" :disabled="!selectedFile || scanning">
        {{ scanning ? 'Scanning...' : 'Upload & Scan' }}
      </button>
    </div>

    <div v-if="result" class="result" :class="result.verdict">
      <h3>Scan Result: {{ result.verdict }}</h3>
      <p v-if="result.reason">Reason: {{ result.reason }}</p>
      <pre v-if="result.metadata">{{ JSON.stringify(result.metadata, null, 2) }}</pre>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const scanning = ref(false);
const result = ref<any>(null);
const error = ref<string | null>(null);

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] || null;
  result.value = null;
  error.value = null;
};

const uploadFile = async () => {
  if (!selectedFile.value) return;

  scanning.value = true;
  result.value = null;
  error.value = null;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);

    const response = await fetch('/api/scan', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Scan failed');
    }

    result.value = await response.json();
  } catch (err: any) {
    error.value = err.message || 'Error uploading file';
    console.error('[pompelmi] Upload error:', err);
  } finally {
    scanning.value = false;
  }
};
</script>

<style scoped>
.file-upload {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.upload-area {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background: #00DC82;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result {
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.result.CLEAN {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.result.SUSPICIOUS,
.result.MALICIOUS {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
}

.error {
  padding: 1rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  margin-top: 1rem;
}

pre {
  margin-top: 1rem;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
```

Then use it in your page:

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Malware Scanner</h1>
    <FileUpload />
  </div>
</template>
```

### Using @pompelmi/ui-react

If you prefer the pre-built React component, you'll need to set up Nuxt with React support or use the Vue component above.

---

## 5) Test the flow

1. **Upload a clean file** (e.g., a regular JPG) → expect **CLEAN**
2. **Test with EICAR** — Download the official EICAR test file from [eicar.org](https://www.eicar.org/) → expect **MALICIOUS**
3. **Check server logs** for any errors
4. **Inspect browser DevTools** → Network tab to see the `/api/scan` request/response

---

## 6) Production hardening (checklist)

- ✅ **MIME/extension allowlist** — Tighten `ALLOWED_TYPES` to your specific use case
- ✅ **Rate limiting** — Add rate limiting to prevent abuse (use Nitro plugins or middleware)
- ✅ **Authentication** — Protect the `/api/scan` endpoint with auth (session, JWT, API key)
- ✅ **File size limits** — Adjust `MAX_FILE_SIZE` based on your infrastructure
- ✅ **Monitoring** — Add logging and monitoring for scan results and errors
- ✅ **Reverse proxy** — Use Nginx/Cloudflare with additional body size limits
- ✅ **Temp file cleanup** — Ensure temp files are cleaned up even on process crashes (use a cleanup job)
- ✅ **Timeouts** — Configure appropriate scan timeouts for your use case

---

## 7) Deployment

### Supported Platforms

| Platform | Supported | Notes |
|----------|-----------|-------|
| **Vercel** | ✅ Yes | Use Node.js runtime (not Edge) |
| **Netlify** | ✅ Yes | Use Node.js functions |
| **AWS Lambda** | ✅ Yes | Ensure `/tmp` has write access |
| **Google Cloud Run** | ✅ Yes | Full Node.js support |
| **Azure App Service** | ✅ Yes | Full Node.js support |
| **Railway/Render** | ✅ Yes | Full Node.js support |
| **Cloudflare Workers** | ❌ No | No filesystem access |
| **Deno Deploy** | ❌ No | Different runtime |

### Vercel Example

Add to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  nitro: {
    preset: 'vercel',
  },
});
```

Deploy:

```bash
pnpm build
vercel deploy
```

### Environment Variables

Remember to set `POMPELMI_ENGINE_URL` in your deployment platform if using remote scanning.

---

## Troubleshooting

### Common Issues

**415 Unsupported content-type**
- Add the needed MIME type to `ALLOWED_TYPES`
- Or remove the MIME guard for testing

**413 File too large**
- Increase `MAX_FILE_SIZE` if needed
- Check reverse proxy limits (Nginx, Cloudflare)

**CORS errors**
- Not applicable since API route is same-origin
- If using separate frontend, add CORS headers to Nitro route

**Temp file errors**
- Ensure `os.tmpdir()` is writable: `node -p "require('os').tmpdir()"`
- Check disk space on server

**Scan timeouts**
- Increase the timeout in `scanFile()` options
- For large files, consider async processing with queues

**Engine 5xx / connection errors** (remote engine)
- Verify `POMPELMI_ENGINE_URL` is correct and reachable
- Check engine service logs
- Add retry logic with exponential backoff

---

## Advanced: Custom Scan Configuration

```ts
// server/api/scan.post.ts
import { scanFile, createScanner } from 'pompelmi';

// Create custom scanner instance
const scanner = createScanner({
  engines: ['yara', 'clamav'], // specify engines
  yaraRules: './custom-rules/', // custom YARA rules path
});

export default defineEventHandler(async (event) => {
  // ... file handling ...
  
  const result = await scanner.scanFile(tempPath, {
    timeout: 30000,
    extractArchives: true, // scan inside ZIP files
    maxDepth: 3, // archive nesting depth
  });
  
  // ... return result ...
});
```

---

## Alternative: Using @pompelmi/next-upload

While `@pompelmi/next-upload` is designed for Next.js, you can adapt similar patterns for Nuxt. The core concepts (multipart handling, temp files, scanning) remain the same.

---

## Full Example

Check out the complete working example in the pompelmi repository:

```bash
git clone https://github.com/pompelmi/pompelmi.git
cd pompelmi/examples/nuxt-nitro
pnpm install && pnpm dev
```

This example includes:
- Full Vue 3 + Nuxt 3 implementation
- Production-ready error handling
- Comprehensive documentation
- Testing examples

---

## Next Steps

- Explore [YARA integration](/pompelmi/detection/yara/getting-started) for custom malware signatures
- Learn about [presets and reason codes](/pompelmi/reference/presets) for detailed scan results
- Check out [security best practices](/pompelmi/guides/security) for production deployments
- Join our [Discord community](https://discord.gg/pompelmi) for support

---

## Need Help?

- 📖 [Documentation](https://pompelmi.dev)
- 💬 [Discord Community](https://discord.gg/pompelmi)
- 🐛 [Report Issues](https://github.com/pompelmi/pompelmi/issues)
- 💼 [Enterprise Support](https://pompelmi.dev/enterprise)
