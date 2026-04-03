# Demo (Express upload gate)

![Pompelmi Express upload gate demo](./demo.gif)

This example runs a tiny Express server that scans an uploaded file before storage and returns a route-level verdict.

## What it shows

- memory-backed multipart upload handling
- `clean`, `suspicious`, or `malicious` JSON verdicts
- HTTP `422` when the route blocks the upload

## Run

From the repo root:

```bash
pnpm install
pnpm -C examples/demo dev
```

Open: http://localhost:3000

## API

- `POST /upload` (multipart field: `file`)
- Returns JSON with `verdict`, `reasons`, `durationMs`
- Returns HTTP `422` if the verdict is not `clean`

## Quick test (`curl`)

```bash
curl -F "file=@package.json;type=application/json" http://localhost:3000/upload
```

## Next step

- [Root README](../../README.md) for positioning, quick start, and proof points
- [Getting started](https://pompelmi.github.io/pompelmi/getting-started/) for the broader integration path
