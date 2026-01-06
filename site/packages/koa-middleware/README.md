

# @pompelmi/koa-middleware

Guard your Koa upload routes with **pompelmi** — a local‑first, no‑cloud pre‑quarantine that checks files *before* they reach your app logic or storage.

> Privacy‑first: no outbound calls. Scans run in‑process.

---

## Install

```bash
npm i pompelmi koa @koa/router @koa/multer
# or: pnpm add pompelmi koa @koa/router @koa/multer
# or: yarn add pompelmi koa @koa/router @koa/multer
```

## 60‑second Quickstart (TypeScript)

```ts
import Koa from "koa";
import Router from "@koa/router";
import multer from "@koa/multer";
import { createKoaUploadGuard } from "@pompelmi/koa-middleware";
import { CommonHeuristicsScanner, createZipBombGuard, composeScanners } from "pompelmi";

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

const app = new Koa();
const router = new Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: policy.maxFileSizeBytes },
});

router.post(
  "/upload",
  upload.any(),
  createKoaUploadGuard({ ...policy, scanner }),
  (ctx) => {
    const scan = (ctx as any).pompelmi ?? null;
    ctx.body = { ok: true, scan };
  }
);

app.use(router.routes()).use(router.allowedMethods());
app.listen(3003, () => console.log("http://localhost:3003"));
```

### Try it quickly

Run the server and in another terminal:

```bash
# Clean file
curl -F file=@README.md http://localhost:3003/upload | jq

# EICAR test (if present in your repo)
# curl -F file=@tests/samples/eicar.zip http://localhost:3003/upload | jq
```

You’ll receive JSON containing a per‑file decision plus notes from scanners.

---

## API (brief)

### `createKoaUploadGuard(options)`
Returns a **Koa middleware** that:
- Reads files from `@koa/multer` buffers/streams
- Runs the configured scanners
- **Blocks** on policy violations (size/type/zip bomb/etc.)
- Attaches the full scan result to `ctx.pompelmi`

**Options** (forwarded to core + a few Koa specifics):
- `allowedMimeTypes: string[]`
- `includeExtensions: string[]`
- `maxFileSizeBytes: number`
- `failClosed: boolean` — if `true`, unexpected errors result in a block
- `scanner: Scanner` — from `composeScanners([...])`
- `mapErrorToStatus?: (reason) => number` — customize HTTP codes used in your handler

> Core option details live in the main docs: https://pompelmi.github.io/pompelmi/#configuration

### Common statuses to return

- **413** – file too large
- **415** – unsupported/blocked MIME type or extension
- **422** – suspicious content (heuristics/YARA/zip guard)

---

## Troubleshooting
- **Everything gets blocked** – set `failClosed: false` temporarily and inspect `ctx.pompelmi` in logs.
- **`LIMIT_FILE_SIZE` from multer** – increase both `limits.fileSize` and `maxFileSizeBytes`.
- **ZIPs always suspicious** – relax Zip Guard (`maxEntries` / `maxCompressionRatio`).

---

## See also
- Core library: `pompelmi`
- Express middleware: `@pompelmi/express-middleware`
- Next.js handler (App Router): `@pompelmi/next-upload`

---

## License
MIT