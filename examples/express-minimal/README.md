

# pompelmi — Minimal Express demo

Tiny Express server that shows how to do **pre‑quarantine scanning** with [pompelmi](https://github.com/pompelmi/pompelmi).

## Features
- Upload via `POST /upload` (in‑memory; 25 MB limit)
- Scans bytes with `composeScanners(...)`
- **Blocks** suspicious/malicious with HTTP `422`
- Returns JSON with `verdict` and any `events`

## Prerequisites
- Node.js 18+ and npm

## Run
```bash
cd examples/express-minimal
npm i
npm run start
# or: npm run dev
```
Server: http://localhost:3000

## API
### POST `/upload`
Form field: `file` (single file)

**Response:**
- `200` — `{ ok: true, verdict: "clean", events: [] }`
- `422` — `{ ok: false, verdict: "suspicious"|"malicious", events: [...] }`
- `400` — `{ error: "file required" }`

## Quick tests
Clean upload:
```bash
echo "hello world" > clean.txt
curl -sS -F "file=@clean.txt" http://localhost:3000/upload | jq
```

If you added a YARA adapter (see docs) you can trigger a block with the **EICAR** test string (safe AV test):
```bash
cat > eicar.txt <<'EOF'
X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
EOF
curl -i -sS -F "file=@eicar.txt" http://localhost:3000/upload
```
- Without YARA: likely `200` + `clean`
- With YARA rule `EICAR_Test_File`: `422` + `malicious`

## How it works (summary)
- Uses `multer.memoryStorage()` to keep bytes in RAM until verdict
- Calls `scanner.scan(buffer)` where `scanner = composeScanners([["heuristics", CommonHeuristicsScanner]], {...})`
- Maps scan `events` → `verdict` and rejects early (no disk writes)

## Configure
- Change file size limit in `index.mjs` (`limits.fileSize`)
- Set port with `PORT=4000 npm run start`

## Next steps
- Plug a YARA adapter and rules: see `/docs/detection/yara/getting-started.md` and `/rules/starter/*.yar`
- Add persistence (save to disk/S3) **only after** a `clean` verdict
- Add ZIP safety checks and MIME sniffing for defense‑in‑depth