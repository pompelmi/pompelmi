# GitHub Action

The `pompelmi/pompelmi` GitHub Action scans a repository (or a subdirectory) for viruses on every push or pull request. ClamAV is bundled inside a Docker container — no external services, no secrets, no pre-installed dependencies required in the target repo.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Pompelmi%20ClamAV%20Scanner-blue?logo=github)](https://github.com/marketplace/actions/pompelmi-clamav-scanner)

---

## What the Action does

1. Builds a Docker image from `action/Dockerfile` (`node:20-slim` + ClamAV).
2. Runs `freshclam --quiet` to pull the latest virus definitions.
3. Resolves the `path` input relative to `$GITHUB_WORKSPACE`.
4. Calls pompelmi's `scanDirectory` (for a directory input) or `scan` (for a single file).
5. Writes `status` and `infected-files` to `$GITHUB_OUTPUT`.
6. Posts a scan summary table to `$GITHUB_STEP_SUMMARY` (visible in the Actions UI).
7. Exits `1` if `fail-on-virus: 'true'` and any infected files were found.

---

## Minimal usage

```yaml
- uses: actions/checkout@v4
- uses: pompelmi/pompelmi@v1.8.0
```

That's it. The action scans the full workspace (`.`) and fails the step on any detection.

---

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `path` | Directory or file to scan, relative to the workspace root | No | `.` (full workspace) |
| `fail-on-virus` | Set to `'false'` to continue the workflow even when infected files are found | No | `'true'` |

---

## Outputs

| Output | Description |
|--------|-------------|
| `status` | `"clean"` or `"infected"` |
| `infected-files` | Newline-separated list of absolute paths to infected files. Empty string when clean. |

Outputs are available to subsequent steps via `${{ steps.<id>.outputs.<name> }}`.

---

## Example: scan on every PR

```yaml
name: Virus Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: ['**']

jobs:
  scan:
    name: ClamAV Virus Scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Scan for viruses
        id: scan
        uses: pompelmi/pompelmi@v1.8.0
        with:
          path: '.'
          fail-on-virus: 'true'

      - name: Report result
        if: always()
        run: |
          echo "Status: ${{ steps.scan.outputs.status }}"
          echo "Infected: ${{ steps.scan.outputs.infected-files }}"
```

A ready-to-copy copy of this workflow is at [`.github/workflows/action-example.yml`](../.github/workflows/action-example.yml).

---

## Example: scan only uploads/, continue on detection

```yaml
- uses: actions/checkout@v4

- name: Scan uploads directory
  id: scan
  uses: pompelmi/pompelmi@v1.8.0
  with:
    path: 'uploads/'
    fail-on-virus: 'false'   # don't fail — handle in the next step

- name: Handle infected files
  if: steps.scan.outputs.status == 'infected'
  run: |
    echo "Infected files detected:"
    echo "${{ steps.scan.outputs.infected-files }}"
    exit 1
```

---

## Job summary

After each run, the action writes a summary table to the Actions UI:

```
✅ ClamAV Scan Results

| Metric        | Count |
|---------------|-------|
| Files scanned | 142   |
| Clean         | 142   |
| Infected      | 0     |
| Errors        | 0     |
```

If infected files are found, the table is followed by a `### Infected Files` section listing each path.

---

## Layer caching and build time

The action uses a Docker-based runner (`using: 'docker'`). GitHub Actions caches Docker image layers between runs on the same runner, so build time depends on cache state:

| Run | What happens | Typical time |
|-----|-------------|--------------|
| First run (cold cache) | Pulls `node:20-slim`, installs `clamav` + `clamav-freshclam`, copies source | 30–90 s |
| Subsequent runs (warm cache) | Layers reused; only `freshclam` runs fresh | 10–30 s |

The `freshclam` step always runs at container start to fetch the latest definitions. If freshclam cannot reach the update servers, the action falls back to the definitions bundled at image build time and prints a warning.

Cache is tied to the runner. Self-hosted runners retain the cache across jobs; GitHub-hosted runners warm the cache within the same workflow run but may start cold on the next trigger.

---

## Add this badge to your repo

Show that your repository uses pompelmi for antivirus scanning:

```markdown
[![Scanned by pompelmi](https://img.shields.io/badge/scanned%20by-pompelmi-orange?logo=github)](https://github.com/pompelmi/pompelmi)
```

See [BADGE.md](../BADGE.md) for Markdown, HTML, and RST copy-paste snippets.

---

## How it works internally

The action is defined in [`action.yml`](../action.yml) at the repo root. The Docker image is built from [`action/Dockerfile`](../action/Dockerfile) using the repository root as the build context, so the pompelmi `src/` directory is bundled directly into the image — no npm install step needed. The entrypoint is [`action/entrypoint.sh`](../action/entrypoint.sh), which runs freshclam and then delegates to [`action/scanner.js`](../action/scanner.js).
