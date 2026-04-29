# Performance

Understanding pompelmi's performance characteristics helps you choose the right mode, concurrency level, and file handling strategy for your workload.

---

## Latency: local mode vs TCP mode

| Scenario | Local mode | TCP mode (LAN) |
|----------|-----------|----------------|
| Small file (< 1 MB) | 400–800 ms | 5–20 ms |
| Medium file (5–10 MB) | 800–1500 ms | 20–80 ms |
| Large file (50 MB) | 2000–4000 ms | 100–400 ms |
| ZIP archive (1 MB compressed) | 600–1200 ms | 15–60 ms |

Local mode is dominated by the time ClamAV takes to load the virus database (~300 MB) into memory on each invocation. TCP mode reuses a persistent clamd daemon that keeps the database resident.

> These are rough estimates. Actual latency depends on disk I/O speed, CPU, ClamAV version, and virus definition size.

---

## Throughput: concurrent scans

### Local mode

Each local scan spawns a `clamscan` process that loads the database from disk. On a 4-core machine:

```
~2–4 concurrent scans before CPU saturation
~1–2 scans/second sustained throughput
```

Increasing concurrency beyond 4 in local mode degrades performance rather than improving it — processes compete for disk and CPU.

### TCP mode

clamd keeps the virus database in memory and handles requests on a single thread. Multiple connections are accepted and queued:

```
~5–10 concurrent scans before clamd is saturated (single instance)
~50–200 scans/second sustained throughput (single clamd, depends on file size)
```

Scale horizontally by running multiple clamd instances behind a load balancer.

---

## Memory usage

### `scan()` (file path)

Memory usage is minimal in the application process — pompelmi reads a path and delegates. ClamAV allocates memory to load the database and scan the file (especially for archive extraction).

### `scanBuffer()` with large files

The full file content is held in memory as a Node.js `Buffer` for the duration of the scan. For a 50 MB upload:

- Application process: ~50 MB Buffer
- clamd (TCP mode): streams the buffer, does not accumulate it all at once
- Local mode: writes a temp file, so memory usage is minimal in the app process

**Avoid `scanBuffer()` for files > 50 MB.** Use `scan()` (disk) or `scanStream()` (streaming) instead.

### `scanStream()` with TCP mode

The stream is piped directly to clamd in 64 KB chunks. The application process never holds the full file in memory — peak memory usage is approximately 64 KB for the chunk buffer plus stream buffering overhead. This is the most memory-efficient option for large files.

---

## Temp file cleanup in local mode

`scanBuffer()` and `scanStream()` in local mode write a temp file to `os.tmpdir()` before scanning. pompelmi deletes the temp file in a `finally` block — it is always removed regardless of scan outcome.

However, if your process is killed with `SIGKILL` (not `SIGTERM`), the `finally` block does not run and the temp file persists. Add a startup cleanup or use a system temp cleaner (Linux `systemd-tmpfiles`, macOS `/tmp` auto-clean) to handle this case.

```js
const os   = require('os');
const fs   = require('fs');
const path = require('path');

function cleanTempFiles() {
  const tmpDir = os.tmpdir();
  const files  = fs.readdirSync(tmpDir);
  const stale  = files.filter(f => f.startsWith('scan-') && f.endsWith('.tmp'));

  for (const f of stale) {
    const full = path.join(tmpDir, f);
    const age  = Date.now() - fs.statSync(full).mtimeMs;
    if (age > 60_000) { // older than 1 minute
      try { fs.unlinkSync(full); } catch {}
    }
  }
}

// Run at startup
cleanTempFiles();
```

---

## Connection considerations for TCP mode

pompelmi opens a new TCP connection per scan call. For sporadic uploads, this is fine — the connection overhead is small (< 1 ms on LAN).

For sustained high-throughput workloads (hundreds of scans per second), the connection overhead accumulates. Options:

1. **Keep-alive / connection reuse:** pompelmi does not implement connection pooling. If this becomes a bottleneck, implement a pool using Node.js `net.Socket` that reuses open connections.

2. **Increase clamd connection limit:** Check `MaxConnections` in `clamd.conf` (default: 30). Increase it if you are running many concurrent scans.

3. **Scale horizontally:** Run multiple clamd instances behind a load balancer and distribute scan requests across them.

---

## `scanDirectory()` performance

`scanDirectory()` scans all files concurrently (bounded internally). For very large directories (thousands of files), it may open many simultaneous connections to clamd.

If you observe clamd connection errors with large directories, use `p-limit` to wrap individual `scan()` calls instead:

```js
const pLimit = require('p-limit');
const { scan, Verdict } = require('pompelmi');
const fs = require('fs');

async function scanDirLimited(dirPath, concurrency = 5) {
  const limit = pLimit(concurrency);
  const files = fs.readdirSync(dirPath, { recursive: true })
    .filter(f => !fs.statSync(`${dirPath}/${f}`).isDirectory())
    .map(f => `${dirPath}/${f}`);

  return Promise.allSettled(
    files.map(f => limit(async () => ({
      path: f,
      verdict: await scan(f, { host: 'clamav', port: 3310 }),
    })))
  );
}
```

---

## Profiling scan latency in production

Wrap your scan calls with timing instrumentation:

```js
async function timedScan(filePath, opts) {
  const start  = Date.now();
  const result = await scan(filePath, opts);
  const ms     = Date.now() - start;

  logger.info({
    event:   'scan_complete',
    filePath,
    verdict: result.description,
    ms,
    size:    fs.statSync(filePath).size,
  });

  return result;
}
```

Track the `ms` metric in your observability system. Sudden increases indicate clamd overload, disk I/O contention, or stale virus definitions.

---

## Choosing the right function for your workload

| Scenario | Recommended function | Reason |
|----------|---------------------|--------|
| File uploaded to disk | `scan(filePath)` | Zero buffer overhead |
| multer memoryStorage, small files (< 10 MB) | `scanBuffer(buffer)` | Simple, no temp file in TCP |
| multer memoryStorage, large files | `scanStream(stream)` | No full buffer in memory |
| S3 getObject | `scanStream(response.Body)` | No disk, no full buffer |
| Batch of files in a folder | `scanDirectory(dirPath)` | Single call, concurrent |
| High-throughput uploads | TCP mode + `scanStream()` | Lowest latency, no disk |
