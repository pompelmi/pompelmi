# API Reference

All functions are exported from the `pompelmi` package:

```js
const { scan, scanBuffer, scanStream, scanDirectory, Verdict } = require('pompelmi');
```

---

## Options

Every scanning function accepts the same optional `options` object. Providing any of `socket`, `host`, or `port` switches the function from local mode (spawning `clamscan`) to clamd mode (INSTREAM protocol over TCP or UNIX socket).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `socket` | `string` | — | Path to a clamd UNIX domain socket (e.g. `/run/clamav/clamd.sock`). Takes precedence over `host`/`port` when set. |
| `host` | `string` | — | clamd hostname. Enables TCP mode when set. |
| `port` | `number` | `3310` | clamd port. Only used when `host` is set. |
| `timeout` | `number` | `15000` | Socket idle timeout in milliseconds. clamd mode only. |
| `retries` | `number` | `0` | Number of automatic retry attempts on connection error. |
| `retryDelay` | `number` | `1000` | Milliseconds to wait between retry attempts. |

**Mode selection:** when `socket` is set, it wins. When only `host` (or `host` + `port`) is set, TCP is used. When none of the three are provided, `clamscan` is spawned as a local child process.

---

## Verdicts

All functions resolve to one of three opaque Symbols, exposed on the `Verdict` object:

| Symbol | Local exit code | clamd response | Meaning |
|--------|-----------------|----------------|---------|
| `Verdict.Clean` | `0` | `stream: OK` | No threats found. |
| `Verdict.Malicious` | `1` | `<name> FOUND` | A known virus or malware signature was matched. |
| `Verdict.ScanError` | `2` | anything else | Scan could not complete — I/O error, encrypted archive, permission denied. Treat the file as untrusted. |

Each Symbol has a `.description` property for safe serialisation:

```js
result.description // 'Clean' | 'Malicious' | 'ScanError'
```

---

## `scan(filePath, [options])`

Scan a file on disk.

```ts
scan(
  filePath: string,
  options?: { socket?: string; host?: string; port?: number; timeout?: number }
): Promise<symbol>
```

In local mode, pompelmi spawns `clamscan --no-summary <filePath>` and maps its exit code to a verdict — no stdout parsing, no regex.

In clamd mode, pompelmi opens a connection to clamd and streams the file using the INSTREAM protocol: 64 KB chunks, each prefixed with a 4-byte big-endian length, terminated by four zero bytes.

**Resolves** to `Verdict.Clean`, `Verdict.Malicious`, or `Verdict.ScanError`.

**Rejects** with an `Error` in these cases:

| Condition | Error message |
|-----------|---------------|
| `filePath` is not a string | `filePath must be a string` |
| File does not exist | `File not found: <path>` |
| `clamscan` not in `PATH` (local mode) | `ENOENT` (OS error) |
| Unexpected `clamscan` exit code | `Unexpected exit code: N` |
| Process killed by signal | `Process killed by signal: <SIG>` |
| clamd connection times out | `clamd connection timed out after Nms` |
| clamd connection refused / network error | OS error (`ECONNREFUSED`, etc.) |

---

## `scanBuffer(buffer, [options])`

Scan an in-memory `Buffer` without writing anything to disk (in clamd mode).

```ts
scanBuffer(
  buffer: Buffer,
  options?: { socket?: string; host?: string; port?: number; timeout?: number }
): Promise<symbol>
```

In clamd mode, the buffer is sent to clamd in 64 KB chunks over the INSTREAM protocol — no temp file is created.

In local mode, a temp file is written to `os.tmpdir()` and deleted in a `finally` block regardless of outcome.

**Resolves** to the same three verdict Symbols as `scan()`.

**Rejects** with the same errors as `scan()` where applicable, plus:

| Condition | Error message |
|-----------|---------------|
| `buffer` is not a `Buffer` | `buffer must be a Buffer` |
| `buffer` is empty | `buffer is empty` |

**Typical use case:** multer `memoryStorage`, busboy, or any upload handler that gives you the file contents before writing to disk.

```js
app.post('/upload', upload.single('file'), async (req, res) => {
  const result = await scanBuffer(req.file.buffer, { socket: '/run/clamav/clamd.sock' });
  if (result === Verdict.Malicious) return res.status(422).json({ error: 'Rejected.' });
  // persist file...
});
```

---

## `scanStream(stream, [options])`

Scan a Node.js `Readable` stream without buffering it to disk (in clamd mode).

```ts
scanStream(
  stream: Readable,
  options?: { socket?: string; host?: string; port?: number; timeout?: number }
): Promise<symbol>
```

In clamd mode, the stream is piped directly to clamd via the INSTREAM protocol. No data is written to disk.

In local mode, the stream is piped to a temp file in `os.tmpdir()` and deleted in a `finally` block.

**Resolves** to the same three verdict Symbols as `scan()`.

**Rejects** with the same errors as `scan()` where applicable, plus:

| Condition | Error message |
|-----------|---------------|
| `stream` is not a `Readable` | `stream must be a Readable` |
| Stream emits an error | propagated as-is |

**Typical use case:** S3 `getObject`, an HTTP download, or any piped source you want to scan before writing anywhere.

```js
const stream = s3.getObject({ Bucket, Key }).createReadStream();
const result = await scanStream(stream, { host: '127.0.0.1', port: 3310 });
if (result === Verdict.Malicious) throw new Error('Malware detected.');
```

---

## `scanDirectory(dirPath, [options])`

Recursively scan every file inside a directory.

