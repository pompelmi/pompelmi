# Demo (Express upload gate)

![Demo GIF placeholder](./demo.gif)

This example runs a tiny Express server that scans an uploaded file before you store it.

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

## Replace the GIF

Replace `demo.gif` with a short screen recording once you're happy with the UX.
