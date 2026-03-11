---
title: "17 Common File Upload Security Mistakes in Node.js Applications"
description: "A practical catalog of the most frequent file upload security mistakes Node.js developers make — and how to close each gap using Pompelmi's upload guard."
pubDate: 2024-12-01
author: "Pompelmi Team"
tags: ["security", "nodejs", "mistakes", "best-practices", "tutorial"]
---

# 17 Common File Upload Security Mistakes in Node.js Applications

Upload security is one of those areas where the obvious implementation is also the vulnerable one. These mistakes appear in production code regularly. Some lead to trivial exploits; others enable server-side execution or data exfiltration. Let's catalog them.

---

## 1. Writing Files to Disk Before Scanning

```typescript
// 🚫 Wrong: file is on disk before any validation
const upload = multer({ dest: '/tmp/uploads' });
app.post('/upload', upload.single('file'), virusScan, moveToStorage);
```

If the scanner runs after disk write, an attacker can race it, or if the scanner crashes, the unscanned file stays on disk.

```typescript
// ✅ Fixed: memory storage — file never touches disk until deemed clean
const upload = multer({ storage: multer.memoryStorage() });
```

Pompelmi's in-memory express guard plugs in after memory-based upload:

```typescript
import { createUploadGuard } from '@pompelmi/express-middleware';
const guard = createUploadGuard({ failClosed: true });
app.post('/upload', upload.single('file'), guard, storeFile);
```

---

## 2. Trusting the `Content-Type` Header

```typescript
// 🚫 Wrong: client-controlled header determines allow/deny
if (req.file.mimetype === 'image/jpeg') {
  acceptFile();  // attacker sends Content-Type: image/jpeg with a .php payload
}
```

The MIME type in a multipart upload is whatever the client says it is. It is not authoritative.

```typescript
// ✅ Fixed: Pompelmi reads magic bytes and checks content, not headers
const guard = createUploadGuard({
  includeExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  // magic-byte-level content inspection happens automatically
});
```

---

## 3. Relying on Extension Checks Alone

```typescript
// 🚫 Wrong: trivially bypassed with exploit.php.jpg
const allowed = ['.jpg', '.png', '.pdf'];
const ext = path.extname(req.file.originalname);
if (!allowed.includes(ext)) throw new Error('Not allowed');
```

File extensions are cosmetic on most operating systems. A .jpg file can execute in certain server configurations, and double extensions (`shell.php.jpg`) exploit misconfigured servers.

**Fix**: Use Pompelmi's `includeExtensions` combined with magic byte inspection. Extension checking is a useful first filter but should never be the only control.

---

## 4. No File Size Limit

```typescript
// 🚫 Wrong: no limits — service can be OOM-killed on upload
app.use(express.json({ limit: '50mb' }));  // This doesn't apply to form uploads
```

Multer allows unlimited file size by default. A 4 GB upload can exhaust memory.

```typescript
// ✅ Fixed: enforce at both the parser and the guard
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },  // 25 MB hard cap at parser
});

const guard = createUploadGuard({
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB business logic cap
});
```

---

## 5. Missing ZIP Bomb Protection

```typescript
// 🚫 Wrong: accepting ZIP files with no decompression safety
const guard = createUploadGuard({
  includeExtensions: ['zip', 'docx', 'xlsx'],  // DOCX/XLSX are ZIP containers too
});
```

A 1 KB `.zip` can decompress to 46 GB (PKZIP quine). DOCX and XLSX are ZIP containers — same risk. Any scanner that tries to inspect archive contents without limits will exhaust memory.

```typescript
// ✅ Fixed: ZIP bomb guard with safe defaults
import { createZipBombGuard, composeScanners, CommonHeuristicsScanner } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 1000,
      maxTotalUncompressedBytes: 100 * 1024 * 1024,
      maxCompressionRatio: 100,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious' }
);
```

---

## 6. `failClosed: false` in Production

```typescript
// 🚫 Wrong: scanner errors silently pass through
const guard = createUploadGuard({
  failClosed: false,  // default in some configurations
});
```

When `failClosed` is `false`, any scanner exception (memory pressure, dependency missing, timeout) becomes an implicit allow. An attacker who can trigger scanner errors has effectively bypassed upload security.

```typescript
// ✅ Fixed: always fail closed
const guard = createUploadGuard({
  failClosed: true,
});
```

