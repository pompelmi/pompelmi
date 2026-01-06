

# @pompelmi/next-upload

Guard your Next.js (App Router) upload route with **pompelmi** — a local-first, no-cloud pre-quarantine that checks files *before* they touch your app logic or storage.

> Privacy-first: no outbound calls. Scans run in-process.

---

## Install

```bash
npm i pompelmi
# or: pnpm add pompelmi
# or: yarn add pompelmi
```

## 60-second Quickstart (TypeScript, App Router)

```ts
// app/api/upload/route.ts
import { createNextUploadHandler } from "@pompelmi/next-upload";
import { CommonHeuristicsScanner, createZipBombGuard, composeScanners } from "pompelmi";

// Ensure Node runtime for multipart & Node APIs
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // required for streaming/multipart in some setups

const policy = {
  includeExtensions: ["zip", "png", "jpg", "jpeg", "pdf", "txt"],
  allowedMimeTypes: [
    "application/zip",
    "image/png",
    "image/jpeg",
    "application/pdf",
    "text/plain",
  ],
  maxFileSizeBytes: 20 * 1024 * 1024, // 20MB
  failClosed: true,
};

const scanner = composeScanners(
  [
    [
      "zipGuard",
      createZipBombGuard({
        maxEntries: 512,
        maxTotalUncompressedBytes: 100 * 1024 * 1024,
        maxCompressionRatio: 12,
      }),
    ],
    ["heuristics", CommonHeuristicsScanner],
  ],
  { stopOn: "suspicious" }
);

export const POST = createNextUploadHandler({ ...policy, scanner });
```

### Try it quickly

Run `next dev` and in another terminal:

```bash
# Clean file
curl -F file=@README.md http://localhost:3000/api/upload | jq

# EICAR test (if present in your repo)
# curl -F file=@tests/samples/eicar.zip http://localhost:3000/api/upload | jq
```

You’ll receive JSON containing a per-file decision plus notes from scanners.

---

## API (brief)

### `createNextUploadHandler(options)`
Returns a **Next.js App Router** `POST` handler that:
- Parses `multipart/form-data` from the incoming `Request`
- Runs the configured scanners
- **Blocks** on policy violations (size/type/zip bomb/etc.) with proper HTTP status
- Responds with JSON containing the scan result

**Options** (forwarded to core + a few Next specifics):
- `allowedMimeTypes: string[]`
- `includeExtensions: string[]`
- `maxFileSizeBytes: number`
- `failClosed: boolean` — if `true`, unexpected errors result in a block
- `scanner: Scanner` — from `composeScanners([...])`
- `mapErrorToStatus?: (reason) => number` — customize HTTP codes

> Core option details live in the main docs: https://pompelmi.github.io/pompelmi/#configuration

### Default status mapping

- **413** – file too large
- **415** – unsupported/blocked MIME type or extension
- **422** – suspicious content (heuristics/YARA/zip guard)

---

## Troubleshooting
- **Edge runtime errors** – this package assumes Node APIs; set `export const runtime = "nodejs"` in your route file.
- **Empty `FormData`** – ensure you’re sending `multipart/form-data` correctly (`curl -F`), and the request isn’t being body-parsed upstream.
- **Everything blocked** – set `failClosed: false` temporarily and inspect the returned JSON body for reasons.
- **ZIPs always suspicious** – relax Zip Guard (`maxEntries` / `maxCompressionRatio`).

---

## See also
- Core library: `pompelmi`
- Express middleware: `@pompelmi/express-middleware`
- Koa middleware: `@pompelmi/koa-middleware`

---

## License
MIT