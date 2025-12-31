# Nuxt/Nitro Example - pompelmi File Scanner

This example demonstrates how to integrate **pompelmi** malware scanning into a Nuxt application.

## Features

- ✅ File upload via multipart/form-data
- ✅ Temporary file handling with automatic cleanup
- ✅ Malware scanning with `scanFile()`
- ✅ Real-time verdict display (`clean`, `suspicious`, `malicious`)
- ✅ Full scan result details
- ✅ Error handling and user feedback
- ✅ File size enforcement (25 MB default)

## Prerequisites

- Node.js 18+ (required for pompelmi local scanning)
- pnpm (or npm/yarn)

## Installation

From this directory:

```bash
pnpm install
```

## Running the Example

Start the development server:

```bash
pnpm dev
```

The app will be available at http://localhost:3000

## Usage

### Via Browser

1. Open http://localhost:3000 in your browser
2. Click "Choose a file..." and select any file
3. Click "Scan File"
4. View the verdict and full scan details

### Via curl

Test the API endpoint directly:

```bash
# Scan a file
curl -X POST http://localhost:3000/api/scan \
  -F "file=@./package.json"

# Expected response:
# {
#   "ok": true,
#   "verdict": "clean",
#   "scan": {
#     "verdict": "clean",
#     "duration": 42,
#     "engines": { ... }
#   }
# }
```

### Test with Different Files

```bash
# Clean file
curl -X POST http://localhost:3000/api/scan -F "file=@./README.md"

# Large file (will be rejected if > 25MB)
curl -X POST http://localhost:3000/api/scan -F "file=@/path/to/large/file.zip"

# Missing file (400 error)
curl -X POST http://localhost:3000/api/scan
```

## How It Works

### 1. File Upload (Frontend)

The [app.vue](./app.vue) component provides a simple file upload interface:
- User selects a file
- On submit, creates FormData and POSTs to `/api/scan`
- Displays loading state, errors, and results

### 2. API Route (Backend)

The [server/api/scan.post.ts](./server/api/scan.post.ts) route handles the scanning:
1. Parses multipart form data using `readMultipartFormData(event)`
2. Validates file presence and size (rejects > 25 MB)
3. Creates unique temp directory in `os.tmpdir()`
4. Writes uploaded buffer to temp file
5. Calls `scanFile(tempPath)` from pompelmi
6. Returns JSON with verdict and full scan result
7. Cleans up temp directory in `finally` block (guaranteed)

### 3. Verdict Values

pompelmi returns one of three verdicts:
- **`clean`** - No threats detected
- **`suspicious`** - Potential threat indicators
- **`malicious`** - Confirmed malware

## Configuration

### File Size Limit

Adjust the maximum file size in [server/api/scan.post.ts](./server/api/scan.post.ts):

```typescript
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
```

### Scan Timeout

Configure the route timeout in [nuxt.config.ts](./nuxt.config.ts):

```typescript
nitro: {
  routeRules: {
    '/api/scan': {
      timeout: 30000 // 30 seconds
    }
  }
}
```

## Runtime Requirements

This example uses pompelmi's local scanning capabilities, which require:
- **Node.js runtime** (not edge/serverless without filesystem)
- Write access to `os.tmpdir()` for temporary files
- Sufficient memory for file scanning

If deploying to serverless/edge environments without Node.js, consider using a cloud scanning API instead (see [integration guide](../../docs/integrations/nuxt-nitro.md)).

## Production Considerations

Before deploying to production:

1. **Rate Limiting** - Add rate limiting to prevent abuse
2. **Authentication** - Protect the endpoint with auth if needed
3. **File Type Validation** - Restrict allowed file types based on your use case
4. **Error Monitoring** - Set up Sentry or similar for error tracking
5. **Logging** - Log verdicts and metrics (don't log file contents)
6. **Resource Limits** - Monitor CPU/memory usage under load
7. **Timeouts** - Ensure proper timeout configuration
8. **Cleanup Verification** - Test that temp files are always removed

## Troubleshooting

### "No file uploaded" Error

Ensure the field name is `file`:
```bash
curl -X POST http://localhost:3000/api/scan -F "file=@./myfile.txt"
#                                                ^^^^
```

### "File too large" Error

The default limit is 25 MB. Adjust `MAX_FILE_SIZE` constant or use smaller files.

### Port Already in Use

Change the dev server port:
```bash
PORT=3001 pnpm dev
```

### Module Not Found Errors

Ensure dependencies are installed:
```bash
pnpm install
```

## Learn More

- [Full Integration Guide](../../docs/integrations/nuxt-nitro.md)
- [pompelmi Documentation](https://pompelmi.dev)
- [Nuxt Documentation](https://nuxt.com)
- [Nitro Documentation](https://nitro.unjs.io)

## License

See [LICENSE](../../LICENSE) in repository root.
