// basic-scan.js
// Scan a single file and log the Verdict.
// Run: node examples/basic-scan.js
// Expects: clamscan installed and in PATH.

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

async function main() {
  const filePath = path.resolve('./uploads/document.pdf');

  const result = await scan(filePath);

  if (result === Verdict.Clean) {
    console.log('Clean:', filePath);
  } else if (result === Verdict.Malicious) {
    console.error('Malicious file detected:', filePath);
    process.exit(1);
  } else if (result === Verdict.ScanError) {
    console.warn('Scan could not complete — treating file as untrusted:', filePath);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Scan failed:', err.message);
  process.exit(1);
});
