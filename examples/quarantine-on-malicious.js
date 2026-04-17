// quarantine-on-malicious.js
// Move infected files to a quarantine/ folder instead of deleting them.
// Useful when you need to preserve evidence for review.
// Run: node examples/quarantine-on-malicious.js

'use strict';

const path = require('path');
const fs   = require('fs');
const { scan, Verdict } = require('pompelmi');

const QUARANTINE_DIR = path.resolve('./quarantine');
fs.mkdirSync(QUARANTINE_DIR, { recursive: true });

async function quarantineIfMalicious(filePath) {
  const resolved = path.resolve(filePath);
  const result   = await scan(resolved);

  if (result === Verdict.Malicious) {
    const dest = path.join(QUARANTINE_DIR, path.basename(resolved));
    fs.renameSync(resolved, dest);
    console.log(`Quarantined: ${resolved} → ${dest}`);
    return 'quarantined';
  }

  if (result === Verdict.ScanError) {
    console.warn(`Scan incomplete — leaving file in place: ${resolved}`);
    return 'scan-error';
  }

  console.log(`Clean: ${resolved}`);
  return 'clean';
}

(async () => {
  const status = await quarantineIfMalicious('./uploads/suspicious.docx');
  console.log('Status:', status);
})();
