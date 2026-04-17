// scan-zip.js
// Scan a ZIP archive upload. ClamAV recurses into archives automatically,
// so this is identical to a plain file scan — just with extension validation.
// Run: node examples/scan-zip.js

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

const ALLOWED_EXTS = new Set(['.zip', '.tar', '.gz', '.tgz', '.bz2', '.7z', '.rar']);

function assertArchive(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error(`Unsupported archive type: ${ext}`);
  }
}

async function scanZip(filePath) {
  assertArchive(filePath);
  const resolved = path.resolve(filePath);
  const result   = await scan(resolved);

  if (result === Verdict.Malicious) {
    throw new Error(`Malicious archive rejected: ${resolved}`);
  }
  if (result === Verdict.ScanError) {
    // Encrypted or corrupt archives return ScanError — treat as untrusted.
    throw new Error(`Archive scan could not complete (possibly encrypted): ${resolved}`);
  }
  return resolved;
}

(async () => {
  const safeFile = await scanZip('./uploads/backup.zip');
  console.log('Archive accepted:', safeFile);
})();