---

## 7. Using `stopOn: 'malicious'` Without Handling `suspicious`

```typescript
// 🚫 Wrong: suspicious verdict is silently accepted
const guard = createUploadGuard({
  stopOn: 'malicious',
  // suspicious files proceed to storage as if clean
});

app.post('/upload', upload.single('file'), guard, async (req, res) => {
  const file = req.file;
  await storage.save(file); // might be suspicious, but no one knows
});
```

`suspicious` often indicates a file that doesn't look right but doesn't match known malware signatures. Many real attacks are `suspicious` before they're `malicious`.

```typescript
// ✅ Fixed: inspect the verdict and handle accordingly
app.post('/upload', upload.single('file'), guard, async (req, res) => {
  const { verdict } = (req as any).pompelmi;

  if (verdict === 'suspicious') {
    await quarantine(req.file, req.user.id);
    return res.status(202).json({ status: 'pending_review' });
  }

  await storage.save(req.file);
  res.json({ ok: true });
});
```

---

## 8. Not Rate Limiting Upload Endpoints

```typescript
// 🚫 Wrong: open upload endpoint with no rate limit
app.post('/upload', upload.single('file'), guard, handler);
```

Without rate limiting, an attacker can flood the scanner with large files to exhaust CPU and memory, or probe allowed file types rapidly.

```typescript
// ✅ Fixed: apply rate limiting before the upload parser
import rateLimit from 'express-rate-limit';

const uploadLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 uploads per minute per IP
  message: 'Upload rate limit exceeded',
});

app.post('/upload', uploadLimit, authenticate, upload.single('file'), guard, handler);
```

---

## 9. Logging File Content in Error Handlers

```typescript
// 🚫 Wrong: file content ends up in log files
app.use((err, req, res, next) => {
  logger.error({ err, file: req.file });  // req.file.buffer is the raw bytes
});
```

Log pipelines are often indexed, replicated, and retained indefinitely. File content should never reach them.

```typescript
// ✅ Fixed: log metadata, not content
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    err: err.message,
    file: req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,  // consider hashing in sensitive contexts
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : undefined,
  });
  res.status(500).json({ error: 'Upload failed' });
});
```

---

## 10. Serving Uploaded Files from the Same Origin

```typescript
// 🚫 Wrong: serving user-uploaded files from app.example.com
app.use('/uploads', express.static('/data/uploads'));
```

An uploaded SVG with `<script>` tags served from your origin executes with your site's origin — CSP, session cookies, and all.

**Fix**: Serve user-uploaded content from a separate, cookieless domain (e.g., `cdn.example-uploads.com`) with `Content-Disposition: attachment` and restrictive `Content-Security-Policy` headers. Even for image files.

---

## 11. Missing Authentication Before the Upload Parser

```typescript
// 🚫 Wrong: multer runs before authentication
app.post('/upload', upload.single('file'), authenticate, guard, handler);
```

The file is parsed and buffered into memory before you know if the user is allowed to upload. An unauthenticated attacker can still exhaust your memory budget.

```typescript
// ✅ Fixed: authenticate first — abort before reading the body
app.post('/upload', authenticate, authorize, upload.single('file'), guard, handler);
```

---

## 12. No Filename Sanitization Before Storage

```typescript
// 🚫 Wrong: using originalname directly
fs.writeFileSync(`/data/uploads/${req.file.originalname}`, req.file.buffer);
// attacker submits: ../../../etc/cron.d/backdoor
```

Path traversal via filenames. Always generate your own storage key.

```typescript
// ✅ Fixed: generate a random UUID for storage, store original name separately
import { randomUUID } from 'crypto';

const storageKey = `${randomUUID()}-${Date.now()}`;
await storage.save(storageKey, req.file.buffer);
await db.files.create({
  id: storageKey,
  originalName: req.file.originalname,  // stored in DB, never used as filesystem path
  userId: req.user.id,
});
```

---

## 13. Accepting Any MIME Type Without an Allowlist

```typescript
// 🚫 Wrong: testing for not-disallowed instead of allowed
const excludedTypes = ['text/html', 'application/javascript'];
if (excludedTypes.includes(req.file.mimetype)) {
  return res.status(400).send('Not allowed');
}
// attacker submits: application/octet-stream (content is a PE executable)
```

Exclusion lists grow stale. Use inclusion lists.