```ts
scanDirectory(
  dirPath: string,
  options?: { socket?: string; host?: string; port?: number; timeout?: number }
): Promise<{ clean: string[], malicious: string[], errors: string[] }>
```

Scans all files concurrently. Per-file failures are caught and collected into `errors` — the function never throws because a single file failed.

**Return value:**

| Field | Type | Description |
|-------|------|-------------|
| `clean` | `string[]` | Absolute paths of files with no threats found |
| `malicious` | `string[]` | Absolute paths of files with a matched signature |
| `errors` | `string[]` | Absolute paths of files that could not be scanned |

**Rejects** (entire call) with an `Error` in these cases:

| Condition | Error message |
|-----------|---------------|
| `dirPath` is not a string | `dirPath must be a string` |
| Directory does not exist | `Directory not found: <path>` |

```js
const { clean, malicious, errors } = await scanDirectory('/uploads', {
  socket: '/run/clamav/clamd.sock',
});

console.log(`${clean.length} clean, ${malicious.length} infected, ${errors.length} errors`);
malicious.forEach(f => fs.unlinkSync(f));
```

---

## Error handling patterns

### Treat `ScanError` as untrusted

```js
const result = await scan(filePath, { host: '127.0.0.1', port: 3310 });

if (result === Verdict.Malicious) {
  // Known threat — reject immediately
  throw new Error('Malware detected.');
}
if (result === Verdict.ScanError) {
  // Scan couldn't complete — treat as untrusted and reject
  throw new Error('Scan incomplete — rejecting as precaution.');
}
// result === Verdict.Clean — safe to proceed
```

### Reject on any non-clean result

```js
if (result !== Verdict.Clean) {
  throw new Error(`File rejected: ${result.description}`);
}
```

### Catch infrastructure failures separately

```js
try {
  const result = await scan(filePath, { host: '127.0.0.1', port: 3310 });
  // handle Verdict.*
} catch (err) {
  // ECONNREFUSED — clamd not running
  // ENOENT       — clamscan not in PATH (local mode)
  // timeout      — clamd too slow
  logger.error('Scan infrastructure error:', err.message);
  throw err; // or fail safe — reject the upload
}
```

### Auto-retry on transient clamd failures

```js
const result = await scan(filePath, {
  host: '127.0.0.1', port: 3310,
  retries: 3,        // 3 retry attempts after the first failure
  retryDelay: 500,   // 500 ms between each attempt
});
```

---

## `scanS3(params, [options])`

Scan an S3 object by streaming it directly to clamd — no disk I/O.

```ts
scanS3(
  params: { bucket: string; key: string; region?: string; credentials?: object },
  options?: ScanOptions
): Promise<symbol>
```

Requires `@aws-sdk/client-s3` to be installed in your project:

```bash
npm install @aws-sdk/client-s3
```

The S3 object body is streamed directly into `scanStream()` via the INSTREAM protocol. No data is written to disk.

**Rejects** with `Error('Install AWS SDK: npm install @aws-sdk/client-s3')` if the SDK package is not installed.

```js
const { scanS3, Verdict } = require('pompelmi');

const result = await scanS3(
  { bucket: 'my-uploads', key: 'incoming/document.pdf', region: 'us-east-1' },
  { host: '127.0.0.1', port: 3310 }
);

if (result === Verdict.Malicious) throw new Error('Malware detected in S3 object.');
```

See **[docs/s3.md](./s3.md)** for IAM setup, Lambda patterns, and credential configuration.

---

## `createPool([options])`

Create a pool of persistent clamd connections for high-throughput scanning.

```ts
createPool(options?: {
  host?: string;
  port?: number;
  socket?: string;
  size?: number;    // default: 5
  timeout?: number; // default: 15000
}): ClamdPool
```

Returns a `ClamdPool` object with the following methods:

| Method | Description |
|--------|-------------|
| `pool.scan(filePath)` | Scan a file by path |
| `pool.scanBuffer(buffer)` | Scan an in-memory Buffer |
| `pool.scanStream(stream)` | Scan a Readable stream |
| `pool.destroy()` | Close all connections and reject queued requests |

Connections are kept alive between scans. When all `size` slots are busy, new requests are queued and executed in FIFO order. Connections are automatically re-established on error.

```js
const { createPool, Verdict } = require('pompelmi');

const pool = createPool({ host: '127.0.0.1', port: 3310, size: 10 });

// Scan many uploads concurrently — pool caps concurrent clamd connections at 10
const results = await Promise.all(
  uploadBuffers.map(buf => pool.scanBuffer(buf))
);

pool.destroy(); // cleanup when done
```

---

## `watch(dirPath, [options], [callbacks])`

Watch a directory for new and modified files, scanning each one automatically.

```ts
watch(
  dirPath: string,
  options?: ScanOptions,
  callbacks?: {
    onClean?:     (filePath: string) => void;
    onMalicious?: (filePath: string) => void;
    onError?:     (err: Error, filePath?: string) => void;
  }
): FSWatcher
```

Uses `fs.watch` (no dependencies) with a 300 ms debounce to coalesce rapid filesystem events. Returns an `FSWatcher`; call `.close()` to stop watching.

```js
const { watch } = require('pompelmi');

const watcher = watch(
  '/var/uploads',
  { host: '127.0.0.1', port: 3310 },
  {
    onClean:     (fp) => console.log('Clean:', fp),
    onMalicious: (fp) => { console.warn('INFECTED:', fp); fs.unlinkSync(fp); },
    onError:     (err, fp) => console.error('Scan error for', fp, err.message),
  }
);

// Stop watching
watcher.close();
```
