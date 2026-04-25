<p align="center">
  <img src="./src/grapefruit.png" width="88" alt="pompelmi logo">
</p>

<h1 align="center">pompelmi</h1>

<p align="center"><strong>ClamAV antivirus scanning for Node.js — clean, typed, zero dependencies.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi"><img src="https://img.shields.io/npm/v/pompelmi.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img src="https://img.shields.io/npm/dw/pompelmi" alt="npm weekly downloads"></a>
  <a href="https://github.com/pompelmi/pompelmi"><img src="https://img.shields.io/github/stars/pompelmi/pompelmi?style=social" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/docker-available-blue?logo=docker" alt="Docker available">
  <img src="https://img.shields.io/badge/license-ISC-blue.svg" alt="license">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
</p>

---

## Overview

pompelmi is a minimal Node.js wrapper around [ClamAV](https://www.clamav.net/) that exposes a single async function — `scan()` — and returns one of three typed verdict Symbols: `Verdict.Clean`, `Verdict.Malicious`, or `Verdict.ScanError`.

It supports two scanning modes:

- **Local** — spawns `clamscan` as a child process and maps its exit code to a verdict. No stdout parsing, no regex.
- **Remote / Docker** — streams the file to a running `clamd` daemon over TCP using the ClamAV `INSTREAM` protocol.

No cloud. No daemon required for local mode. No native bindings. Zero runtime dependencies.

---

## Features

- Single `scan(filePath, [options])` function — works locally or against a remote clamd instance
- Symbol-based verdicts (`Verdict.Clean` / `Verdict.Malicious` / `Verdict.ScanError`) — typo-proof comparisons
- Full TCP/clamd support via the INSTREAM protocol with configurable host, port, and timeout
- Built-in helpers to install ClamAV and update virus definitions programmatically
- Works with Express, Fastify, and any other Node.js HTTP framework
- Zero runtime dependencies — ships nothing but source code
- Tested with EICAR standard antivirus test files
- CommonJS module; TypeScript type declarations available inline

---

## Requirements

- **Node.js** — any LTS release (no native addons, no C++ bindings)
- **ClamAV** — must be installed on the host or reachable over TCP

pompelmi does not bundle or automatically download ClamAV. Install it once per machine (see [Installing ClamAV](#installing-clamav)).

---

## Installation

```bash
# npm
npm install pompelmi

# yarn
yarn add pompelmi

# pnpm
pnpm add pompelmi
```

### Docker

Run ClamAV as a sidecar and point pompelmi at it — no local install needed on the application host.

```yaml
# docker-compose.yml
services:
  clamav:
    image: clamav/clamav:stable
    ports:
      - "3310:3310"
```

```js
const result = await scan('/path/to/upload.zip', {
  host: '127.0.0.1',
  port: 3310,
});
```

See [Docker / remote scanning](#docker--remote-scanning) for details.

---

## Usage

### Basic scan

```js
const { scan, Verdict } = require('pompelmi');

const result = await scan('/path/to/file.pdf');

if (result === Verdict.Clean)     console.log('File is safe.');
if (result === Verdict.Malicious) throw new Error('Malware detected — file rejected.');
if (result === Verdict.ScanError) console.warn('Scan incomplete — treat file as untrusted.');
```

### Express file upload

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
    const result = await scan(filePath);

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

### Fastify file upload

```js
const Fastify  = require('fastify');
const { pipeline } = require('stream/promises');
const fs       = require('fs');
const path     = require('path');
const { scan, Verdict } = require('pompelmi');

const app = Fastify({ logger: true });
app.register(require('@fastify/multipart'));

app.post('/upload', async (req, reply) => {
  const data     = await req.file();
  const filePath = path.join('./uploads', `${Date.now()}-${data.filename}`);

  await pipeline(data.file, fs.createWriteStream(filePath));

  const result = await scan(filePath);

  if (result !== Verdict.Clean) {
    fs.unlinkSync(filePath);
    return reply.code(422).send({ error: result.description });
  }

  return reply.send({ ok: true });
});
```

### Full error handling

```js
const { scan, Verdict } = require('pompelmi');
const path = require('path');

async function safeScan(filePath) {
  try {
    const result = await scan(path.resolve(filePath));

    if (result === Verdict.ScanError) {
      // clamscan exited with code 2 — I/O error, encrypted archive, etc.
      console.warn('Scan could not complete — rejecting file as precaution.');
      return null;
    }

    return result; // Verdict.Clean or Verdict.Malicious
  } catch (err) {
    // filePath not a string, file not found, clamscan not in PATH, etc.
    console.error('Scan failed:', err.message);
    return null;
  }
}
```

### Scan multiple files concurrently

```js
const { scan } = require('pompelmi');
const files    = ['/uploads/a.pdf', '/uploads/b.zip', '/uploads/c.png'];

const results = await Promise.all(files.map((f) => scan(f)));
```

---

## Docker / Remote Scanning

Pass `host` and `port` to switch from the local `clamscan` CLI to the clamd TCP daemon. Everything else — the returned verdicts, error types — is identical.

```js
const result = await scan('/path/to/file.zip', {
  host:    '127.0.0.1',
  port:    3310,
  timeout: 30_000, // socket idle timeout, ms — default 15 000
});
```

pompelmi uses the ClamAV `INSTREAM` protocol: the file is streamed in 64 KB chunks, each prefixed with a 4-byte big-endian length header, terminated by four zero bytes. The response line (`stream: OK`, `stream: <name> FOUND`, or an error) is mapped to the same verdict Symbols.

---

## Configuration

pompelmi has no configuration file or environment variables. All options are passed directly to `scan()`.

| Option    | Type     | Default         | Description                            |
|-----------|----------|-----------------|----------------------------------------|
| `host`    | `string` | —               | clamd hostname. Enables TCP mode when set. |
| `port`    | `number` | `3310`          | clamd port.                            |
| `timeout` | `number` | `15000`         | Socket idle timeout in milliseconds (TCP mode only). |

When neither `host` nor `port` is provided, pompelmi spawns `clamscan --no-summary <filePath>` locally.

---

## API Reference

### `scan(filePath, [options])`

```ts
scan(
  filePath: string,
  options?: { host?: string; port?: number; timeout?: number }
): Promise<symbol>
```

**Returns** a Promise that resolves to one of:

| Verdict             | ClamAV exit code / response | Meaning                                                                 |
|---------------------|-----------------------------|-------------------------------------------------------------------------|
| `Verdict.Clean`     | `0` / `stream: OK`          | No threats found.                                                       |
| `Verdict.Malicious` | `1` / `<name> FOUND`        | A known virus or malware signature was matched.                         |
| `Verdict.ScanError` | `2` / other response        | Scan failed — I/O error, encrypted archive, permission denied. Treat file as untrusted. |

**Rejects** with an `Error` in these cases:

| Condition                             | Error message                     |
|---------------------------------------|-----------------------------------|
| `filePath` is not a string            | `filePath must be a string`       |
| File does not exist                   | `File not found: <path>`          |
| `clamscan` not in PATH                | `ENOENT` (from the OS)            |
| ClamAV returns an unknown exit code   | `Unexpected exit code: N`         |
| Process killed by signal              | `Process killed by signal: <SIG>` |
| clamd connection timed out            | `clamd connection timed out after Nms` |

Each `Verdict` Symbol exposes a `.description` property for safe serialisation:

```js
Verdict.Clean.description     // 'Clean'
Verdict.Malicious.description // 'Malicious'
Verdict.ScanError.description // 'ScanError'
```

---

### `ClamAVInstaller()` _(internal)_

Installs ClamAV using the platform's native package manager. Resolves immediately if ClamAV is already installed.

```ts
ClamAVInstaller(): Promise<string>
```

| Platform | Package manager | Command                                   |
|----------|-----------------|-------------------------------------------|
| macOS    | Homebrew        | `brew install clamav`                     |
| Linux    | apt-get         | `sudo apt-get install -y clamav clamav-daemon` |
| Windows  | Chocolatey      | `choco install clamav -y`                 |

---

### `updateClamAVDatabase()` _(internal)_

Runs `freshclam` to download or refresh the virus definition database. Skips if the database file is already present.

```ts
updateClamAVDatabase(): Promise<string>
```

| Platform | Database path                         |
|----------|---------------------------------------|
| macOS    | `/usr/local/share/clamav/main.cvd`    |
| Linux    | `/var/lib/clamav/main.cvd`            |
| Windows  | `C:\ProgramData\ClamAV\main.cvd`      |

---

## Installing ClamAV

```bash
# macOS
brew install clamav && freshclam

# Linux (Debian / Ubuntu)
sudo apt-get install -y clamav clamav-daemon && sudo freshclam

# Windows (Chocolatey)
choco install clamav -y
```

---

## Examples

The [`examples/`](./examples/) directory contains standalone runnable scripts. Each can be run directly with `node examples/<name>.js`.

| File | Description |
|------|-------------|
| [`basic-scan.js`](examples/basic-scan.js) | Scan a single file and log the verdict |
| [`scan-on-upload-express.js`](examples/scan-on-upload-express.js) | Express route: scan before saving |
| [`scan-on-upload-fastify.js`](examples/scan-on-upload-fastify.js) | Fastify route: same pattern |
| [`scan-with-options.js`](examples/scan-with-options.js) | Remote clamd with custom host, port, timeout |
| [`handle-scan-error.js`](examples/handle-scan-error.js) | Handle every verdict including hard rejections |
| [`delete-on-malicious.js`](examples/delete-on-malicious.js) | Auto-delete file if malicious |
| [`quarantine-on-malicious.js`](examples/quarantine-on-malicious.js) | Move infected file to a quarantine folder |
| [`scan-multiple-files.js`](examples/scan-multiple-files.js) | Concurrent scans with `Promise.all` |
| [`scan-directory.js`](examples/scan-directory.js) | Recursively scan every file in a directory |
| [`scan-buffer.js`](examples/scan-buffer.js) | Scan an in-memory Buffer via a temp-file shim |
| [`rest-api-server.js`](examples/rest-api-server.js) | Minimal HTTP server exposing `POST /scan` |
| [`s3-scan-before-upload.js`](examples/s3-scan-before-upload.js) | Scan locally, then upload to S3 only if clean |
| [`cli-scan.js`](examples/cli-scan.js) | CLI tool: scan file paths, exit non-zero on threats |
| [`scan-with-timeout.js`](examples/scan-with-timeout.js) | Timeout patterns for local and remote scanning |
| [`scan-pdf.js`](examples/scan-pdf.js) | PDF upload with extension validation |
| [`scan-image.js`](examples/scan-image.js) | Image upload with extension validation |
| [`scan-zip.js`](examples/scan-zip.js) | ZIP archive scan (ClamAV recurses automatically) |
| [`install-clamav.js`](examples/install-clamav.js) | Programmatic ClamAV installation |
| [`update-virus-database.js`](examples/update-virus-database.js) | Programmatic virus DB update |
| [`typescript-usage.ts`](examples/typescript-usage.ts) | TypeScript example with inline type declarations |

---

## Contributing

```bash
# 1. Clone and install dev dependencies
git clone https://github.com/pompelmi/pompelmi.git
cd pompelmi
npm install

# 2. Run the test suite
npm test

# 3. Lint
npm run lint
```

**Tests**

- `test/unit.test.js` — runs with Node's built-in test runner. Mocks `nativeSpawn` and platform dependencies; ClamAV is not required.
- `test/scan.test.js` — integration tests that spawn real `clamscan` against EICAR test files. Skipped automatically when `clamscan` is not in `PATH`.

**Submitting changes**

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-change`.
3. Make your changes and confirm `npm test` passes.
4. Open a pull request against `main`.

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing. To report a security vulnerability, see [SECURITY.md](./SECURITY.md).

---

## License

[ISC](./LICENSE) — © pompelmi contributors
