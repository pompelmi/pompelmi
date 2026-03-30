---
title: CI/CD artifact scanning
description: Scan build artifacts, fixtures, and generated archives in CI/CD with Pompelmi before they ship or get promoted inside your pipeline.
---

Upload security is not only for runtime routes. CI/CD pipelines also handle archives, generated bundles, fixtures, and user-supplied samples that deserve inspection before promotion.

## Practical fit

- Build output that contains generated ZIPs or WASM bundles.
- Repository fixtures or sample files.
- Packages or assets pulled into internal distribution workflows.

## CLI entry point

```bash
npx @pompelmi/cli scan:dir ./dist --format json
```

Use the JSON output to fail a pipeline on anything that should not be promoted.

## Continue

- [Using Pompelmi in CI/CD to scan build artifacts](/pompelmi/blog/cicd-scan-build-artifacts/)
- [Archive / ZIP upload security](./archive-zip-upload-security/)
- [Node.js file upload security checklist](../tutorials/nodejs-file-upload-security-checklist/)
