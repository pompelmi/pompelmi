# Express Integration

This page covers integrating pompelmi into an Express application for file upload scanning — both disk storage (scan by path) and memory storage (scan by buffer).

---

## Setup

```bash
npm install pompelmi multer express
```

---

## Disk storage (scan by file path)

multer writes the uploaded file to disk before your route handler runs. Call `scan(req.file.path)` to scan it.

```js
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const { scan, Verdict } = require('pompelmi');

const upload = multer({ dest: path.join(__dirname, 'uploads') });
const app    = express();

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;

  try {
    const result = await scan(filePath);

    if (result === Verdict.Malicious) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: 'Malicious file rejected.' });
    }

    if (result === Verdict.ScanError) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: 'Scan incomplete — file rejected as precaution.' });
    }

    // Verdict.Clean — rename to final destination or store as-is
    return res.json({ ok: true, filename: req.file.filename });
  } catch (err) {
    // clamscan not in PATH, file not found, process killed, etc.
    try { fs.unlinkSync(filePath); } catch {}
    return res.status(500).json({ error: `Scan failed: ${err.message}` });
  }
});

app.listen(3000);
```

### With TCP mode (Docker sidecar)

```js
const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST || '127.0.0.1',
  port: Number(process.env.CLAMAV_PORT) || 3310,
  timeout: 30_000,
};

const result = await scan(filePath, SCAN_OPTS);
```

---

## Memory storage (scan by buffer)

When you use `multer({ storage: multer.memoryStorage() })`, the file is never written to disk — it lives in `req.file.buffer`. Use `scanBuffer()` instead of `scan()`.

```js
const express = require('express');
const multer  = require('multer');
const { scanBuffer, Verdict } = require('pompelmi');

const upload = multer({ storage: multer.memoryStorage() });
const app    = express();

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: 3310,
};

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const result = await scanBuffer(req.file.buffer, SCAN_OPTS);

    if (result === Verdict.Malicious) {
      return res.status(422).json({ error: 'Malicious file rejected.' });
    }

    if (result === Verdict.ScanError) {
      return res.status(422).json({ error: 'Scan incomplete — file rejected.' });
    }

    // Clean — forward buffer to storage (S3, database, disk)
    return res.json({ ok: true, originalname: req.file.originalname });
  } catch (err) {
    return res.status(500).json({ error: `Scan failed: ${err.message}` });
  }
});

app.listen(3000);
```

---

## Scanning multiple files in one request

```js
app.post('/upload-many', upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const results = await Promise.allSettled(
    req.files.map(async (file) => {
      const verdict = await scan(file.path, SCAN_OPTS);
      return { file, verdict };
    })
  );

  const rejected = [];
  const accepted = [];

  for (const r of results) {
    if (r.status === 'rejected') {
      rejected.push({ filename: '?', reason: r.reason.message });
      continue;
    }
    const { file, verdict } = r.value;
    if (verdict !== Verdict.Clean) {
      try { fs.unlinkSync(file.path); } catch {}
      rejected.push({ filename: file.originalname, reason: verdict.description });
    } else {
      accepted.push(file.originalname);
    }
  }

  if (rejected.length > 0) {
    return res.status(422).json({ accepted, rejected });
  }
  return res.json({ ok: true, accepted });
});
```

---

## Centralised error handling middleware

Extract scan logic into middleware for reuse across routes:

```js
async function scanUpload(req, res, next) {
  if (!req.file) return next();

  const filePath = req.file.path;

  try {
    const result = await scan(filePath, SCAN_OPTS);

    if (result !== Verdict.Clean) {
      try { fs.unlinkSync(filePath); } catch {}
      const status = result === Verdict.Malicious ? 422 : 422;
      return res.status(status).json({ error: `Upload rejected: ${result.description}` });
    }

    next();
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    next(err);
  }
}

// Use it
app.post('/profile-photo', upload.single('photo'), scanUpload, (req, res) => {
  res.json({ ok: true, path: req.file.path });
});
```

---

## HTTP status codes

| Situation | Status |
|-----------|--------|
| No file in request | `400 Bad Request` |
| `Verdict.Malicious` | `422 Unprocessable Entity` |
| `Verdict.ScanError` | `422 Unprocessable Entity` |
| `scan()` throws | `500 Internal Server Error` |
| `Verdict.Clean` | `200 OK` (or `201 Created` after storing) |

---

## File size limits

Always set a file size limit on multer to prevent large uploads from exhausting memory or disk:

```js
const upload = multer({
  dest: './uploads',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
```

multer returns a `MulterError` (subclass of `Error`) when the limit is exceeded. Handle it in your error middleware:

```js
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large.' });
  }
  next(err);
});
```
