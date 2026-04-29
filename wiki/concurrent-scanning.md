# Concurrent Scanning

Scanning multiple files in parallel improves throughput but introduces tradeoffs around resource usage, partial failures, and connection limits. This page covers the main patterns.

---

## `Promise.all` — scan multiple files in parallel

`Promise.all` runs all scans concurrently and resolves when every scan completes. If any scan rejects (throws), the entire `Promise.all` rejects immediately.

```js
const { scan, Verdict } = require('pompelmi');

const files = [
  '/uploads/document.pdf',
  '/uploads/photo.jpg',
  '/uploads/archive.zip',
];

const results = await Promise.all(files.map(f => scan(f)));

results.forEach((result, i) => {
  if (result === Verdict.Malicious) {
    console.log(`${files[i]} is malicious.`);
  }
});
```

Use `Promise.all` when:
- All files must be accepted for the request to succeed.
- You want to fail fast if any scan throws.

---

## `Promise.allSettled` — partial failures

`Promise.allSettled` waits for all scans to complete regardless of individual failures. Each result has a `status` of `'fulfilled'` or `'rejected'`.

```js
const { scan, scanBuffer, Verdict } = require('pompelmi');

const files = ['/uploads/a.pdf', '/uploads/b.zip', '/uploads/c.png'];

const settled = await Promise.allSettled(
  files.map(async (f) => ({ path: f, verdict: await scan(f) }))
);

const accepted = [];
const rejected = [];

for (const r of settled) {
  if (r.status === 'rejected') {
    rejected.push({ path: '?', reason: r.reason.message });
    continue;
  }
  const { path, verdict } = r.value;
  if (verdict === Verdict.Clean) {
    accepted.push(path);
  } else {
    rejected.push({ path, reason: verdict.description });
  }
}

console.log({ accepted, rejected });
```

Use `Promise.allSettled` when:
- You want to process as many files as possible even if some fail.
- You need to report which specific files were rejected.

---

## `scanDirectory()` — scan an entire folder

`scanDirectory()` handles concurrent scanning of every file in a directory internally. It catches per-file errors and collects them into the `errors` array rather than throwing.

```js
const fs = require('fs');
const { scanDirectory } = require('pompelmi');

const results = await scanDirectory('/uploads', {
  host: process.env.CLAMAV_HOST,
  port: 3310,
});

console.log(`Clean: ${results.clean.length}`);
console.log(`Malicious: ${results.malicious.length}`);
console.log(`Errors: ${results.errors.length}`);

// Auto-delete malicious files
results.malicious.forEach(f => fs.unlinkSync(f));
```

Use `scanDirectory()` when:
- You have an existing folder of files to audit.
- You want a single-call interface with clean/malicious/errors output.

---

## Rate limiting concurrent scans with `p-limit`

Unbounded `Promise.all` with a large number of files can overwhelm clamd or exhaust the OS file descriptor limit. Use `p-limit` to cap concurrency.

```bash
npm install p-limit
```

```js
const pLimit = require('p-limit');
const { scan, Verdict } = require('pompelmi');

const files = getFilePaths(); // array of N paths
const limit = pLimit(5);      // at most 5 concurrent scans

const results = await Promise.all(
  files.map(f => limit(() => scan(f, { host: 'clamav', port: 3310 })))
);
```

Recommended concurrency limits:

| Mode | Suggested concurrency |
|------|----------------------|
| Local (`clamscan`) | 2–4 (CPU-bound) |
| TCP (single clamd) | 5–10 |
| TCP (multiple clamd replicas) | 20–50 |

Tune based on your hardware and observed clamd CPU usage.

---

## Concurrently scanning buffers

```js
const { scanBuffer, Verdict } = require('pompelmi');

// req.files from multer.array()
const results = await Promise.allSettled(
  req.files.map(file =>
    scanBuffer(file.buffer, { host: 'clamav', port: 3310 })
      .then(verdict => ({ name: file.originalname, verdict }))
  )
);
```

---

## Performance considerations

### Local mode

Each `scan()` in local mode spawns a `clamscan` child process. Spawning processes is expensive — ClamAV loads its virus database into memory on each invocation. For high-throughput local scanning, consider switching to TCP mode where a persistent `clamd` daemon keeps the database in memory.

### TCP mode

In TCP mode, pompelmi opens a new TCP connection per scan call. For sustained high-throughput workloads, the connection overhead is measurable. Options:

1. **Increase concurrency gradually** — start at 5, measure clamd CPU, increase until you see degradation.
2. **Scale clamd horizontally** — run multiple clamd containers behind a load balancer.
3. **Connection pooling** — pompelmi does not pool connections. For extremely high throughput, implement a connection pool that keeps sockets open and reuses them.

### Memory

`scanBuffer()` holds the full file content in memory. For large files (>50 MB), prefer `scan()` (from disk) or `scanStream()` (streaming, no full buffering in TCP mode).

---

## Example: batch-scan upload queue

```js
const pLimit = require('p-limit');
const { scan, Verdict } = require('pompelmi');
const fs = require('fs');

async function processBatch(filePaths) {
  const limit = pLimit(8);

  const results = await Promise.allSettled(
    filePaths.map(filePath =>
      limit(async () => {
        const verdict = await scan(filePath, { host: 'clamav', port: 3310 });
        return { filePath, verdict };
      })
    )
  );

  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('Scan error:', r.reason.message);
      continue;
    }
    const { filePath, verdict } = r.value;
    if (verdict !== Verdict.Clean) {
      fs.unlinkSync(filePath);
      console.warn('Rejected:', filePath, verdict.description);
    }
  }
}
```
