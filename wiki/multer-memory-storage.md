# multer Memory Storage

When you use `multer({ storage: multer.memoryStorage() })`, the uploaded file is never written to disk. It lives entirely in `req.file.buffer` as a Node.js `Buffer`. This page explains why `scan()` does not work in this case and how `scanBuffer()` solves it.

---

## Why `scan()` doesn't work with memoryStorage

`scan()` requires a file path — it calls `clamscan <filePath>` or streams the file at that path to clamd. With `memoryStorage`, there is no path:

```js
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res) => {
  console.log(req.file.path);   // undefined — no file on disk
  console.log(req.file.buffer); // <Buffer 25 50 44 ...> — file is here

  // This throws "filePath must be a string"
  await scan(req.file.path);
});
```

---

## Use `scanBuffer()` instead

```js
const express = require('express');
const multer  = require('multer');
const { scanBuffer, Verdict } = require('pompelmi');

const app    = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: Number(process.env.CLAMAV_PORT) || 3310,
  timeout: 30_000,
};

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  let result;
  try {
    result = await scanBuffer(req.file.buffer, SCAN_OPTS);
  } catch (err) {
    return res.status(500).json({ error: `Scan failed: ${err.message}` });
  }

  if (result === Verdict.Malicious) {
    return res.status(422).json({ error: 'Malicious file rejected.' });
  }

  if (result === Verdict.ScanError) {
    return res.status(422).json({ error: 'Scan incomplete — file rejected.' });
  }

  // Verdict.Clean — buffer is available for forwarding to S3, DB, etc.
  return res.json({ ok: true, size: req.file.size });
});

app.listen(3000);
```

---

## How `scanBuffer()` works in each mode

| Mode | Behaviour |
|------|-----------|
| **TCP** (`host` set) | Buffer is streamed directly to clamd via INSTREAM — zero disk I/O on the application host. |
| **Local** (no `host`) | Buffer is written to a temp file in `os.tmpdir()`, scanned with `clamscan`, then deleted in a `finally` block. |

For `memoryStorage` workloads, TCP mode is strongly recommended: the whole point of keeping the file in memory is to avoid touching disk, and TCP mode preserves that guarantee.

---

## Multiple files with `upload.array()`

```js
app.post('/upload-many', upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const scanResults = await Promise.allSettled(
    req.files.map(async (file) => {
      const verdict = await scanBuffer(file.buffer, SCAN_OPTS);
      return { originalname: file.originalname, verdict };
    })
  );

  const accepted = [];
  const rejected = [];

  for (const r of scanResults) {
    if (r.status === 'rejected') {
      rejected.push({ originalname: '?', reason: 'scan_failed' });
      continue;
    }
    const { originalname, verdict } = r.value;
    if (verdict === Verdict.Clean) {
      accepted.push(originalname);
    } else {
      rejected.push({ originalname, reason: verdict.description });
    }
  }

  if (rejected.length > 0) {
    return res.status(422).json({ accepted, rejected });
  }
  return res.json({ ok: true, accepted });
});
```

---

## Memory usage considerations

With `memoryStorage`, every uploaded file occupies memory for the duration of the request. For large files or high concurrency, this can exhaust the Node.js heap. Options:

1. **Set a file size limit** — always set `limits.fileSize` on multer.
2. **Use disk storage for large files** — fall back to `diskStorage` for files above a threshold.
3. **Use `scanStream()` instead** — pipe the multipart stream directly to `scanStream()` without buffering the entire file. This requires bypassing multer and parsing multipart manually (e.g. with `busboy`).

```js
// scanStream with busboy — no full buffering
const busboy = require('busboy');

app.post('/upload-stream', (req, res) => {
  const bb = busboy({ headers: req.headers });

  bb.on('file', async (_name, fileStream, _info) => {
    const result = await scanStream(fileStream, SCAN_OPTS);

    if (result !== Verdict.Clean) {
      return res.status(422).json({ error: result.description });
    }
    return res.json({ ok: true });
  });

  req.pipe(bb);
});
```

---

## After scanning: forward to S3

```js
const { PutObjectCommand } = require('@aws-sdk/client-s3');

// After confirmed Verdict.Clean
await s3.send(new PutObjectCommand({
  Bucket:      process.env.S3_BUCKET,
  Key:         `uploads/${Date.now()}-${req.file.originalname}`,
  Body:        req.file.buffer,
  ContentType: req.file.mimetype,
}));
```
