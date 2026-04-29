# REST API Scan Server

Build a standalone HTTP microservice that exposes a `POST /scan` endpoint. Other services send files to it and receive a JSON verdict. This pattern lets you share one clamd instance and one scan service across multiple applications.

---

## Minimal implementation (Node.js built-ins)

No framework required — just `node:http` and `busboy` for multipart parsing:

```bash
npm install pompelmi busboy
```

```js
// scan-server.js
const http   = require('http');
const busboy = require('busboy');
const os     = require('os');
const fs     = require('fs');
const path   = require('path');
const { scan, Verdict } = require('pompelmi');

const PORT = Number(process.env.PORT) || 4000;

const SCAN_OPTS = {
  host:    process.env.CLAMAV_HOST,
  port:    Number(process.env.CLAMAV_PORT) || 3310,
  timeout: Number(process.env.CLAMAV_TIMEOUT) || 30_000,
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/scan') {
    return json(res, 404, { error: 'Not found.' });
  }

  const bb = busboy({ headers: req.headers });
  let handled = false;

  bb.on('file', async (_name, fileStream, info) => {
    const tmpPath = path.join(os.tmpdir(), `scan-${Date.now()}-${info.filename}`);
    const ws      = fs.createWriteStream(tmpPath);

    fileStream.pipe(ws);

    ws.on('finish', async () => {
      if (handled) return;
      handled = true;

      try {
        const result = await scan(tmpPath, SCAN_OPTS);
        json(res, result === Verdict.Clean ? 200 : 422, {
          verdict:  result.description,
          filename: info.filename,
        });
      } catch (err) {
        json(res, 500, { error: err.message });
      } finally {
        try { fs.unlinkSync(tmpPath); } catch {}
      }
    });

    ws.on('error', (err) => {
      if (!handled) {
        handled = true;
        json(res, 500, { error: err.message });
      }
    });
  });

  bb.on('error', (err) => {
    if (!handled) {
      handled = true;
      json(res, 400, { error: `Multipart error: ${err.message}` });
    }
  });

  req.pipe(bb);
});

server.listen(PORT, () => {
  console.log(`Scan server listening on :${PORT}`);
});
```

---

## Express implementation

```bash
npm install pompelmi express multer
```

```js
// scan-server-express.js
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const { scan, Verdict } = require('pompelmi');

const app    = express();
const upload = multer({
  dest:   require('os').tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const SCAN_OPTS = {
  host:    process.env.CLAMAV_HOST,
  port:    Number(process.env.CLAMAV_PORT) || 3310,
  timeout: 30_000,
};

app.post('/scan', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send a multipart/form-data request with field name "file".' });
  }

  const filePath = req.file.path;

  try {
    const result = await scan(filePath, SCAN_OPTS);

    return res.status(result === Verdict.Clean ? 200 : 422).json({
      verdict:  result.description,
      filename: req.file.originalname,
      size:     req.file.size,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(Number(process.env.PORT) || 4000, () => {
  console.log('Scan server ready.');
});
```

---

## JSON response format

**Clean file (200):**

```json
{
  "verdict":  "Clean",
  "filename": "report.pdf",
  "size":     245760
}
```

**Malicious file (422):**

```json
{
  "verdict":  "Malicious",
  "filename": "evil.exe",
  "size":     16384
}
```

**Scan error (422):**

```json
{
  "verdict":  "ScanError",
  "filename": "protected.zip",
  "size":     8192
}
```

**Server error (500):**

```json
{
  "error": "clamd connection timed out after 30000ms"
}
```

---

## Calling from another service

### curl

```bash
curl -X POST http://scan-service:4000/scan \
  -F "file=@/path/to/file.pdf" \
  -w "\n%{http_code}"
```

### Node.js (using `form-data`)

```bash
npm install form-data node-fetch
```

```js
const FormData = require('form-data');
const fetch    = require('node-fetch');
const fs       = require('fs');

async function remoteVerdictCheck(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const res = await fetch('http://scan-service:4000/scan', {
    method:  'POST',
    body:    form,
    headers: form.getHeaders(),
  });

  const body = await res.json();
  return body.verdict; // 'Clean' | 'Malicious' | 'ScanError'
}
```

### Python

```python
import requests

with open('/path/to/file.pdf', 'rb') as f:
    response = requests.post(
        'http://scan-service:4000/scan',
        files={'file': f},
    )

verdict = response.json()['verdict']
print(verdict)  # Clean / Malicious / ScanError
```

---

## Docker deployment

```yaml
# docker-compose.yml
services:
  scan-service:
    build: .
    ports:
      - "4000:4000"
    environment:
      PORT: 4000
      CLAMAV_HOST: clamav
      CLAMAV_PORT: 3310
      CLAMAV_TIMEOUT: 30000
    depends_on:
      clamav:
        condition: service_healthy

  clamav:
    image: clamav/clamav:stable
    volumes:
      - clamav_db:/var/lib/clamav
    healthcheck:
      test: ["CMD", "clamdcheck"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s

volumes:
  clamav_db:
```

---

## Security considerations for the scan service

- **Network access:** Expose the scan service only within your internal network or VPC. Never expose it to the public internet.
- **Authentication:** Add an API key or mTLS for service-to-service authentication.
- **File size limits:** Set `limits.fileSize` on multer to prevent the scan service from being used as a DoS vector.
- **Rate limiting:** Add rate limiting per caller IP or API key.

```js
const rateLimit = require('express-rate-limit');

app.use('/scan', rateLimit({
  windowMs: 60_000,
  max: 60, // 60 scans per minute per IP
}));
```
