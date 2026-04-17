// handle-scan-error.js
// Demonstrates how to handle every possible scan outcome, including the
// Verdict.ScanError case (encrypted archive, I/O error, permission denied)
// and hard errors where scan() itself rejects (file missing, clamscan not installed).
// Run: node examples/handle-scan-error.js

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

async function safeScan(filePath) {
  try {
    const result = await scan(path.resolve(filePath));

    switch (result) {
      case Verdict.Clean:
        return { ok: true, verdict: 'clean' };
      case Verdict.Malicious:
        return { ok: false, verdict: 'malicious' };
      case Verdict.ScanError:
        // ClamAV returned exit code 2: encrypted archive, I/O error, or corrupt file.
        // Treat the file as untrusted — do not allow it through.
        console.warn(`[warn] Scan incomplete for ${filePath} — rejecting as precaution.`);
        return { ok: false, verdict: 'scan-error' };
      default:
        return { ok: false, verdict: 'unknown' };
    }
  } catch (err) {
    // Hard failures: file missing, clamscan not in PATH, process killed.
    console.error(`[error] scan() threw for ${filePath}:`, err.message);
    return { ok: false, verdict: 'error', message: err.message };
  }
}

(async () => {
  const result = await safeScan('./uploads/report.pdf');
  console.log(result);
})();
