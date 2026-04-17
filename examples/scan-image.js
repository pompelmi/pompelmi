// scan-image.js
// Scan an image upload. Validates the extension before scanning.
// Run: node examples/scan-image.js

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

function assertImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error(`Unsupported image type: ${ext}`);
  }
}

async function scanImage(filePath) {
  assertImage(filePath);
  const resolved = path.resolve(filePath);
  const result   = await scan(resolved);

  if (result === Verdict.Malicious) {
    throw new Error(`Malicious image rejected: ${resolved}`);
  }
  if (result === Verdict.ScanError) {
    throw new Error(`Image scan could not complete: ${resolved}`);
  }
  return resolved;
}

(async () => {
  const safeFile = await scanImage('./uploads/profile.jpg');
  console.log('Image accepted:', safeFile);
})();
