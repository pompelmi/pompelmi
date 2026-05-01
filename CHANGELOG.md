# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2026-05-01

### Added
- `middleware(opts)` — Express/Fastify middleware that scans multer-uploaded files (`req.file` / `req.files`) and rejects requests with HTTP 403 if a virus is detected. Accepts all `scanBuffer` options (TCP/socket). Exported from the main module.
- GitHub Action now writes `report.json` and `report.html` after each scan and uploads them as a GitHub Actions artifact named `pompelmi-scan-report`. Requires `@actions/artifact` v2 in the action runtime.
- "Scanned by pompelmi" shields.io badge — added to `README.md`, copy-paste instructions in `BADGE.md` and `docs/github-action.md`.

---

## [1.5.0] - 2026-04-29

### Added
- `scanDirectory(dirPath, [options])` — recursively scan every file in a directory. Returns `{ clean, malicious, errors }` arrays. Per-file errors are caught and collected without aborting the full scan.
- Exported `scanDirectory` from the main module.

### Changed
- README badge section redesigned: framework support badges (Express, Fastify, NestJS, Koa, Hono, Next.js, SvelteKit, Remix, Docker) and CI badges now displayed in organized rows.

## [1.4.0] - 2026-04-28

### Added
- `scanStream(stream, [options])` — scan any Node.js Readable stream directly. In TCP mode, the stream is piped to clamd via INSTREAM protocol with no disk I/O. In local mode, a temp file is used and deleted automatically.
- Exported `scanStream` from the main module alongside `scan`, `scanBuffer`, and `Verdict`.

## [1.3.0] - 2026-04-27

### Added
- `scanBuffer(buffer, [options])` — scan an in-memory Buffer directly. In TCP mode, the buffer is streamed to clamd without writing to disk. In local mode, a temp file is used and deleted automatically.
- Exported `scanBuffer` from the main module alongside `scan` and `Verdict`.

## [1.2.0] - 2025-11-10

### Added
- Unit test suite (`test/unit.test.js`) using Node's built-in `node:test` runner — covers `ClamAVScanner`, `ClamAVInstaller`, and `ClamAVDatabaseUpdater` with mocked dependencies; no ClamAV installation required
- Integration tests (`test/scan.test.js`) now skip automatically with a clear message if `clamscan` is not found in `PATH`
- `'error'` event handlers on all `spawn()` calls — prevents indefinite hangs when the binary is missing from `PATH`

### Changed
- `ClamAVInstaller` and `updateClamAVDatabase` now return a `Promise` so callers can `await` them and catch errors
- `DB_PATHS` moved from `ClamAVDatabaseUpdater.js` into `config.js` as the single source of truth for platform-specific paths
- All nested objects in `config.js` frozen with `Object.freeze`

### Fixed
- `scan()` now rejects with `Process killed by signal: <SIGNAL>` when the `clamscan` process is killed, instead of rejecting with an unhelpful exit-code error
- `scan()` now rejects immediately with `filePath must be a string` when passed a non-string argument
- Removed `test/` from `.gitignore` that was silently preventing test files from being tracked by git

## [1.1.0] - 2025-08-20

### Added
- Remote/Docker scanning via TCP using the ClamAV `INSTREAM` protocol — stream any file to a running `clamd` daemon without a local ClamAV install
- `host`, `port`, and `timeout` options on `scan()` for clamd TCP configuration (default timeout: 15 000 ms)
- TypeScript type declarations shipped inline (`src/index.d.ts`)
- Expanded `examples/` directory: `scan-buffer.js`, `quarantine-on-malicious.js`, `s3-scan-before-upload.js`, `rest-api-server.js`, `cli-scan.js`, `scan-directory.js`, `scan-pdf.js`, `scan-image.js`, `scan-zip.js`, `typescript-usage.ts`

### Changed
- Exit code 2 result renamed from `"Suspicious"` to `"ScanError"` to accurately reflect a scan I/O failure rather than file suspicion — **breaking change** for code checking `result === 'Suspicious'`
- Verdicts changed from plain strings to typed `Symbol` constants (`Verdict.Clean`, `Verdict.Malicious`, `Verdict.ScanError`) with `.description` properties for safe serialisation — **breaking change** for string equality checks
- `scan()` now resolves the file path before spawning `clamscan`, surfacing missing-file errors as rejections rather than `ScanError`

## [1.0.0] - 2025-07-18

### Added
- `scan(filePath, [options])` — single async function returning a typed `Promise<symbol>`
- `Verdict.Clean`, `Verdict.Malicious`, `Verdict.ScanError` — Symbol constants each with a `.description` property
- Local scanning mode — spawns `clamscan --no-summary <filePath>` and maps exit code to a verdict; no stdout parsing, no regex
- `ClamAVInstaller()` — installs ClamAV via Homebrew, apt-get, or Chocolatey depending on platform; skips if already installed
- `updateClamAVDatabase()` — runs `freshclam` to download virus definitions; skips if database already present
- Support for macOS, Linux (Debian/Ubuntu), and Windows
- EICAR-based integration test suite that auto-skips when `clamscan` is absent
- Zero runtime dependencies

[1.2.0]: https://github.com/pompelmi/pompelmi/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/pompelmi/pompelmi/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/pompelmi/pompelmi/releases/tag/v1.0.0
