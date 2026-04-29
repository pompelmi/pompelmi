# Security Considerations

pompelmi is one layer in a secure file upload pipeline — not a complete solution on its own. This page covers what ClamAV protects against, what it does not, and how to build a genuinely secure upload endpoint.

---

## What ClamAV detects

ClamAV is a signature-based antivirus. It detects:

- **Known malware** — executables, scripts, and documents matching its signature database
- **Known malware inside archives** — ZIP, RAR, TAR, PDF, Office documents (recursive scanning)
- **EICAR test files** — for verifying your integration
- **Some heuristic patterns** — suspicious bytecode, known malware families

ClamAV does **not** detect:

- **Zero-day malware** — novel malware without a signature
- **Obfuscated malware** — some malware evades signature matching through packing or encryption
- **Logic bombs** — malicious code that only activates under specific conditions
- **Malicious content that is not malware** — spam, phishing text, NSFW images, copyright violations

**ClamAV is a necessary but not sufficient safeguard.** Use it as one layer in a defence-in-depth strategy.

---

## Reject on `ScanError`

`Verdict.ScanError` means the scan did not complete. Password-protected archives, corrupt files, and oversized archives all return `ScanError`. These are common evasion techniques — always reject `ScanError` files:

```js
if (result !== Verdict.Clean) {
  fs.unlinkSync(filePath);
  return res.status(422).json({ error: 'Upload rejected.' });
}
```

Never serve a file whose safety status is unknown.

---

## Validate MIME type and extension

ClamAV checks content, not metadata. But your application may have legitimate business reasons to restrict file types. Add MIME validation as a complementary check:

```js
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']);

function validateFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`File type not allowed: ${file.mimetype}`);
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File extension not allowed: ${ext}`);
  }
}
```

Note: MIME type from `req.file.mimetype` is supplied by the client and can be spoofed. For strong MIME validation, use `file-type` to detect the real MIME type from the file's magic bytes:

```bash
npm install file-type
```

```js
const { fileTypeFromBuffer } = require('file-type');

const detected = await fileTypeFromBuffer(req.file.buffer);
if (!ALLOWED_MIME_TYPES.has(detected?.mime)) {
  throw new Error('File type mismatch or not allowed.');
}
```

---

## Set file size limits

Never let a file reach ClamAV if it exceeds your maximum allowed size. Check size before scanning:

```js
// multer
const upload = multer({
  dest: './uploads',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Manual check
if (req.file.size > 10 * 1024 * 1024) {
  fs.unlinkSync(req.file.path);
  return res.status(413).json({ error: 'File too large.' });
}
```

Large files slow down scans and can exhaust ClamAV's memory when unpacking archives.

---

## Never serve files from the upload directory directly

After a file is uploaded and scanned, do not serve it directly from the upload directory as a static file. Instead:

1. Move it to a separate storage location (S3, a content-addressed store, or a named directory).
2. Serve files through a route handler that validates authorisation before returning the file.

Serving uploads as static files bypasses all access control and lets any user download any uploaded file if they know or guess the path.

```js
// BAD — serves all uploads publicly
app.use('/uploads', express.static('./uploads'));

// GOOD — validate before serving
app.get('/files/:id', authenticate, async (req, res) => {
  const file = await db.files.findById(req.params.id);
  if (!file || file.userId !== req.user.id) {
    return res.status(404).end();
  }
  res.sendFile(file.storagePath);
});
```

---

## Store files with randomised names

Never use the original filename from the upload. Sanitise or replace it entirely to prevent path traversal, null byte injection, and social engineering attacks:

```js
const { randomBytes } = require('crypto');
const path = require('path');

function safeFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `${randomBytes(16).toString('hex')}${ext}`;
}

const storedName = safeFilename(req.file.originalname);
```

---

## OWASP file upload security checklist

| Control | How to implement with pompelmi |
|---------|-------------------------------|
| Validate file type | `file-type` for magic bytes + MIME allowlist |
| Validate file size | `multer limits.fileSize` + pre-scan size check |
| Scan for malware | `scan()` / `scanBuffer()` / `scanStream()` |
| Rename uploaded files | Generate random names — never use original filename |
| Store outside webroot | Use S3 or a non-public directory |
| Serve through auth-gated handler | Route handler with session/token check |
| Limit upload rate | Express rate limiting middleware |
| Log all upload attempts | Log verdict, user, IP, original filename |
| Reject `ScanError` | `if (result !== Verdict.Clean)` → reject |
| Set Content-Security-Policy | Prevent XSS from served HTML files |

---

## Defence in depth

pompelmi sits at layer 3 of a multi-layer defence:

```
Layer 1: TLS — encrypted transport
Layer 2: Authentication — only authorised users can upload
Layer 3: Size limits — reject oversized files before processing
Layer 4: Extension / MIME allowlist — reject obviously wrong file types
Layer 5: pompelmi — ClamAV signature scan
Layer 6: Random storage name — no path traversal possible
Layer 7: Auth-gated serving — no direct URL access to upload directory
Layer 8: CSP headers — limit damage if a malicious file is served
```

Remove any one of these layers and the others compensate. pompelmi does not replace them — it adds to them.

---

## Privacy and data handling

pompelmi scans files locally. In local mode, files are passed to `clamscan` as a path argument. In TCP mode, file content is streamed to your own clamd instance. **No file content is sent to any third party.** This makes pompelmi suitable for GDPR, HIPAA, and other privacy-sensitive environments.

In TCP mode with `scanBuffer()` or `scanStream()`, no data is written to the application host's disk at all — the content goes directly from memory to the clamd daemon.
