#!/bin/sh
set -e

# ── Update ClamAV virus definitions ──────────────────────────────────────────
echo "[pompelmi] Updating ClamAV definitions via freshclam..."
freshclam --quiet || echo "[pompelmi] freshclam failed — continuing with existing definitions"

# ── Start clamd in background ─────────────────────────────────────────────────
echo "[pompelmi] Starting clamd..."
clamd &
CLAMD_PID=$!

# Wait for clamd socket/port to be ready
echo "[pompelmi] Waiting for clamd to be ready..."
for i in $(seq 1 30); do
  if clamdscan --no-summary /dev/null 2>/dev/null; then
    echo "[pompelmi] clamd is ready"
    break
  fi
  sleep 1
done

# ── Stats counters (stored in files for simplicity) ───────────────────────────
STATS_DIR=/tmp/pompelmi-stats
mkdir -p "$STATS_DIR"
echo 0 > "$STATS_DIR/total"
echo 0 > "$STATS_DIR/clean"
echo 0 > "$STATS_DIR/infected"
echo 0 > "$STATS_DIR/errors"

# ── Minimal HTTP server ───────────────────────────────────────────────────────
# Uses Node.js (already available from the base image)
node - <<'EOF'
'use strict';

const http      = require('http');
const fs        = require('fs');
const os        = require('os');
const path      = require('path');
const { execSync, exec } = require('child_process');
const { scanBuffer } = require('pompelmi');
const { Verdict } = require('pompelmi');

const PORT = 8080;
const STATS = { total: 0, clean: 0, infected: 0, errors: 0, startedAt: new Date().toISOString() };

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const boundary = (req.headers['content-type'] || '').split('boundary=')[1];
    if (!boundary) return reject(new Error('Missing multipart boundary'));

    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('error', reject);
    req.on('end', () => {
      const body   = Buffer.concat(chunks);
      const delim  = Buffer.from('\r\n--' + boundary);
      const parts  = [];
      let start    = body.indexOf('--' + boundary);

      while (start !== -1) {
        const headerEnd = body.indexOf('\r\n\r\n', start);
        if (headerEnd === -1) break;
        const headerStr = body.slice(start, headerEnd).toString();
        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const fileMatch = headerStr.match(/filename="([^"]+)"/);
        const dataStart = headerEnd + 4;
        const nextDelim = body.indexOf(delim, dataStart);
        const dataEnd   = nextDelim === -1 ? body.indexOf('\r\n--' + boundary + '--', dataStart) : nextDelim;
        if (dataEnd === -1) break;
        parts.push({
          name:     nameMatch  ? nameMatch[1]  : '',
          filename: fileMatch  ? fileMatch[1]  : '',
          data:     body.slice(dataStart, dataEnd),
        });
        start = body.indexOf('--' + boundary, dataEnd);
        if (body.slice(start, start + boundary.length + 6).toString().includes('--\r\n')) break;
      }
      resolve(parts);
    });
  });
}

function isClamdRunning() {
  try { execSync('clamdscan --no-summary /dev/null 2>/dev/null'); return true; }
  catch { return false; }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok', clamd: isClamdRunning() ? 'running' : 'unavailable' }));
  }

  if (req.method === 'GET' && req.url === '/stats') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ...STATS, uptime: process.uptime() }));
  }

  if (req.method === 'POST' && req.url === '/scan') {
    try {
      const parts = await parseMultipart(req);
      const filePart = parts.find(p => p.filename);
      if (!filePart) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'No file field in request' }));
      }

      STATS.total++;
      const verdict = await scanBuffer(filePart.data);

      let result;
      if (verdict === Verdict.Clean) {
        STATS.clean++;
        result = { verdict: 'clean', file: filePart.filename, viruses: [] };
      } else if (verdict === Verdict.Malicious) {
        STATS.infected++;
        result = { verdict: 'malicious', file: filePart.filename, viruses: [] };
      } else {
        STATS.errors++;
        result = { verdict: 'error', file: filePart.filename, viruses: [] };
      }

      res.writeHead(200);
      return res.end(JSON.stringify(result));
    } catch (err) {
      STATS.errors++;
      res.writeHead(500);
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[pompelmi] HTTP scan server listening on port ${PORT}`);
  console.log(`[pompelmi] POST /scan   — scan a file`);
  console.log(`[pompelmi] GET  /health — health check`);
  console.log(`[pompelmi] GET  /stats  — scan statistics`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT',  () => { server.close(); process.exit(0); });
EOF
