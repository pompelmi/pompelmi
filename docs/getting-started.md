# Getting Started

## Prerequisites

pompelmi talks to ClamAV via two modes — pick one:

| Mode | What you need | When to use |
|------|---------------|-------------|
| **TCP** | clamd running on `host:port` | Docker sidecars, remote servers |
| **UNIX socket** | clamd running locally with a socket | Same-machine daemons (recommended for lowest latency) |
| **Local** | `clamscan` binary in `PATH` | Dev machines; no daemon needed |

Local mode is the simplest to get started with. TCP and UNIX socket modes are recommended in production because they skip the per-scan process spawn.

### Start clamd with Docker (quickest path)

```bash
docker run -d --name clamav \
  -p 3310:3310 \
  clamav/clamav:stable
```

clamd listens on port 3310. Definitions are bundled in the image and stay fresh for roughly an hour before the container auto-refreshes.

See [docs/docker.md](./docker.md) for Docker Compose, UNIX socket mounts, and production patterns.

---

## Installation

```bash
npm install pompelmi
# or
yarn add pompelmi
# or
pnpm add pompelmi
```

pompelmi has zero runtime dependencies. It bundles nothing but source code.

---

## Quickstart

### Scan a file via TCP

```js
const { scan, Verdict } = require('pompelmi');

const result = await scan('/path/to/upload.pdf', {
  host: '127.0.0.1',
  port: 3310,
});

if (result === Verdict.Clean)     console.log('Safe.');
if (result === Verdict.Malicious) throw new Error('Malware detected.');
if (result === Verdict.ScanError) console.warn('Scan incomplete — reject as precaution.');
```

### Scan a file via UNIX socket

```js
const { scan, Verdict } = require('pompelmi');

const result = await scan('/path/to/upload.pdf', {
  socket: '/run/clamav/clamd.sock',
});

if (result === Verdict.Malicious) throw new Error('Malware detected.');
```

### Scan an in-memory Buffer (no temp file in TCP/socket mode)

```js
const { scanBuffer, Verdict } = require('pompelmi');

// e.g. multer memoryStorage, busboy, or any in-process buffer
const result = await scanBuffer(req.file.buffer, {
  host: '127.0.0.1',
  port: 3310,
});

if (result === Verdict.Malicious) throw new Error('Malware detected.');
```

### Scan a Readable stream (no disk I/O in TCP/socket mode)

```js
const { scanStream, Verdict } = require('pompelmi');

// e.g. S3 getObject, HTTP download, or any Readable
const stream = s3.getObject({ Bucket, Key }).createReadStream();
const result = await scanStream(stream, { socket: '/run/clamav/clamd.sock' });

if (result === Verdict.Malicious) throw new Error('Malware detected.');
```

---

## Verdicts

All functions resolve to one of three opaque Symbols:

```js
const { Verdict } = require('pompelmi');

Verdict.Clean     // no threats found
Verdict.Malicious // matched a known signature
Verdict.ScanError // scan could not complete (I/O error, encrypted archive, etc.)
```

Using Symbols instead of strings makes comparisons typo-proof. Each Symbol exposes a `.description` property for logging:

```js
console.log(result.description); // 'Clean', 'Malicious', or 'ScanError'
```

---

## Express file upload example

```js
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const { scan, Verdict } = require('pompelmi');

const upload = multer({ dest: './uploads' });
const app    = express();

app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;

  try {
    const result = await scan(filePath, { host: '127.0.0.1', port: 3310 });

    if (result === Verdict.Malicious) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: 'Malicious file rejected.' });
    }
    if (result === Verdict.ScanError) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: 'Scan incomplete — file rejected as precaution.' });
    }

    return res.json({ ok: true, file: req.file.filename });
  } catch (err) {
    fs.unlink(filePath, () => {});
    return res.status(500).json({ error: `Scan failed: ${err.message}` });
  }
});

app.listen(3000);
```

---

## Next steps

- Full function signatures and error conditions → [docs/api.md](./api.md)
- Running clamd via Docker or mounting UNIX sockets → [docs/docker.md](./docker.md)
- Scanning in CI with the GitHub Action → [docs/github-action.md](./github-action.md)
