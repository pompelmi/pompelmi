// scan-buffer.js
// Scan an in-memory Buffer by writing it to a temp file, scanning, then cleaning up.
// NOTE: pompelmi's scan() API accepts file paths only — this is a thin wrapper
//       to handle the Buffer → temp file → scan → cleanup lifecycle.
// Run: node examples/scan-buffer.js

'use strict';

const os   = require('os');
const path = require('path');
const fs   = require('fs');
const { scan, Verdict } = require('pompelmi');

async function scanBuffer(buffer) {
  const tmpPath = path.join(os.tmpdir(), `pompelmi-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    return await scan(tmpPath);
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}

(async () => {
  // In real usage, `buffer` would come from a multipart parser, S3 download, etc.
  const buffer = fs.readFileSync('./uploads/document.pdf');
  const result = await scanBuffer(buffer);

  if (result === Verdict.Malicious) {
    console.error('Buffer contained malware.');
    process.exit(1);
  }

  console.log('Buffer is clean. Verdict:', result.description);
})();
