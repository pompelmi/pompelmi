# Nuxt/Nitro Integration

This guide shows how to integrate **pompelmi** malware scanning into your Nuxt applications.

## Overview

Nuxt uses [Nitro](https://nitro.unjs.io/) as its server engine, which can run on various platforms including Node.js, serverless functions, and edge runtimes. When integrating pompelmi, you have two main approaches:

### 1. Cloud API (Serverless-Friendly)

Use an external scanning API to check uploaded files. This approach works across all Nitro runtimes including edge deployments:

- Receive the file upload in your Nitro API route
- Forward the file bytes to your cloud scanning endpoint
- Return the verdict to the client

**Pros:** Works on all runtimes (Node, serverless, edge)  
**Cons:** Requires external service, introduces latency, ongoing costs

### 2. Local Library (Node Runtime)

Use pompelmi's local scanning capabilities directly in your API routes:

- Receive the file upload
- Write to a temporary file
- Scan using `scanFile()`
- Clean up temporary files
- Return verdict

**Pros:** No external dependencies, fast, works offline  
**Cons:** Requires Node.js runtime (not compatible with edge runtimes)

This guide focuses on **approach #2** (local library) as it's the most common use case and leverages pompelmi's full capabilities.

## Runtime Considerations

Nitro can deploy to various platforms:
- **Node.js server** ✅ Full pompelmi support
- **Serverless functions** (AWS Lambda, Cloudflare Workers with Node compat) ✅ Supported with filesystem access
- **Edge runtimes** (Cloudflare Workers, Vercel Edge) ❌ Not supported (no filesystem/native modules)

For edge deployments, use the cloud API approach instead.

## Installation

```bash
npm install pompelmi
# or
pnpm add pompelmi
# or
yarn add pompelmi
```

## Basic Implementation

Create a Nitro API route to handle file uploads and scanning:

### API Route: `server/api/scan.post.ts`

```typescript
import { readMultipartFormData } from 'h3'
import { scanFile } from 'pompelmi'
import { writeFile, rm, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

// Maximum file size: 25 MB (adjust based on your needs)
const MAX_FILE_SIZE = 25 * 1024 * 1024

export default defineEventHandler(async (event) => {
  let tempDir: string | null = null
  
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    
    if (!formData) {
      throw createError({
        statusCode: 400,
        message: 'No file uploaded'
      })
    }

    // Find the file field
    const fileField = formData.find(field => field.name === 'file')
    
    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        message: 'File field is required'
      })
    }

    // Enforce file size limit
    if (fileField.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 413,
        message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB`
      })
    }

    // Create unique temp directory
    tempDir = join(tmpdir(), `pompelmi-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(tempDir, { recursive: true })

    // Write uploaded file to temp location
    const tempFilePath = join(tempDir, fileField.filename || 'upload')
    await writeFile(tempFilePath, fileField.data)

    // Scan the file
    const scanResult = await scanFile(tempFilePath)

    // Return verdict and full scan result
    return {
      ok: true,
      verdict: scanResult.verdict,
      scan: scanResult
    }

  } catch (error: any) {
    console.error('Scan error:', error)
    
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    // Generic error response (don't leak internal paths)
    throw createError({
      statusCode: 500,
      message: 'Internal server error during file scan'
    })
    
  } finally {
    // Always clean up temp files
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.error('Failed to clean up temp directory:', cleanupError)
      }
    }
  }
})
```

## Understanding Verdict Values

pompelmi returns one of three verdict values:

- **`"clean"`** - No threats detected
- **`"suspicious"`** - Potential threat indicators found
- **`"malicious"`** - Confirmed malware detected

You can use these verdicts to make decisions:

```typescript
if (scanResult.verdict === 'malicious') {
  // Block file, alert admin, etc.
}

if (scanResult.verdict === 'suspicious') {
  // Quarantine for manual review
}

if (scanResult.verdict === 'clean') {
  // Allow file processing
}
```

## Security & Production Notes

### File Size Limits

Always enforce maximum file size to prevent DoS attacks and resource exhaustion:

```typescript
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB recommended
```

Adjust based on your use case, but keep it reasonable. Larger files take longer to scan and consume more memory.

### Content-Type Validation

Consider validating file types based on your requirements:

```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']

if (fileField.type && !allowedTypes.includes(fileField.type)) {
  throw createError({
    statusCode: 415,
    message: 'Unsupported file type'
  })
}
```

**Important:** Content-Type headers can be spoofed. pompelmi performs internal magic byte detection to identify true file types. Don't rely solely on client-provided MIME types for security decisions.

### Timeouts

Set appropriate timeouts for scan operations:

```typescript
// In nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    routeRules: {
      '/api/scan': {
        timeout: 30000 // 30 seconds
      }
    }
  }
})
```

### Concurrency & Rate Limiting

Limit concurrent uploads to prevent resource exhaustion:

- Use a rate limiter (e.g., `nuxt-rate-limit`)
- Configure max body size in your reverse proxy (nginx, Cloudflare)
- Monitor server resources

### Temp File Cleanup

Always use `finally` blocks to ensure temp files are removed even if errors occur:

```typescript
try {
  // ... scanning logic
} finally {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
}
```

### Logging

- **DO** log verdicts, file sizes, scan durations
- **DO NOT** log raw file contents or full paths (potential info leak)
- **DO** sanitize filenames before logging (avoid log injection)

```typescript
console.log(`Scan completed: verdict=${scanResult.verdict}, size=${fileField.data.length}`)
```

## Frontend Example

Simple Vue component for file uploads:

```vue
<template>
  <div>
    <h1>File Scanner</h1>
    
    <form @submit.prevent="handleSubmit">
      <input
        type="file"
        ref="fileInput"
        @change="handleFileChange"
        :disabled="loading"
      />
      <button type="submit" :disabled="!file || loading">
        {{ loading ? 'Scanning...' : 'Scan File' }}
      </button>
    </form>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="result" class="result">
      <h2>Scan Result</h2>
      <pre>{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const file = ref<File | null>(null)
const loading = ref(false)
const result = ref(null)
const error = ref('')

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] || null
  result.value = null
  error.value = ''
}

async function handleSubmit() {
  if (!file.value) return

  loading.value = true
  error.value = ''
  result.value = null

  try {
    const formData = new FormData()
    formData.append('file', file.value)

    const response = await fetch('/api/scan', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    result.value = await response.json()
  } catch (err: any) {
    error.value = err.message || 'Failed to scan file'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.error {
  color: red;
  margin: 1rem 0;
}

.result {
  margin: 1rem 0;
}

pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
}
</style>
```

## Testing

### Using curl

Test your API endpoint with curl:

```bash
# Scan a local file
curl -X POST http://localhost:3000/api/scan \
  -F "file=@./package.json"

# Expected response:
# {
#   "ok": true,
#   "verdict": "clean",
#   "scan": {
#     "verdict": "clean",
#     "duration": 45,
#     "engines": { ... }
#   }
# }
```

### Using Postman/Insomnia

1. Create a POST request to `http://localhost:3000/api/scan`
2. Set body type to `multipart/form-data`
3. Add a field named `file` and select a file
4. Send request and verify JSON response

## Advanced Configuration

### Custom Scan Options

Pass options to pompelmi for fine-tuned control:

```typescript
import { scanFile, type ScanOptions } from 'pompelmi'

const options: ScanOptions = {
  engines: ['yara', 'clamav'],  // Specify engines
  maxDepth: 3,                   // Archive extraction depth
  timeout: 20000                 // Per-file timeout
}

const scanResult = await scanFile(tempFilePath, options)
```

### Environment-Based Configuration

Use runtime config for environment-specific settings:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    scanMaxFileSize: 25 * 1024 * 1024,
    scanTimeout: 30000,
  }
})

