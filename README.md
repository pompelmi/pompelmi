<p align="center">
  <img src="./src/grapefruit.png" width="96" alt="pompelmi logo">
</p>

<h1 align="center">pompelmi</h1>

<p align="center"><strong>ClamAV for humans</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi"><img src="https://img.shields.io/npm/v/pompelmi.svg" alt="npm version"></a>
  <img src="https://img.shields.io/badge/license-ISC-blue.svg" alt="license">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg" alt="platform">
  <a href="https://www.npmjs.com/package/pompelmi?activeTab=dependencies"><img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies"></a>
</p>

---

A minimal Node.js wrapper around [ClamAV](https://www.clamav.net/) that scans any file and returns a plain string: `"Clean"`, `"Malicious"`, or `"ScanError"`. No daemons. No cloud. No native bindings.

## Table of contents

- [Quickstart](#quickstart)
- [How it works](#how-it-works)
- [API](#api)
  - [pompelmi.scan()](#pompelmiscanfilepath-options)
- [Docker / remote scanning](#docker--remote-scanning)
- [Internal utilities](#internal-utilities)
  - [ClamAVInstaller()](#clamavinstaller)
  - [updateClamAVDatabase()](#updateclamavdatabase)
- [Supported platforms](#supported-platforms)
- [Installing ClamAV manually](#installing-clamav-manually)
- [Testing](#testing)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Quickstart

```bash
npm install pompelmi
```

```js
const pompelmi = require('pompelmi');

const result = await pompelmi.scan('/path/to/file.zip');
// "Clean" | "Malicious" | "ScanError"

if (result === 'Malicious') {
  throw new Error('File rejected: malware detected');
}
```

## How it works

1. **Validate** — pompelmi checks that the argument is a string and that the file exists before spawning anything.
2. **Scan** — pompelmi spawns `clamscan --no-summary <filePath>` as a child process and reads the exit code.
3. **Map** — the exit code is mapped to a result string. Unknown codes and spawn errors reject the Promise.

No stdout parsing. No regex. No surprises.

## API

### `pompelmi.scan(filePath, [options])`

```ts
pompelmi.scan(filePath: string, options?: { host?: string; port?: number; timeout?: number }): Promise<"Clean" | "Malicious" | "ScanError">
```

| Parameter  | Type     | Description                             |
|------------|----------|-----------------------------------------|
| `filePath` | `string` | Absolute or relative path to the file. |
| `options`  | `object` | Optional. Omit to use the local `clamscan` CLI. Pass `host` / `port` to scan via a clamd TCP socket instead. See [docs/api.md](./docs/api.md) for the full reference. |

**Resolves** to one of:

| Result        | ClamAV exit code | Meaning                                                                                              |
|---------------|:---:|------------------------------------------------------------------------------------------------------|
| `"Clean"`     |  0  | No threats found.                                                                                    |
| `"Malicious"` |  1  | A known virus or malware signature was matched.                                                      |
| `"ScanError"` |  2  | The scan itself failed (I/O error, encrypted archive, permission denied). File status is unknown — treat as untrusted. |

**Rejects** with an `Error` in these cases:

| Condition | Error message |
|-----------|---------------|
| `filePath` is not a string | `filePath must be a string` |
| File does not exist | `File not found: <path>` |
| `clamscan` is not in PATH | `ENOENT` (from the OS) |
| ClamAV returns an unknown exit code | `Unexpected exit code: N` |
| `clamscan` process is killed by a signal | `Process killed by signal: <SIGNAL>` |

**Example — full error handling:**

```js
const pompelmi = require('pompelmi');
const path = require('path');

async function safeScan(filePath) {
  try {
    const result = await pompelmi.scan(path.resolve(filePath));

    if (result === 'ScanError') {
      // The scan could not complete — treat the file as untrusted.
      console.warn('Scan incomplete, rejecting file as precaution.');
      return null;
    }

    return result; // "Clean" or "Malicious"
  } catch (err) {
    console.error('Scan failed:', err.message);
    return null;
  }
}
```

## Docker / remote scanning

If ClamAV runs in a Docker container (or anywhere on the network), pass `host` and `port` — everything else stays the same.

```js
const result = await pompelmi.scan('/path/to/upload.zip', {
  host: '127.0.0.1',
  port: 3310,
});
```

See [docs/docker.md](./docs/docker.md) for the `docker-compose.yml` snippet and first-boot notes.

---

## Internal utilities

These modules are not part of the public npm API but are used internally to set up the ClamAV environment on a fresh machine.

### `ClamAVInstaller()`

Installs ClamAV using the platform's native package manager. Skips silently if ClamAV is already installed.

```ts
ClamAVInstaller(): Promise<string>
```

- Resolves with a status message string on success or skip.
- Rejects if the install process exits with a non-zero code or if spawning the package manager fails.

| Platform | Package manager | Command |
|----------|----------------|---------|
| macOS    | Homebrew       | `brew install clamav` |
| Linux    | apt-get        | `sudo apt-get install -y clamav clamav-daemon` |
| Windows  | Chocolatey     | `choco install clamav -y` |

### `updateClamAVDatabase()`

Downloads or updates the ClamAV virus definition database by running `freshclam`. Skips if `main.cvd` is already present on disk.

```ts
updateClamAVDatabase(): Promise<string>
```

- Resolves with a status message string on success or skip.
- Rejects if `freshclam` exits with a non-zero code or if spawning fails.

| Platform | Database path |
|----------|--------------|
| macOS    | `/usr/local/share/clamav/main.cvd` |
| Linux    | `/var/lib/clamav/main.cvd` |
| Windows  | `C:\ProgramData\ClamAV\main.cvd` |

## Supported platforms

| OS      | ClamAV install            | DB path checked                    |
|---------|---------------------------|------------------------------------|
| macOS   | `brew install clamav`     | `/usr/local/share/clamav/main.cvd` |
| Linux   | `apt-get install clamav`  | `/var/lib/clamav/main.cvd`         |
| Windows | `choco install clamav -y` | `C:\ProgramData\ClamAV\main.cvd`   |

ClamAV must be installed on the host system. pompelmi does not bundle or download it.

## Installing ClamAV manually

```bash
# macOS
brew install clamav && freshclam

# Linux (Debian / Ubuntu)
sudo apt-get install -y clamav clamav-daemon && sudo freshclam

# Windows (Chocolatey)
choco install clamav -y
```

## Testing

```bash
npm test
```

The test suite has two parts:

- **Unit tests** (`test/unit.test.js`) — run with Node's built-in test runner. Mock `cross-spawn` and platform dependencies; no ClamAV installation required.
- **Integration tests** (`test/scan.test.js`) — spawn real `clamscan` processes against EICAR test files. Skipped automatically if `clamscan` is not found in PATH.

## Contributing

1. Fork the repository at [https://github.com/pompelmi/pompelmi](https://github.com/pompelmi/pompelmi).
2. Create a feature branch: `git checkout -b feat/your-change`.
3. Make your changes and run `npm test` to verify.
4. Open a pull request against `main`.

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing.

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## License

[ISC](./LICENSE) — © pompelmi contributors
