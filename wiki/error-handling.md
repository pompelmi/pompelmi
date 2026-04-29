# Error Handling

pompelmi has two distinct failure modes that require different handling: **rejected Promises** (the function threw) and **`Verdict.ScanError`** (the scan completed but could not determine safety). Understanding the difference is critical to building a secure upload pipeline.

---

## The two failure modes

### 1. Rejected Promise (the scan function threw)

`scan()`, `scanBuffer()`, `scanStream()`, and `scanDirectory()` reject when something prevents the scan from running at all — not when the scan completes and finds a problem.

Common rejection causes:

| Error message | Cause |
|---------------|-------|
| `filePath must be a string` | Wrong argument type |
| `File not found: <path>` | File does not exist |
| `ENOENT` | `clamscan` not installed or not in PATH |
| `Unexpected exit code: N` | ClamAV internal error |
| `Process killed by signal: SIGTERM` | Process killed (OOM, timeout) |
| `clamd connection timed out after Nms` | TCP timeout exceeded |
| `buffer must be a Buffer` | Wrong argument to `scanBuffer()` |
| `stream must be a Readable` | Wrong argument to `scanStream()` |
| `dirPath must be a string` | Wrong argument to `scanDirectory()` |
| `Directory not found: <path>` | Directory does not exist |

These are programming errors or infrastructure failures. Handle them with `try/catch`.

### 2. `Verdict.ScanError` (scan completed, result unknown)

`Verdict.ScanError` resolves (does not throw) and indicates ClamAV ran but could not produce a clean/malicious verdict. Common causes: encrypted archives, corrupt files, permission errors, I/O issues.

---

## The secure default: reject on both

The safest policy: any outcome other than `Verdict.Clean` results in rejection.

```js
const { scan, Verdict } = require('pompelmi');
const fs = require('fs');

async function scanAndAccept(filePath) {
  try {
    const result = await scan(filePath, { host: 'clamav', port: 3310 });

    if (result === Verdict.Malicious) {
      fs.unlinkSync(filePath);
      throw new Error('Malicious file rejected.');
    }

    if (result === Verdict.ScanError) {
      fs.unlinkSync(filePath);
      throw new Error('Scan incomplete — file rejected as precaution.');
    }

    return filePath; // Verdict.Clean
  } catch (err) {
    // Covers both scan() rejections and our own thrown Errors above.
    // Delete the file defensively if it still exists.
    try { fs.unlinkSync(filePath); } catch {}
    throw err;
  }
}
```

---

## When to retry `ScanError`

A `ScanError` caused by a transient network blip or a momentary clamd overload is worth one retry. A `ScanError` caused by a corrupt file or encrypted archive will always return `ScanError` — retrying wastes time.

```js
async function scanWithRetry(filePath, opts, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await scan(filePath, opts);
      if (result !== Verdict.ScanError || attempt === retries) {
        return result;
      }
      // ScanError on non-final attempt — wait briefly and retry
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
}
```

Do not retry `Verdict.Malicious` — the signature match is deterministic.

---

## Cleanup with `finally`

Ensure temp files are always deleted regardless of scan outcome:

```js
const os   = require('os');
const fs   = require('fs');
const path = require('path');
const { scan, Verdict } = require('pompelmi');

async function scanBuffer_manual(buffer) {
  const tmpPath = path.join(os.tmpdir(), `scan-${Date.now()}.tmp`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    return await scan(tmpPath);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}
```

`scanBuffer()` handles this `finally` pattern internally in local mode — you don't need to replicate it when using the API directly.

---

## Express error handling pattern

```js
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const { scan, Verdict } = require('pompelmi');

const app    = express();
const upload = multer({ dest: './uploads', limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/upload', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const result = await scan(req.file.path, { host: 'clamav', port: 3310 });

    if (result === Verdict.Malicious) {
      fs.unlinkSync(req.file.path);
      return res.status(422).json({ error: 'Malicious file rejected.' });
    }

    if (result === Verdict.ScanError) {
      fs.unlinkSync(req.file.path);
      return res.status(422).json({ error: 'Scan failed — file rejected.' });
    }

    return res.json({ ok: true, filename: req.file.filename });
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch {}
    next(err); // forward to Express error middleware
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal scan error.' });
});
```

---

## Logging best practices

Log rejections with enough context to investigate later — but never log file contents.

```js
const logger = require('./logger'); // pino, winston, etc.

if (result === Verdict.Malicious) {
  logger.warn({
    event:       'malware_detected',
    filePath,
    originalname: req.file.originalname,
    mimetype:     req.file.mimetype,
    size:         req.file.size,
    userId:       req.user?.id,
    ip:           req.ip,
  });
}
```

For `ScanError`:

```js
if (result === Verdict.ScanError) {
  logger.warn({
    event:    'scan_error',
    filePath,
    mimetype: req.file.mimetype,
    size:     req.file.size,
  });
}
```

For scan function rejections:

```js
} catch (err) {
  logger.error({
    event:   'scan_threw',
    message: err.message,
    filePath,
  });
}
```

---

## HTTP status code conventions

| Situation | Recommended status |
|-----------|-------------------|
| No file in request | `400 Bad Request` |
| Wrong argument (programming error) | `400 Bad Request` |
| `Verdict.Malicious` | `422 Unprocessable Entity` |
| `Verdict.ScanError` (reject policy) | `422 Unprocessable Entity` |
| `scan()` throws (infra error) | `500 Internal Server Error` |
| File too large (pre-scan) | `413 Content Too Large` |
| `Verdict.Clean` | `200 OK` / `201 Created` |

---

## `scanDirectory()` error handling

Per-file failures in `scanDirectory()` go into the `errors` array — the function itself only rejects on argument errors or missing directory.

```js
const { scanDirectory } = require('pompelmi');

try {
  const results = await scanDirectory('/uploads');
  if (results.errors.length > 0) {
    logger.warn({ event: 'scan_errors', paths: results.errors });
    // Decide: reject the whole batch, or only reject the errored files
  }
} catch (err) {
  // dirPath not a string, or directory not found
  logger.error({ event: 'scan_threw', message: err.message });
}
```
