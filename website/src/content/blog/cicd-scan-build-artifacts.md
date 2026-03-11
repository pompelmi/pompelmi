---
title: "Using Pompelmi in CI/CD to Scan Build Artifacts and Uploaded Assets"
description: "Add pompelmi's CLI to your CI/CD pipeline to scan build artifacts, user-supplied files, and dependency assets before they ship to production. Exit codes included."
pubDate: 2024-10-01
author: "Pompelmi Team"
tags: ["ci-cd", "devops", "security", "cli", "github-actions"]
---

# Using Pompelmi in CI/CD to Scan Build Artifacts and Uploaded Assets

File upload scanning in production is reactive — you catch threats as users send them. But supply chain security requires a proactive step: scanning files before they get shipped. Build artifacts, vendored assets, user-supplied files in your repo, and generated archives can all carry hidden threats.

**TL;DR:** The `pompelmi` CLI (via `@pompelmi/cli`) scans files and directories and exits with non-zero status on findings. Wire it into your GitHub Actions, GitLab CI, or any CI/CD pipeline to block deployments when artifacts contain suspicious content.

---

## What to Scan in CI/CD

Not every artifact needs scanning, but some categories are high-value targets:

| Artifact type | Threat | When to scan |
|---|---|---|
| User-uploaded files in your repo | Malware, backdoors | On PR + push |
| Generated ZIP archives | ZIP bombs, embedded executables | Post-build |
| Vendored binary assets | Supply chain compromise | On dependency update |
| Test fixtures | Accidentally committed real malware | On push |
| Email attachment samples | Processing pipeline testing | On push |

---

## Installing the CLI

```bash
# Global install (for local usage)
npm install -g @pompelmi/cli

# Or as a dev dependency (for CI)
npm install --save-dev @pompelmi/cli
```

The CLI is a standalone Node.js binary with no native dependencies by default (YARA requires the YARA engine).

---

## CLI Usage

### Scan Individual Files

```bash
# Scan one or more files
pompelmi scan output.zip report.pdf build/bundle.js

# Table output (default)
# File           Size     Verdict    Matches
# ─────────────────────────────────────────────
# output.zip     2.1 MB   clean      —
# report.pdf     512 KB   suspicious pdf_risky_actions (suspicious)
# build/bundle.js 48 KB   clean      —

# JSON output for machine processing
pompelmi scan output.zip --format json | jq .results
```

### Scan a Directory

```bash
# Scan all files in a directory
pompelmi scan:dir ./uploads --ext pdf,docx,zip

# With explicit config
pompelmi scan:dir ./dist --format json
```

### Exit Codes

The CLI uses exit codes that map to CI/CD conventions:

| Exit code | Meaning |
|---|---|
| `0` | All files clean |
| `1` | Internal error / usage error |
| `2` | One or more files flagged as malicious |

`suspicious` findings print a warning but do not cause a non-zero exit by default. To treat `suspicious` as a failure in strict pipelines, check the JSON output:

```bash
pompelmi scan ./uploads --format json > scan_results.json
jq -e '.results | any(.verdict != "clean")' scan_results.json
```

---

## GitHub Actions Integration

### Basic Workflow

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  scan-artifacts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Pompelmi CLI
        run: npm install --global @pompelmi/cli

      # Scan any samples, fixtures, or user-provided files in the repo
      - name: Scan samples directory
        run: pompelmi scan:dir ./samples --ext pdf,zip,docx,xlsx

      # Scan build artifacts after build
      - name: Build
        run: npm run build

      - name: Scan build output
        run: pompelmi scan:dir ./dist --ext zip,js,wasm
```

### Fail on Any Suspicious Finding

```yaml
      - name: Scan with strict mode
        run: |
          pompelmi scan ./uploads --format json > scan.json
          if jq -e '.results | any(.verdict != "clean")' scan.json > /dev/null; then
            echo "=== Scan findings ==="
            jq '.results[] | select(.verdict != "clean")' scan.json
            echo "=== SCAN FAILED ==="
            exit 1
          fi
          echo "All files clean"
