# API Reference

Complete reference for all public functions exported by pompelmi.

---

## Installation

```bash
npm install pompelmi
```

```js
const { scan, scanBuffer, scanStream, scanDirectory, Verdict } = require('pompelmi');
```

---

## `scan(filePath, [options])`

Scan a file by absolute or relative path. In local mode spawns `clamscan`; in TCP mode streams the file to clamd via INSTREAM.

```ts
scan(
  filePath: string,
  options?: {
    host?: string;
    port?: number;
    timeout?: number;
  }
): Promise<symbol>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | `string` | Yes | Path to the file to scan. Use `path.resolve()` for safety. |
| `options.host` | `string` | No | clamd hostname. Setting this enables TCP mode. |
| `options.port` | `number` | No | clamd port. Default: `3310`. |
| `options.timeout` | `number` | No | Socket idle timeout in ms (TCP mode only). Default: `15000`. |

### Returns

`Promise<symbol>` — resolves to one of the three `Verdict` Symbols:

| Verdict | Local exit code | TCP response | Meaning |
|---------|-----------------|--------------|---------|
| `Verdict.Clean` | `0` | `stream: OK` | No threats found. |
| `Verdict.Malicious` | `1` | `stream: <name> FOUND` | Known malware signature matched. |
| `Verdict.ScanError` | `2` | other response | Scan could not complete. Treat as untrusted. |

### Rejects with

| Message | Cause |
|---------|-------|
| `filePath must be a string` | First argument is not a string. |
| `File not found: <path>` | File does not exist at the given path. |
| `ENOENT` | `clamscan` binary not found in PATH (local mode). |
| `Unexpected exit code: N` | ClamAV exited with an undocumented code. |
| `Process killed by signal: <SIG>` | Process was killed (timeout, OOM, SIGTERM). |
| `clamd connection timed out after Nms` | TCP socket idle timeout exceeded. |

### Examples

```js
// Local mode
const result = await scan('/uploads/report.pdf');

// TCP mode
const result = await scan('/uploads/report.pdf', {
  host: '127.0.0.1',
  port: 3310,
  timeout: 30_000,
});

if (result === Verdict.Clean)     console.log('Safe.');
if (result === Verdict.Malicious) throw new Error('Malware detected.');
if (result === Verdict.ScanError) console.warn('Scan incomplete — treat as untrusted.');
```

---

## `scanBuffer(buffer, [options])`

Scan an in-memory `Buffer` without writing to disk (TCP mode) or via a temp file that is deleted automatically (local mode).

```ts
scanBuffer(
  buffer: Buffer,
  options?: {
    host?: string;
    port?: number;
    timeout?: number;
  }
): Promise<symbol>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buffer` | `Buffer` | Yes | The in-memory buffer to scan. |
| `options` | `object` | No | Same options as `scan()`. |

### Returns

Same three `Verdict` Symbols as `scan()`.

### Rejects with

Everything `scan()` can reject with, plus:

| Message | Cause |
|---------|-------|
| `buffer must be a Buffer` | First argument is not a `Buffer` instance. |
| `buffer is empty` | Zero-length Buffer passed. |

### Notes

- **TCP mode:** buffer is streamed to clamd via INSTREAM — no disk I/O.
- **Local mode:** buffer is written to a temp file in `os.tmpdir()`, scanned, then deleted in a `finally` block.

### Example

```js
// multer memoryStorage
const result = await scanBuffer(req.file.buffer, {
  host: process.env.CLAMAV_HOST,
  port: 3310,
});
```

---

## `scanStream(stream, [options])`

Scan any Node.js `Readable` stream. In TCP mode the stream is piped directly to clamd — no disk I/O. In local mode it is written to a temp file that is deleted automatically.

```ts
scanStream(
  stream: Readable,
  options?: {
    host?: string;
    port?: number;
    timeout?: number;
  }
): Promise<symbol>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stream` | `stream.Readable` | Yes | The readable stream to scan. |
| `options` | `object` | No | Same options as `scan()`. |

### Returns

Same three `Verdict` Symbols as `scan()`.

### Rejects with

Everything `scan()` can reject with, plus:

| Message | Cause |
|---------|-------|
| `stream must be a Readable` | First argument is not a `stream.Readable`. |
| stream error | Any error emitted by the stream is propagated as-is. |

### Example

```js
// S3 getObject stream
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const response = await s3.send(new GetObjectCommand({ Bucket, Key }));
const result = await scanStream(response.Body, { host: 'clamav', port: 3310 });
```

---

## `scanDirectory(dirPath, [options])`

Recursively scan every file in a directory. Returns three arrays of absolute paths; per-file failures are collected rather than thrown.

```ts
scanDirectory(
  dirPath: string,
  options?: {
    host?: string;
    port?: number;
    timeout?: number;
  }
): Promise<{
  clean: string[];
  malicious: string[];
  errors: string[];
}>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dirPath` | `string` | Yes | Path to the directory to scan recursively. |
| `options` | `object` | No | Same options as `scan()`. |

### Returns

| Field | Type | Description |
|-------|------|-------------|
| `clean` | `string[]` | Absolute paths of files with no threats. |
| `malicious` | `string[]` | Absolute paths of files with matched signatures. |
| `errors` | `string[]` | Absolute paths of files that could not be scanned. |

### Rejects with

| Message | Cause |
|---------|-------|
| `dirPath must be a string` | First argument is not a string. |
| `Directory not found: <path>` | Directory does not exist. |

Individual file scan failures do **not** cause the function to reject — they appear in `errors`.

### Example

```js
const results = await scanDirectory('/uploads', { host: 'clamav', port: 3310 });

console.log(`${results.clean.length} clean, ${results.malicious.length} malicious`);
results.malicious.forEach(f => fs.unlinkSync(f));
```

---

## `Verdict`

The `Verdict` object exported by pompelmi contains three Symbols:

```js
const { Verdict } = require('pompelmi');

Verdict.Clean     // Symbol(Clean)
Verdict.Malicious // Symbol(Malicious)
Verdict.ScanError // Symbol(ScanError)
```

Each Symbol has a `.description` property for safe serialisation:

```js
Verdict.Clean.description     // 'Clean'
Verdict.Malicious.description // 'Malicious'
Verdict.ScanError.description // 'ScanError'
```

---

## Options reference

All four functions accept the same options object:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `string` | — | clamd hostname. Setting this enables TCP mode. |
| `port` | `number` | `3310` | clamd port. |
| `timeout` | `number` | `15000` | Socket idle timeout in ms. TCP mode only. |

When neither `host` nor `port` is set, pompelmi uses local mode (spawns `clamscan`).
