# CLI Usage

pompelmi can be used as a command-line tool for scripting, CI pipelines, and interactive scanning. This page shows how to build a CLI scanner with pompelmi and how to use it in shell scripts.

---

## Minimal CLI scanner

```js
#!/usr/bin/env node
// cli-scan.js

const { scan, scanDirectory, Verdict } = require('pompelmi');
const path = require('path');
const fs   = require('fs');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node cli-scan.js <file-or-dir> [file2] ...');
  process.exit(2);
}

const SCAN_OPTS = {
  host:    process.env.CLAMAV_HOST,
  port:    Number(process.env.CLAMAV_PORT) || 3310,
  timeout: Number(process.env.CLAMAV_TIMEOUT) || 30_000,
};

async function main() {
  let anyMalicious = false;

  for (const target of args) {
    const resolved = path.resolve(target);

    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch {
      console.error(`Not found: ${resolved}`);
      process.exit(2);
    }

    if (stat.isDirectory()) {
      const results = await scanDirectory(resolved, SCAN_OPTS);

      for (const f of results.clean)     console.log(`CLEAN     ${f}`);
      for (const f of results.malicious) console.log(`MALICIOUS ${f}`);
      for (const f of results.errors)    console.log(`ERROR     ${f}`);

      if (results.malicious.length > 0) anyMalicious = true;
    } else {
      const result = await scan(resolved, SCAN_OPTS);
      const label  = result.description.toUpperCase().padEnd(9);
      console.log(`${label} ${resolved}`);
      if (result === Verdict.Malicious) anyMalicious = true;
    }
  }

  // Exit code 1 if any malicious file found — useful for CI
  process.exit(anyMalicious ? 1 : 0);
}

main().catch(err => {
  console.error(err.message);
  process.exit(2);
});
```

Make it executable:

```bash
chmod +x cli-scan.js
```

---

## Usage examples

```bash
# Scan a single file
node cli-scan.js /path/to/file.pdf

# Scan multiple files
node cli-scan.js /uploads/a.pdf /uploads/b.zip

# Scan a directory recursively
node cli-scan.js /uploads/

# TCP mode (set env vars)
CLAMAV_HOST=127.0.0.1 node cli-scan.js /uploads/file.pdf
```

---

## Exit codes

| Exit code | Meaning |
|-----------|---------|
| `0` | All scanned files are clean |
| `1` | One or more malicious files found |
| `2` | Scan failed or argument error |

Exit code `1` for malicious is standard in shell scripting — makes it easy to use in `if` statements and CI pipelines.

---

## Shell scripting

```bash
#!/bin/bash
set -e

FILE="$1"

if [ -z "$FILE" ]; then
  echo "Usage: $0 <file>"
  exit 2
fi

node /usr/local/bin/cli-scan.js "$FILE"
STATUS=$?

if [ $STATUS -eq 1 ]; then
  echo "Upload rejected: malware detected."
  exit 1
elif [ $STATUS -eq 2 ]; then
  echo "Scan failed."
  exit 2
else
  echo "File is clean."
fi
```

---

## CI pipeline integration

### GitHub Actions

```yaml
# .github/workflows/scan-artifacts.yml
name: Scan artifacts

on:
  workflow_run:
    workflows: ["Build"]
    types: [completed]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ClamAV
        run: |
          sudo apt-get install -y clamav
          sudo freshclam

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Scan artifacts
        run: |
          npm ci
          node cli-scan.js dist/
          # Exits 1 if malicious files found — fails the job
```

### Pre-commit hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Scan staged files before commit
STAGED=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED" ]; then
  exit 0
fi

echo "$STAGED" | xargs node cli-scan.js

if [ $? -ne 0 ]; then
  echo "Commit blocked: malware detected in staged files."
  exit 1
fi
```

---

## Adding a global `pompelmi` command

Add to `package.json` to expose as a package binary:

```json
{
  "bin": {
    "pompelmi-scan": "./cli-scan.js"
  }
}
```

Install globally:

```bash
npm install -g pompelmi
pompelmi-scan /path/to/file.pdf
```

---

## Scanning directories and deleting malicious files

```js
#!/usr/bin/env node
// cli-purge.js — scan a directory and delete malicious files

const { scanDirectory, Verdict } = require('pompelmi');
const fs   = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || '.');

const results = await scanDirectory(dir, {
  host: process.env.CLAMAV_HOST,
  port: 3310,
});

console.log(`Scanned: ${results.clean.length + results.malicious.length + results.errors.length} files`);
console.log(`Clean:     ${results.clean.length}`);
console.log(`Malicious: ${results.malicious.length}`);
console.log(`Errors:    ${results.errors.length}`);

for (const f of results.malicious) {
  fs.unlinkSync(f);
  console.log(`Deleted: ${f}`);
}

process.exit(results.malicious.length > 0 ? 1 : 0);
```

---

## JSON output for piping to other tools

```js
// cli-scan-json.js — outputs JSON for use with jq
const results = [];
// ... scan logic ...

process.stdout.write(JSON.stringify({ files: results }, null, 2));
process.exit(anyMalicious ? 1 : 0);
```

```bash
node cli-scan-json.js /uploads/ | jq '.files[] | select(.verdict == "Malicious") | .path'
```
