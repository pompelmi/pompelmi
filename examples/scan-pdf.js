// scan-pdf.js
// Scan a PDF upload. Validates the MIME type before scanning.
// Run: node examples/scan-pdf.js

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

const ALLOWED_EXT = '.pdf';

function assertPdf(filePath) {
  if (path.extname(filePath).toLowerCase() !== ALLOWED_EXT) {
    throw new Error(`Expected a PDF, got: ${path.extname(filePath)}`);
  }
}

async function scanPdf(filePath) {
  assertPdf(filePath);
  const resolved = path.resolve(filePath);
  const result   = await scan(resolved);

  if (result === Verdict.Malicious) {
    throw new Error(`Malicious PDF rejected: ${resolved}`);
  }
  if (result === Verdict.ScanError) {
    throw new Error(`PDF scan could not complete: ${resolved}`);
  }
  return resolved;
}

(async () => {
  const safeFile = await scanPdf('./uploads/contract.pdf');
  console.log('PDF accepted:', safeFile);
})();