// server/api/scan.post.ts
const config = useRuntimeConfig()
const MAX_FILE_SIZE = config.scanMaxFileSize
```

## Deployment Checklist

Before deploying to production:

- ✅ Enforce file size limits
- ✅ Validate file types (if applicable)
- ✅ Set appropriate timeouts
- ✅ Implement rate limiting
- ✅ Configure error monitoring (Sentry, etc.)
- ✅ Test temp file cleanup under error conditions
- ✅ Verify pompelmi engines are properly installed
- ✅ Set up logging and monitoring
- ✅ Document deployment requirements (Node.js version, etc.)

## Example Project

See [examples/nuxt-nitro](../../examples/nuxt-nitro/) for a complete working example.

## Troubleshooting

### "No matching engine found"

Ensure pompelmi engines are installed. Install dependencies:

```bash
npm install pompelmi
```

### "ENOENT: no such file or directory"

Verify temp file paths are correct and cleanup isn't happening too early. Check the `finally` block logic.

### "File too large" errors

Adjust `MAX_FILE_SIZE` constant and ensure your reverse proxy/CDN allows the size:

```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
```

### Performance issues

- Enable concurrent scanning with worker threads (advanced)
- Use a queue system for async processing
- Scale horizontally with load balancers
- Cache scan results for known file hashes

## Resources

- [pompelmi Documentation](https://pompelmi.dev)
- [Nitro Documentation](https://nitro.unjs.io/)
- [Nuxt Server Routes](https://nuxt.com/docs/guide/directory-structure/server)
- [h3 (HTTP Framework)](https://github.com/unjs/h3)
