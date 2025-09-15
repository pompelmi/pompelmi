

# @pompelmi/express-middleware

Guard your Express upload routes with **pompelmi** — a local-first, no-cloud file pre‑quarantine that checks uploads *before* they touch your app logic or storage.

> Privacy-first: no outbound calls. Scans run in-process.

---

## Install

```bash
npm i pompelmi express multer
# or: pnpm add pompelmi express multer
# or: yarn add pompelmi express multer
```

## 60‑second Quickstart (TypeScript)

```ts
import express from "express";
import multer from "multer";
import { createUploadGuard } from "@pompelmi/express-middleware";
import {
  CommonHeuristicsScanner,
  createZipBombGuard,
  composeScanners,
} from "pompelmi";

// Policy (tweak to your needs)
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
  failClosed: true, // block on scanner/parse errors
};

// Compose scanners (stop as soon as something becomes suspicious)
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

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: policy.maxFileSizeBytes },
});

// Protect your upload route(s)
app.post(
  "/upload",
  upload.any(),
  createUploadGuard({ ...policy, scanner }),
  (req, res) => {
    // The guard attaches the scan result to the request
    const scan = (req as any).pompelmi ?? null;
    res.json({ ok: true, scan });
  }
);

app.listen(3000, () => console.log("Listening on http://localhost:3000"));
```

### Try it quickly

Run the server and in another terminal:

```bash
# Clean file
curl -F file=@README.md http://localhost:3000/upload | jq

# EICAR test (if you have it) – this should be flagged as suspicious/malicious
# Replace with your own path; the repo often ships a sample under tests/samples/
# curl -F file=@tests/samples/eicar.zip http://localhost:3000/upload | jq
```

You’ll receive JSON containing a per‑file decision plus any notes from scanners.

---

## API

### `createUploadGuard(options)`
Returns an **Express middleware** `(req, res, next)` that:
- Parses the files already loaded by `multer` (buffer/stream)
- Runs the configured scanners
- **Blocks** the request on policy violations (size/type/zip bomb/etc.)
- Attaches the full scan result to `req.pompelmi`

**Options** (forwarded to core + a few middleware specifics):
- `allowedMimeTypes: string[]`
- `includeExtensions: string[]`
- `maxFileSizeBytes: number`
- `failClosed: boolean` — if `true`, unexpected errors result in a block
- `scanner: Scanner` — from `composeScanners([...])`
- `mapErrorToStatus?: (reason) => number` — customize HTTP codes

> Core option details live in the main docs: https://pompelmi.github.io/pompelmi/#configuration

### Error handling & status codes
By default the middleware maps common cases to HTTP errors:
- **413** – file too large
- **415** – unsupported/blocked MIME type or extension
- **422** – suspicious content (heuristics/YARA/zip guard)

Override via `mapErrorToStatus` to fit your API contract.

### Accessing the scan result
```ts
app.post("/upload", upload.single("file"), createUploadGuard({ ...policy, scanner }), (req, res) => {
  const scan = (req as any).pompelmi; // { files: [...], summary: {...} }
  // Log, metrics, auditing, etc.
  res.json({ ok: true, scan });
});
```

---

## Patterns

**Multiple fields**
```ts
app.post("/avatar", upload.single("avatar"), createUploadGuard({ ...policy, scanner }), handler)
app.post("/docs", upload.array("docs", 8), createUploadGuard({ ...policy, scanner }), handler)
```

**Deny‑list a hot type** (e.g., block scripts entirely):
```ts
const policy = {
  ...base,
  allowedMimeTypes: base.allowedMimeTypes.filter((m) => !m.startsWith("text/javascript")),
};
```

---

## Troubleshooting
- **`PayloadTooLargeError` from multer** – increase `limits.fileSize` *and* `maxFileSizeBytes` consistently.
- **Everything gets blocked** – set `failClosed: false` temporarily and inspect `req.pompelmi` in logs.
- **ZIPs always suspicious** – relax `maxEntries` / `maxCompressionRatio` in `createZipBombGuard`.

---

## Typings
This package ships TypeScript types. The middleware augments `Request` at runtime via `req.pompelmi` (typed as `any` in the example; feel free to define your own interface extension in your codebase).

---

## See also
- Core library: `pompelmi`
- Koa middleware: `@pompelmi/koa-middleware`
- Next.js handler (App Router): `@pompelmi/next-upload`

---

## License
MIT