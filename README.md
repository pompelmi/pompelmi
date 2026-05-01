<p align="center">
  <img src="./src/grapefruit.png" width="88" alt="pompelmi logo">
</p>

<h1 align="center">pompelmi — ClamAV Antivirus Scanning for Node.js</h1>

<p align="center"><strong>ClamAV antivirus scanning for Node.js — clean, typed, zero dependencies.</strong></p>

<br>

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi"><img src="https://img.shields.io/npm/v/pompelmi.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img src="https://img.shields.io/npm/dw/pompelmi" alt="weekly downloads"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
  <img src="https://img.shields.io/badge/license-ISC-blue" alt="license">
  <a href="https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml"><img src="https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/pompelmi/pompelmi/actions/workflows/release.yml"><img src="https://github.com/pompelmi/pompelmi/actions/workflows/release.yml/badge.svg" alt="npm publish"></a>
  <img src="https://img.shields.io/badge/TypeScript-types%20included-3178c6?logo=typescript&logoColor=white" alt="TypeScript types included">
  <a href="https://github.com/pompelmi/pompelmi"><img src="https://img.shields.io/badge/scanned%20by-pompelmi-orange?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAQxlWElmTU0AKgAAAAgABwESAAMAAAABAAEAAAEaAAUAAAABAAAAYgEbAAUAAAABAAAAagEoAAMAAAABAAIAAAExAAIAAAA5AAAAcgE7AAIAAAASAAAArIdpAAQAAAABAAAAvgAAAAAAAABgAAAAAQAAAGAAAAABQ2FudmEgZG9jPURBSEdqUE42M19JIHVzZXI9VUFHZVZYTlJxNEkgYnJhbmQ9QkFHZVZib2RxREkAAFRvbW1hc28gQmVydG9jY2hpAAAGkAAABwAAAAQwMjEwkQEABwAAAAQBAgMAoAAABwAAAAQwMTAwoAEAAwAAAAEAAQAAoAIABAAAAAEAAAAOoAMABAAAAAEAAAAOAAAAAOn+IX8AAAAJcEhZcwAADsQAAA7EAZUrDhsAAAZHaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjY1NTM1PC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4xNTAwPC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6RXhpZlZlcnNpb24+MDIxMDwvZXhpZjpFeGlmVmVyc2lvbj4KICAgICAgICAgPGV4aWY6Rmxhc2hQaXhWZXJzaW9uPjAxMDA8L2V4aWY6Rmxhc2hQaXhWZXJzaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MTUwMDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOkNvbXBvbmVudHNDb25maWd1cmF0aW9uPgogICAgICAgICAgICA8cmRmOlNlcT4KICAgICAgICAgICAgICAgPHJkZjpsaT4xPC9yZGY6bGk+CiAgICAgICAgICAgICAgIDxyZGY6bGk+MjwvcmRmOmxpPgogICAgICAgICAgICAgICA8cmRmOmxpPjM8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaT4wPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOlNlcT4KICAgICAgICAgPC9leGlmOkNvbXBvbmVudHNDb25maWd1cmF0aW9uPgogICAgICAgICA8eG1wOkNyZWF0b3JUb29sPkNhbnZhIGRvYz1EQUhHalBONjNfSSB1c2VyPVVBR2VWWE5ScTRJIGJyYW5kPUJBR2VWYm9kcURJPC94bXA6Q3JlYXRvclRvb2w+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjk2PC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj45NjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPGRjOnRpdGxlPgogICAgICAgICAgICA8cmRmOkFsdD4KICAgICAgICAgICAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5Qcm9nZXR0byBzZW56YSB0aXRvbG8gLSAxPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOkFsdD4KICAgICAgICAgPC9kYzp0aXRsZT4KICAgICAgICAgPGRjOmNyZWF0b3I+CiAgICAgICAgICAgIDxyZGY6U2VxPgogICAgICAgICAgICAgICA8cmRmOmxpPlRvbW1hc28gQmVydG9jY2hpPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOlNlcT4KICAgICAgICAgPC9kYzpjcmVhdG9yPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4Kn4j/DQAAAeFJREFUKBWtUjtrFFEU/u68Z5zs7LLPhEgEG0ljETGFImgnNhKsYiEBLYU0KqiERaxEQbcRK8HCiH/AUrFVEEQQ0YiurvvIRp2d2ZnZeezJzIZZSAxi4S3uOffc73zfOede4H8vImJ/4/zj8t7Tc3MdixaYJ70RcsaL6uKd7m4E3M6g6TgrduBf7TQbF463zQX//rXDOzHJeZvixdrJTC7a89hreqdO62VntlzUZD+MAsd96HDqcuXS7X5KIqROYi8fWgom1nsFcX4SimFoYbeF4P1bXhUH54Mw+BZDbqT4can0HEIh7C4rhdx8xMtwbRv+18/wLROm08dgODz7sVaT08SRYjJB/+Wjm+KHzpWNxiswXQE/sxcYAoHVBjERJHIZs/NOiRMHSfKW4u+7hr9uLXk/XUCSwHEcqNWCVNkHafYIpHwJvKquTZ84GqaKW4nZZuS7Zhj0TbC8AfBirJqBV6+DYi7SJ6GVZuaMbOkZ/XitjRUZu2UNNXFVmVBAn9bANroQBA5CpQyKeyTPhZTVFebZByAbo/bGU6XWl2qvOE2cyo6xYtaPdPaEK04dVGR5kTxbo1+dJvrSCsuf6SWK295xVD/FMQYa+fHWfnB9v+4MDNP8Xp+qru76i1LsP9lNSkO4P3HUKYoAAAAASUVORK5CYII=" alt="Scanned by pompelmi"></a>