```typescript
// ✅ Fixed: explicit extension inclusion list
const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
});
```

---

## 14. Not Enforcing Scan Timeouts

In some environments, the scanner can stall (malformed file, resource contention). Without a timeout, your upload handler hangs indefinitely.

```typescript
// ✅ Fixed: per-scanner timeouts
const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({ ... })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { timeoutMsPerScanner: 5000 }
);
```

---

## 15. Ignoring Multi-File Upload Vectors

```typescript
// 🚫 Wrong: only guarding single-file uploads
app.post('/upload', upload.single('file'), guard, handler);
// but also exposes:
app.post('/bulk-upload', upload.array('files'), handler); // unguarded!
```

Every upload endpoint — including batch endpoints and administrative paths — needs the same guard. Create a shared guard factory to ensure consistency.

```typescript
// ✅ Fixed: shared guard factory
function createStandardGuard() {
  return createUploadGuard({
    includeExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSizeBytes: 10 * 1024 * 1024,
    stopOn: 'suspicious',
    failClosed: true,
    scanner,
  });
}

app.post('/upload', upload.single('file'), createStandardGuard(), handler);
app.post('/bulk-upload', upload.array('files', 10), createStandardGuard(), bulkHandler);
```

---

## 16. Not Scanning Archives Recursively

Plain heuristic scanning may pass a ZIP that contains a malicious payload nested two levels deep. Combine outer ZIP bomb protection with content inspection of known archive formats.

Pompelmi's `createZipBombGuard` checks for decompression bombs at the container level. For recursive content scanning, combine with YARA rules that target specific payload signatures inside archives.

---

## 17. No Canary Testing for the Scanner

Deploying "scanner is active" without periodically verifying it still works is a common oversight. A misconfiguration or dependency change can silently disable scanning.

```typescript
// ✅ Fixed: health check endpoint verifies scanner is functional
import { scanBytes } from 'pompelmi';

// Build the EICAR test string at runtime — never store the literal in source
// See: https://www.eicar.org/download-anti-malware-testfile/
const EICAR_BYTES = Buffer.from(
  'WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELU' +
  'FOVElWSVJVUy1URVNULUZJTEUHISRIVCRIOQ==',
  'base64'
);

app.get('/health/scanner', async (req, res) => {
  const result = await scanBytes(EICAR_BYTES);
  const ok = result.verdict !== 'clean'; // should detect EICAR via ClamAV engine
  res.status(ok ? 200 : 503).json({ scanner: ok ? 'ok' : 'not_detecting' });
});
```

Note: `scanBytes` from `pompelmi` uses the configured scanners. This health check only validates heuristic-level detection. ClamAV-based detection of EICAR requires `@pompelmi/engine-clamav`.

---

## Quick Reference Checklist

| # | Mistake | Fix |
|---|---------|-----|
| 1 | Write to disk before scan | Use `multer.memoryStorage()` |
| 2 | Trust `Content-Type` header | Use magic byte inspection |
| 3 | Extension checks only | Combine extension + content inspection |
| 4 | No file size limit | Set limits in both multer and guard |
| 5 | No ZIP bomb protection | Use `createZipBombGuard` |
| 6 | `failClosed: false` | Always `failClosed: true` |
| 7 | Ignore `suspicious` verdict | Quarantine or handle explicitly |
| 8 | No rate limiting | Rate limit before upload parser |
| 9 | Log file content | Log metadata only |
| 10 | Serve uploads from same origin | Use a separate cookieless domain |
| 11 | Auth after upload parser | Authenticate before parsing |
| 12 | Use `originalname` for storage | Generate random UUID keys |
| 13 | Exclusion MIME list | Use inclusion allowlist |
| 14 | No scan timeouts | `timeoutMsPerScanner` in options |
| 15 | Only guard some endpoints | Apply guard to all upload routes |
| 16 | No recursive archive inspection | Combine zip guard + YARA |
| 17 | No scanner health check | Health endpoint with EICAR test |

---

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [Blog: File upload security checklist](/pompelmi/blog/file-upload-security-checklist/)
- [Blog: Testing your upload scanner with EICAR and Vitest](/pompelmi/blog/eicar-testing-upload-scanners/)
- [Blog: Reason codes and security observability with Pompelmi](/pompelmi/blog/reason-codes-security-observability/)
