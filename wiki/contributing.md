# Contributing

Thank you for your interest in contributing to pompelmi. This page covers the repository structure, how to run tests, how to add examples, and how to submit a pull request.

---

## Repository structure

```
pompelmi/                     ← root
  src/
    index.js                  ← public entry point — re-exports all public functions
    ClamAVScanner.js          ← scan() implementation (local and TCP modes)
    ClamAVInstaller.js        ← ClamAVInstaller() — platform-native install
    ClamAVDatabaseUpdater.js  ← updateClamAVDatabase() — freshclam wrapper
    InstallerCommand.js       ← maps platform to [cmd, args]
    config.js                 ← frozen constants (commands, DB paths, scan codes)
    constants.js              ← PLATFORM export
  test/
    unit.test.js              ← mocked tests, no ClamAV required
    scan.test.js              ← integration tests, require clamscan in PATH
  examples/                   ← standalone runnable scripts
  package.json
  README.md
```

---

## Prerequisites

- **Node.js** LTS (v18, v20, or v22)
- **ClamAV** — for integration tests (`brew install clamav && freshclam` on macOS)
- **npm** or **pnpm**

---

## Setup

```bash
git clone https://github.com/pompelmi/pompelmi.git
cd pompelmi
npm install
```

There are zero runtime dependencies. `devDependencies` include only the test runner.

---

## Running tests

```bash
# All tests (unit + integration)
npm test

# Unit tests only (no ClamAV required)
node --test test/unit.test.js

# Integration tests only
node --test test/scan.test.js
```

Integration tests are skipped automatically when `clamscan` is not in PATH — they use this guard:

```js
const { execSync } = require('child_process');

function clamscanAvailable() {
  try {
    execSync('clamscan --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
```

---

## Lint

```bash
npm run lint
```

The project uses ESLint. Fix all lint errors before submitting a PR. Run `npm run lint -- --fix` for auto-fixable issues.

---

## The no-dependencies constraint

pompelmi has **zero runtime dependencies** and this is a core feature. Users trust that `npm install pompelmi` installs only pompelmi's source code — no transitive vulnerabilities, no large dependency trees, no breaking changes in upstream packages.

Before adding any runtime dependency:

1. Can it be implemented in < 20 lines of Node.js built-ins?
2. Is it strictly required, or just convenient?

If the answer to (1) is yes, implement it directly. The INSTREAM protocol implementation, the temp file management, and the stream handling are all done with Node.js built-ins for this reason.

`devDependencies` (test runners, linters) are not subject to this constraint.

---

## Adding an example

Examples live in `examples/` and must be:

- **Standalone** — runnable with `node examples/<name>.js` from the repo root
- **Self-contained** — no imports from files outside `examples/` or `src/`
- **Commented** — one short comment per non-obvious step
- **Focused** — each example demonstrates one concept

After adding an example, add a row to the Examples table in `README.md` and `wiki-api-reference.md`.

Example template:

```js
// examples/my-example.js
// One-line description of what this example demonstrates.

const { scan, Verdict } = require('..');

(async () => {
  // ...
})();
```

---

## Code style

- CommonJS modules (`require` / `module.exports`) — no ESM
- 2-space indentation
- Single quotes for strings
- Semicolons required
- No trailing whitespace
- No `console.log` in `src/` — use returned values or thrown errors

---

## Submitting a pull request

1. **Fork** the repository on GitHub.
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
3. **Make your changes** and ensure `npm test` and `npm run lint` both pass.
4. **Write or update tests** for any new behaviour in `test/unit.test.js` (mocked) and/or `test/scan.test.js` (integration).
5. **Open a PR** against `main` with a clear description of what changed and why.

PR title format: `feat: short description` / `fix: short description` / `docs: short description`

---

## Reporting bugs

Open an issue on GitHub with:

- Node.js version (`node --version`)
- ClamAV version (`clamscan --version`)
- OS and version
- Minimal reproduction script
- Actual vs expected behaviour

---

## Security vulnerabilities

Do not open a public GitHub issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

---

## Code of conduct

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing. All contributors are expected to treat each other with respect.
