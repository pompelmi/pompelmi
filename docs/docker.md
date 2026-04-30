# Docker / Remote Scanning

pompelmi supports two connection methods to a running clamd daemon:

- **TCP** — connect to `host:port` (default port `3310`)
- **UNIX socket** — connect to a local socket file (lower latency, no network stack)

Both use the ClamAV `INSTREAM` protocol: the file (or buffer, or stream) is sent in 64 KB chunks, each prefixed with a 4-byte big-endian length, terminated by four zero bytes. clamd replies with `stream: OK`, `stream: <name> FOUND`, or an error line.

---

## TCP: Docker sidecar

The simplest setup for applications running inside Docker.

### docker-compose.yml

```yaml
services:
  app:
    build: .
    depends_on:
      clamav:
        condition: service_healthy

  clamav:
    image: clamav/clamav:stable
    ports:
      - "3310:3310"
    healthcheck:
      test: ["CMD", "clamdcheck.sh"]
      interval: 60s
      retries: 3
      start_period: 120s   # clamd loads definitions on startup — allow time
```

### Application code

```js
const { scan, Verdict } = require('pompelmi');

const result = await scan('/path/to/upload.zip', {
  host:    'clamav',   // Docker service name resolves via Docker DNS
  port:    3310,
  timeout: 30_000,     // increase for large files
});

if (result === Verdict.Malicious) throw new Error('Malware detected.');
```

### One-liner (development)

```bash
docker run -d --name clamav -p 3310:3310 clamav/clamav:stable
```

Then point pompelmi at `127.0.0.1:3310`.

---

## UNIX socket: local clamd daemon

Preferred when clamd runs on the same host as the Node.js process. No TCP overhead; the socket file is the connection point.

### Install and configure clamd (Debian / Ubuntu)

```bash
sudo apt-get install -y clamav clamav-daemon
sudo freshclam                   # download initial definitions
sudo systemctl enable clamav-daemon
sudo systemctl start clamav-daemon
```

The socket is created at `/run/clamav/clamd.sock` by default (`LocalSocket` directive in `/etc/clamav/clamd.conf`).

### Application code

```js
const { scan, Verdict } = require('pompelmi');

const result = await scan('/path/to/upload.pdf', {
  socket: '/run/clamav/clamd.sock',
});

if (result === Verdict.Malicious) throw new Error('Malware detected.');
```

---

## UNIX socket: Docker with socket mount

Run clamd in a container but expose it via a UNIX socket to the host or to a sibling container. This avoids exposing port 3310 on the network.

### docker-compose.yml

```yaml
services:
  app:
    build: .
    volumes:
      - clamav-socket:/run/clamav   # mount the shared socket volume
    depends_on:
      clamav:
        condition: service_healthy

  clamav:
    image: clamav/clamav:stable
    volumes:
      - clamav-socket:/run/clamav   # clamd writes its socket here
    healthcheck:
      test: ["CMD", "clamdcheck.sh"]
      interval: 60s
      retries: 3
      start_period: 120s

volumes:
  clamav-socket:
```

### Application code

```js
const result = await scan('/path/to/file.pdf', {
  socket: '/run/clamav/clamd.sock',
});
```

The socket path inside the `app` container matches the volume mount — `/run/clamav/clamd.sock`.

---

## scanBuffer and scanStream — no disk I/O

When using TCP or UNIX socket mode, `scanBuffer` and `scanStream` never write data to disk:

```js
const { scanBuffer, scanStream, Verdict } = require('pompelmi');

// Buffer — sent directly to clamd in 64 KB chunks
const result = await scanBuffer(req.file.buffer, {
  socket: '/run/clamav/clamd.sock',
});

// Stream — piped directly to clamd, no buffering
const stream = s3.getObject({ Bucket, Key }).createReadStream();
const result = await scanStream(stream, {
  host: '127.0.0.1',
  port: 3310,
});
```

In local mode (no `socket`/`host`/`port`), a temp file is written to `os.tmpdir()` and deleted automatically in a `finally` block.

---

## Timeout

The `timeout` option sets the socket idle timeout in milliseconds. The default is `15 000` (15 s). Increase it for large files or slow networks:

```js
const result = await scan(filePath, {
  host:    '127.0.0.1',
  port:    3310,
  timeout: 60_000,   // 60 s
});
```

If the socket is idle for longer than `timeout`, the connection is destroyed and the Promise rejects with:
```
clamd connection timed out after 60000ms
```

---

## Healthcheck before connecting

clamd takes 30–120 seconds to load virus definitions on startup. Connect only after the healthcheck passes, or wrap your first scan in a retry:

```js
async function scanWithRetry(filePath, options, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await scan(filePath, options);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}
```
