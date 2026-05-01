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
| `comment-on-pr` | Post a comment on the pull request listing infected files. Only fires when `GITHUB_EVENT_NAME` is `pull_request` and `GITHUB_TOKEN` is available. Set to `'false'` to disable. | No | `'true'` |

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
[![Scanned by pompelmi](https://img.shields.io/badge/scanned%20by-pompelmi-orange?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAQxlWElmTU0AKgAAAAgABwESAAMAAAABAAEAAAEaAAUAAAABAAAAYgEbAAUAAAABAAAAagEoAAMAAAABAAIAAAExAAIAAAA5AAAAcgE7AAIAAAASAAAArIdpAAQAAAABAAAAvgAAAAAAAABgAAAAAQAAAGAAAAABQ2FudmEgZG9jPURBSEdqUE42M19JIHVzZXI9VUFHZVZYTlJxNEkgYnJhbmQ9QkFHZVZib2RxREkAAFRvbW1hc28gQmVydG9jY2hpAAAGkAAABwAAAAQwMjEwkQEABwAAAAQBAgMAoAAABwAAAAQwMTAwoAEAAwAAAAEAAQAAoAIABAAAAAEAAAAOoAMABAAAAAEAAAAOAAAAAOn+IX8AAAAJcEhZcwAADsQAAA7EAZUrDhsAAAZHaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjY1NTM1PC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4xNTAwPC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6RXhpZlZlcnNpb24+MDIxMDwvZXhpZjpFeGlmVmVyc2lvbj4KICAgICAgICAgPGV4aWY6Rmxhc2hQaXhWZXJzaW9uPjAxMDA8L2V4aWY6Rmxhc2hQaXhWZXJzaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MTUwMDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOkNvbXBvbmVudHNDb25maWd1cmF0aW9uPgogICAgICAgICAgICA8cmRmOlNlcT4KICAgICAgICAgICAgICAgPHJkZjpsaT4xPC9yZGY6bGk+CiAgICAgICAgICAgICAgIDxyZGY6bGk+MjwvcmRmOmxpPgogICAgICAgICAgICAgICA8cmRmOmxpPjM8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaT4wPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOlNlcT4KICAgICAgICAgPC9leGlmOkNvbXBvbmVudHNDb25maWd1cmF0aW9uPgogICAgICAgICA8eG1wOkNyZWF0b3JUb29sPkNhbnZhIGRvYz1EQUhHalBONjNfSSB1c2VyPVVBR2VWWE5ScTRJIGJyYW5kPUJBR2VWYm9kcURJPC94bXA6Q3JlYXRvclRvb2w+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjk2PC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj45NjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPGRjOnRpdGxlPgogICAgICAgICAgICA8cmRmOkFsdD4KICAgICAgICAgICAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5Qcm9nZXR0byBzZW56YSB0aXRvbG8gLSAxPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOkFsdD4KICAgICAgICAgPC9kYzp0aXRsZT4KICAgICAgICAgPGRjOmNyZWF0b3I+CiAgICAgICAgICAgIDxyZGY6U2VxPgogICAgICAgICAgICAgICA8cmRmOmxpPlRvbW1hc28gQmVydG9jY2hpPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOlNlcT4KICAgICAgICAgPC9kYzpjcmVhdG9yPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4Kn4j/DQAAAeFJREFUKBWtUjtrFFEU/u68Z5zs7LLPhEgEG0ljETGFImgnNhKsYiEBLYU0KqiERaxEQbcRK8HCiH/AUrFVEEQQ0YiurvvIRp2d2ZnZeezJzIZZSAxi4S3uOffc73zfOede4H8vImJ/4/zj8t7Tc3MdixaYJ70RcsaL6uKd7m4E3M6g6TgrduBf7TQbF463zQX//rXDOzHJeZvixdrJTC7a89hreqdO62VntlzUZD+MAsd96HDqcuXS7X5KIqROYi8fWgom1nsFcX4SimFoYbeF4P1bXhUH54Mw+BZDbqT4can0HEIh7C4rhdx8xMtwbRv+18/wLROm08dgODz7sVaT08SRYjJB/+Wjm+KHzpWNxiswXQE/sxcYAoHVBjERJHIZs/NOiRMHSfKW4u+7hr9uLXk/XUCSwHEcqNWCVNkHafYIpHwJvKquTZ84GqaKW4nZZuS7Zhj0TbC8AfBirJqBV6+DYi7SJ6GVZuaMbOkZ/XitjRUZu2UNNXFVmVBAn9bANroQBA5CpQyKeyTPhZTVFebZByAbo/bGU6XWl2qvOE2cyo6xYtaPdPaEK04dVGR5kTxbo1+dJvrSCsuf6SWK295xVD/FMQYa+fHWfnB9v+4MDNP8Xp+qru76i1LsP9lNSkO4P3HUKYoAAAAASUVORK5CYII=)](https://github.com/pompelmi/pompelmi)
```

See [BADGE.md](../BADGE.md) for Markdown, HTML, and RST copy-paste snippets.

---

## How it works internally

The action is defined in [`action.yml`](../action.yml) at the repo root. The Docker image is built from [`action/Dockerfile`](../action/Dockerfile) using the repository root as the build context, so the pompelmi `src/` directory is bundled directly into the image — no npm install step needed. The entrypoint is [`action/entrypoint.sh`](../action/entrypoint.sh), which runs freshclam and then delegates to [`action/scanner.js`](../action/scanner.js).