</p>

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation, prerequisites, quickstart examples |
| [API Reference](./docs/api.md) | Full function signatures, options, verdicts, error conditions |
| [Docker / Remote Scanning](./docs/docker.md) | TCP sidecar, UNIX socket mount, docker-compose patterns |
| [GitHub Action](./docs/github-action.md) | CI scanning, inputs/outputs, caching, example workflows |

---

## Overview

pompelmi is a minimal Node.js wrapper around [ClamAV](https://www.clamav.net/) that exposes a single async function — `scan()` — and returns one of three typed verdict Symbols: `Verdict.Clean`, `Verdict.Malicious`, or `Verdict.ScanError`. Full documentation at [pompelmi.app](https://pompelmi.app).

It supports two scanning modes:

- **Local** — spawns `clamscan` as a child process and maps its exit code to a verdict. No stdout parsing, no regex.
- **Remote / Docker / UNIX socket** — streams the file to a running `clamd` daemon over TCP or a UNIX domain socket using the ClamAV `INSTREAM` protocol.

No cloud. No daemon required for local mode. No native bindings. Zero runtime dependencies.

---

## Why pompelmi

If you need to **scan file uploads for viruses in Node.js**, integrate **ClamAV with Express or Fastify**, or add **antivirus scanning to any upload pipeline**, pompelmi is the simplest path.

Most integrations require parsing ClamAV's stdout with regex, managing a clamd daemon, or working around unmaintained packages. pompelmi does none of that: one function call, exit-code-mapped verdicts, zero dependencies.

---

## Features

- Single `scan(filePath, [options])` function — works locally or against a remote clamd instance
- `scanBuffer(buffer, [options])` — scan in-memory Buffers directly, no temp file required in TCP mode
- `scanStream(stream, [options])` — scan a Readable stream directly. In TCP mode, streamed to clamd with no disk I/O.
- `scanDirectory(dirPath, [options])` — recursively scan every file in a directory, returns clean/malicious/errors arrays
- Symbol-based verdicts (`Verdict.Clean` / `Verdict.Malicious` / `Verdict.ScanError`) — typo-proof comparisons
- Full clamd support via the INSTREAM protocol — TCP (`host`/`port`) or UNIX socket (`socket`) with configurable timeout
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

See [pompelmi.app](https://pompelmi.app) for the full getting-started guide.

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

### Scan a Directory

```js
const fs = require('fs');
const { scanDirectory } = require('pompelmi');

const results = await scanDirectory('/uploads');

console.log('Clean:', results.clean);
console.log('Malicious:', results.malicious);
console.log('Errors:', results.errors);

// Delete all malicious files
results.malicious.forEach(f => fs.unlinkSync(f));
```

### Scan a Buffer

```js
const { scanBuffer, Verdict } = require('pompelmi');

// Useful with multer memoryStorage or any in-memory upload
const result = await scanBuffer(req.file.buffer);

if (result === Verdict.Malicious) throw new Error('Malware detected.');
if (result === Verdict.ScanError) console.warn('Scan incomplete.');
```

### Scan a Stream

```js
const { scanStream, Verdict } = require('pompelmi');
const { Readable } = require('stream');

// Useful for S3 getObject, HTTP downloads, or any piped source
const stream = s3.getObject({ Bucket, Key }).createReadStream();
const result = await scanStream(stream);

if (result === Verdict.Malicious) throw new Error('Malware detected.');
if (result === Verdict.ScanError) console.warn('Scan incomplete.');
```

---

## Docker / Remote Scanning

Pass `host` and `port` (or `socket`) to switch from the local `clamscan` CLI to the clamd daemon. Everything else — the returned verdicts, error types — is identical.

**TCP:**
```js
const result = await scan('/path/to/file.zip', { host: '127.0.0.1', port: 3310 });
```

**UNIX socket:**
```js
const result = await scan('/path/to/file.zip', { socket: '/run/clamav/clamd.sock' });
```

See **[docs/docker.md](./docs/docker.md)** for Docker Compose examples, UNIX socket volume mounts, `scanBuffer` / `scanStream` in clamd mode, and connection retry patterns.

---

## Configuration

pompelmi has no configuration file or environment variables. All options are passed directly to `scan()`.

| Option    | Type     | Default         | Description                            |
|-----------|----------|-----------------|----------------------------------------|
| `socket`  | `string` | —               | Path to a clamd UNIX domain socket (e.g. `/run/clamav/clamd.sock`). Takes precedence over `host`/`port` when set. |
| `host`    | `string` | —               | clamd hostname. Enables TCP mode when set. |
| `port`    | `number` | `3310`          | clamd port.                            |
| `timeout` | `number` | `15000`         | Socket idle timeout in milliseconds (clamd mode only). |

When none of `socket`, `host`, or `port` is provided, pompelmi spawns `clamscan --no-summary <filePath>` locally.

---

## API Reference

See **[docs/api.md](./docs/api.md)** for the full reference: function signatures, options table, verdict Symbols, error conditions, and error handling patterns.

**Quick summary:**

| Function | Input | clamd mode disk I/O |
|----------|-------|---------------------|
| `scan(filePath, [options])` | File path on disk | None (streamed) |
| `scanBuffer(buffer, [options])` | `Buffer` | None (streamed) |
| `scanStream(stream, [options])` | Node.js `Readable` | None (streamed) |
| `scanDirectory(dirPath, [options])` | Directory path | None (streamed) |

All four functions accept the same `options` object and resolve to the same three verdict Symbols:

| Symbol | Meaning |
|--------|---------|
| `Verdict.Clean` | No threats found |
| `Verdict.Malicious` | Known signature matched |
| `Verdict.ScanError` | Scan could not complete — treat as untrusted |

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

The [`examples/`](./examples/) directory contains standalone runnable scripts and framework-specific starters.

### Framework starters

| Directory | Description |
|-----------|-------------|
| [`examples/express/`](./examples/express/) | Full Express app with multer + pompelmi middleware |
| [`examples/nextjs/`](./examples/nextjs/) | Next.js API route that scans raw upload bytes |
| [`examples/nestjs/`](./examples/nestjs/) | NestJS guard wrapping pompelmi for route-level protection |

### Standalone scripts

Each can be run with `node examples/<name>.js`.

| File | Description |
|------|-------------|
| `basic-scan.js` | Scan a single file and log the verdict |
| `scan-on-upload-express.js` | Express route: scan before saving |
| `scan-on-upload-fastify.js` | Fastify route: same pattern |
| `scan-with-options.js` | Remote clamd with custom host, port, timeout |
| `handle-scan-error.js` | Handle every verdict including hard rejections |
| `delete-on-malicious.js` | Auto-delete file if malicious |
| `quarantine-on-malicious.js` | Move infected file to a quarantine folder |
| `scan-multiple-files.js` | Concurrent scans with Promise.all |
| `scan-directory.js` | Recursively scan every file in a directory |
| `scan-buffer.js` | Scan an in-memory Buffer (multer memoryStorage) |
| `scan-stream.js` | Scan a Readable stream (S3, HTTP, pipes) |
| `rest-api-server.js` | Minimal HTTP server exposing POST /scan |
| `s3-scan-before-upload.js` | Scan locally, then upload to S3 only if clean |
| `cli-scan.js` | CLI tool: scan file paths, exit non-zero on threats |
| `scan-with-timeout.js` | Timeout patterns for local and remote scanning |
| `scan-pdf.js` | PDF upload with extension validation |
| `scan-image.js` | Image upload with extension validation |
| `scan-zip.js` | ZIP archive scan (ClamAV recurses automatically) |
| `install-clamav.js` | Programmatic ClamAV installation |
| `update-virus-database.js` | Programmatic virus DB update |
| `typescript-usage.ts` | TypeScript example with full type declarations |

---

## GitHub Action

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Pompelmi%20ClamAV%20Scanner-blue?logo=github)](https://github.com/marketplace/actions/pompelmi-clamav-scanner)

Scan any repository for viruses on every push or pull request — ClamAV is bundled inside a Docker container, virus definitions are auto-updated at runtime, and no external services are required.

### Minimal usage

```yaml
- uses: actions/checkout@v4

- name: Virus scan
  uses: pompelmi/pompelmi@v1.7.0
```

### Full example

```yaml
- uses: actions/checkout@v4

- name: Virus scan
  id: scan
  uses: pompelmi/pompelmi@v1.7.0
  with:
    path: 'uploads/'        # scan a subdirectory instead of the whole workspace
    fail-on-virus: 'true'   # fail the workflow step on detection (default)

- name: Print infected files
  if: always()
  run: echo "${{ steps.scan.outputs.infected-files }}"
```

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `path` | Directory or file to scan | `.` (full workspace) |
| `fail-on-virus` | Fail the workflow step when infected files are found | `true` |
| `comment-on-pr` | Post a PR comment listing infected files (requires `GITHUB_TOKEN`) | `true` |

### Outputs

| Output | Description |
|--------|-------------|
| `infected-files` | Newline-separated list of infected file paths (empty when clean) |
| `status` | `"clean"` or `"infected"` |

A ready-to-copy workflow is available at [`.github/workflows/action-example.yml`](./.github/workflows/action-example.yml). Full reference — inputs, outputs, layer caching, and more examples — in **[docs/github-action.md](./docs/github-action.md)**.

---

## Contributing

Full documentation and guides are available in the [Wiki](https://github.com/pompelmi/pompelmi/wiki).

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

## Coming soon

- [ ] AWS S3 integration — scan objects directly from S3 without downloading
- [ ] Cloudflare Workers support — edge-native scanning via the clamd TCP protocol
- [ ] NestJS official module — `PompelmiModule.forRoot()` with injectable `PompelmiService`

---

## License

[ISC](./LICENSE) — © pompelmi contributors

---

[pompelmi.app](https://pompelmi.app) · [npm](https://www.npmjs.com/package/pompelmi) · [GitHub](https://github.com/pompelmi/pompelmi)