```

### Uploading Scan Results as SARIF

If your repository uses GitHub Advanced Security, you can upload scan results as SARIF for the Security tab:

```yaml
      - name: Scan and generate SARIF
        run: |
          pompelmi scan:dir ./uploads --format json > scan.json

      - name: Convert to SARIF
        run: node scripts/pompelmi-to-sarif.mjs scan.json > findings.sarif

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: findings.sarif
```

A minimal SARIF converter:

```javascript
// scripts/pompelmi-to-sarif.mjs
import { readFileSync } from 'fs';

const scanJson = JSON.parse(readFileSync(process.argv[2], 'utf-8'));

const runs = [{
  tool: {
    driver: {
      name: 'pompelmi',
      version: '0.33.0',
      rules: [],
    },
  },
  results: scanJson.results
    .filter((r) => r.verdict !== 'clean')
    .map((r) => ({
      ruleId: r.matches?.[0]?.rule ?? 'unknown',
      level: r.verdict === 'malicious' ? 'error' : 'warning',
      message: { text: `File "${r.file}" flagged as ${r.verdict}` },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: r.file },
        },
      }],
    })),
}];

process.stdout.write(JSON.stringify({ version: '2.1.0', runs }, null, 2));
```

---

## GitLab CI Integration

```yaml
# .gitlab-ci.yml
scan-artifacts:
  stage: test
  image: node:20
  script:
    - npm install -g @pompelmi/cli
    - pompelmi scan:dir ./samples --format json > scan.json
    - |
      FLAGGED=$(node -e "
        const r = JSON.parse(require('fs').readFileSync('scan.json'));
        const bad = r.results.filter(x => x.verdict !== 'clean');
        if (bad.length) { console.log(JSON.stringify(bad, null, 2)); process.exit(1); }
      ")
  artifacts:
    reports:
      sast: scan.json
    when: always
```

---

## Scanning Dependency Assets

After `npm install`, your `node_modules` shouldn't contain executables or macro-enabled files. Scanning them is defensive:

```bash
# Scan for executables and suspicious archives in node_modules
pompelmi scan:dir ./node_modules --ext exe,dll,bat,zip --format json \
  | jq '.results[] | select(.verdict != "clean")'
```

This is practical for auditing new dependencies added to a project, not for every CI run (scanning all of node_modules is slow).

---

## Scanning User-Uploaded Files Before Storage

In pipelines where uploads are received to a staging area before final storage (common in async processing architectures), scan the staging directory in CI-adjacent tooling:

```typescript
// scripts/scan-staging.ts
import { scanFile } from 'pompelmi';
import { readdirSync } from 'fs';
import { join } from 'path';

const stagingDir = process.env.STAGING_DIR ?? './tmp/uploads';
const files = readdirSync(stagingDir);
let hasFindings = false;

for (const file of files) {
  const report = await scanFile(join(stagingDir, file));
  if (!report.ok) {
    console.error(`[blocked] ${file} → ${report.verdict}`, report.matches);
    hasFindings = true;
  }
}

process.exit(hasFindings ? 2 : 0);
```

---

## Watch Mode for Development

When developing upload-handling code locally, use watch mode to scan files as they're written to a directory:

```bash
pompelmi watch ./tmp/uploads
```

Watch mode scans newly created files automatically — useful during integration testing of upload pipelines.

---

## Summary

The Pompelmi CLI brings the same in-process scanning available in your web server to your CI/CD pipeline. Scan samples directories, generated artifacts, and user-provided test fixtures as part of every build. Use exit codes to fail builds on findings, or export JSON for richer downstream processing (SARIF, metrics, dashboards).

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: EICAR testing — verify your scanner works](/pompelmi/blog/eicar-testing-upload-scanners/)
- [Blog: Reason codes and observability](/pompelmi/blog/reason-codes-security-observability/)
