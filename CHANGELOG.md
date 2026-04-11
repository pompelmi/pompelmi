# Changelog

All notable changes to pompelmi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed
- Added `'error'` event handlers to all `spawn()` calls in `ClamAVScanner`, `ClamAVInstaller`, and `ClamAVDatabaseUpdater`. Previously, if the binary was not found in PATH, the Promise would hang indefinitely and Node.js would emit an unhandled error warning.
- `ClamAVInstaller` and `updateClamAVDatabase` now return a `Promise` instead of `undefined`. Callers can now `await` them and catch errors.
- `scan()` now rejects with a clear message when the `clamscan` process is killed by a signal (`code === null`): `Process killed by signal: <SIGNAL>`.
- `scan()` now rejects immediately with `filePath must be a string` if the argument is not a string.
- Moved `DB_PATHS` from `ClamAVDatabaseUpdater.js` into `config.js`, making it the single source of truth for all platform-specific configuration.
- All nested objects in `config.js` are now consistently frozen with `Object.freeze`.
- Removed `test/` from `.gitignore` — it was silently preventing new test files from being tracked by git.
- Fixed test file paths to use `path.join(__dirname, ...)` instead of paths relative to the working directory.
- Added missing semicolon in `constants.js`.

### Changed
- Renamed exit code 2 result from `"Suspicious"` to `"ScanError"` to accurately reflect that ClamAV encountered an error completing the scan (not that the file itself is suspicious). **This is a breaking change for any code that checks `result === 'Suspicious'`.**
- Added `UNEXPECTED_EXIT_CODE` and `PROCESS_KILLED` entries to the `MESSAGES` constant in `ClamAVScanner.js` for consistency with the existing MESSAGES pattern.

### Added
- Unit test suite (`test/unit.test.js`) using Node's built-in `node:test` runner. Covers `InstallerCommand`, `ClamAVScanner`, `ClamAVInstaller`, and `ClamAVDatabaseUpdater` with mocked dependencies — no ClamAV installation required.
- Integration tests (`test/scan.test.js`) now skip automatically with a clear message if `clamscan` is not found in PATH.

---

## [1.0.0] — 2024-01-01

### Added
- Initial release.
- `pompelmi.scan(filePath)` — scans a file using ClamAV and returns `"Clean"`, `"Malicious"`, or `"ScanError"`.
- `ClamAVInstaller()` — installs ClamAV via the platform's native package manager (Homebrew / apt-get / Chocolatey). Skips if already installed.
- `updateClamAVDatabase()` — runs `freshclam` to download virus definitions. Skips if `main.cvd` is already present.
- Support for macOS, Linux (Debian/Ubuntu), and Windows.
- No stdout parsing — result is determined entirely by ClamAV's exit code.

[Unreleased]: https://github.com/pompelmi/pompelmi/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/pompelmi/pompelmi/releases/tag/v1.0.0
