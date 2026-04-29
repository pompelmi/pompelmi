# Local vs TCP Mode

pompelmi supports two scanning modes. Which one you use is controlled entirely by the options you pass — no configuration files, no environment flags in pompelmi itself.

---

## Summary

| | Local mode | TCP mode |
|---|---|---|
| **How it works** | Spawns `clamscan` as a child process | Streams file to `clamd` daemon over TCP |
| **ClamAV requirement** | `clamscan` binary in PATH | Running `clamd` daemon reachable over TCP |
| **Startup time** | Slow — loads virus DB each invocation | Fast — daemon keeps DB in memory |
| **Throughput** | Low — one process per scan | High — persistent connection |
| **Disk I/O** | Reads file from disk | Reads file from disk (or buffer/stream with no disk) |
| **Docker** | Requires ClamAV in app container | Use ClamAV as a sidecar |
| **Zero-copy scan** | Not possible | `scanBuffer()` and `scanStream()` with no disk I/O |

---

## Enabling local mode

Do not pass `host` or `port`. pompelmi spawns `clamscan --no-summary <filePath>`:

```js
const { scan, Verdict } = require('pompelmi');

// Local mode — no options, or empty options
const result = await scan('/uploads/file.pdf');
const result = await scan('/uploads/file.pdf', {});
```

`clamscan` must be in `PATH`. Install it with:

```bash
# macOS
brew install clamav && freshclam

# Linux
sudo apt-get install -y clamav && sudo freshclam
```

---

## Enabling TCP mode

Pass `host` (and optionally `port`) to any scan function:

```js
const result = await scan('/uploads/file.pdf', {
  host:    '127.0.0.1',
  port:    3310,           // default 3310
  timeout: 30_000,         // socket idle timeout ms, default 15000
});
```

Setting `host` switches all four functions — `scan`, `scanBuffer`, `scanStream`, `scanDirectory` — to TCP mode.

---

## How local mode works

```
pompelmi              OS
   │                   │
   ├── spawn clamscan ─┤
   │                   ├── load virus DB (~300 MB) into memory
   │                   ├── scan file
   │                   ├── exit 0 / 1 / 2
   ├── read exit code ─┘
   │
   └── resolve Verdict
```

Each scan call:
1. Spawns a new `clamscan` process
2. `clamscan` loads the full virus database into memory
3. Scans the file
4. Exits with code 0 (clean), 1 (malicious), or 2 (error)
5. pompelmi maps the exit code to a Verdict Symbol

**Typical latency:** 400–800 ms per scan (dominated by database load time).

---

## How TCP mode works

```
pompelmi              clamd daemon
   │                   │
   ├── TCP connect ───►│ (keep-alive daemon)
   ├── INSTREAM ───────┤
   ├── stream chunks ──┤ scan in memory
   │                   ├── "stream: OK" / "stream: X FOUND"
   ├── read response ──┘
   │
   └── resolve Verdict
```

Each scan call:
1. Opens a TCP connection to clamd
2. Sends `zINSTREAM\0` command
3. Streams the file in 64 KB chunks, each prefixed with a 4-byte big-endian length header
4. Sends 4 zero bytes to signal end of stream
5. Reads the response line
6. Maps response to Verdict Symbol

**Typical latency:** 5–50 ms per scan (clamd keeps DB in memory; network is the bottleneck).

---

## Performance comparison

| Metric | Local mode | TCP mode |
|--------|-----------|----------|
| First scan latency | ~600 ms | ~10 ms |
| Subsequent scan latency | ~600 ms | ~10 ms |
| Concurrent scans (4-core) | ~4 (CPU-bound) | ~50+ |
| Memory per scan | ~300 MB (DB load) | ~0 (clamd holds DB) |

Local mode is fine for low-traffic applications (< 10 uploads/minute). TCP mode is required for any sustained upload throughput.

---

## Switching modes without changing application code

Structure your options from environment variables so the same code runs in local mode during development and TCP mode in production:

```js
const SCAN_OPTS = process.env.CLAMAV_HOST
  ? {
      host:    process.env.CLAMAV_HOST,
      port:    Number(process.env.CLAMAV_PORT) || 3310,
      timeout: Number(process.env.CLAMAV_TIMEOUT) || 15_000,
    }
  : {}; // local mode — empty options

const result = await scan('/uploads/file.pdf', SCAN_OPTS);
```

Set `CLAMAV_HOST=clamav` in your Docker environment; leave it unset in local development.

---

## Timeout differences

| | Local mode | TCP mode |
|---|---|---|
| **`timeout` option** | Ignored | Socket idle timeout in ms |
| **Default timeout** | OS process timeout | 15 000 ms |
| **Timeout error** | `Process killed by signal: SIGTERM` | `clamd connection timed out after Nms` |

In local mode, the process runs until `clamscan` finishes or the OS kills it. In TCP mode, pompelmi sets a socket idle timeout — if clamd stops sending data for longer than `timeout` ms, the connection is closed and the promise rejects.

---

## Error behaviour differences

| Condition | Local mode error | TCP mode error |
|-----------|-----------------|----------------|
| Service unavailable | `ENOENT` (clamscan not found) | `ECONNREFUSED` |
| Service slow | Process runs to completion | `clamd connection timed out` |
| File not scannable | `Verdict.ScanError` (exit code 2) | `Verdict.ScanError` (error response) |

---

## When to use local mode

- Development and testing on a developer's machine
- Low-traffic applications (< a few uploads per minute)
- Environments where Docker is unavailable
- Simple scripts and one-off scans

## When to use TCP mode

- Production applications with concurrent uploads
- Docker or Kubernetes deployments
- Scanning in-memory buffers or streams with zero disk I/O
- Environments where the application container cannot install ClamAV
