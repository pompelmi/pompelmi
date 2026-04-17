// delete-on-malicious.js
// Scan a file and automatically delete it if ClamAV finds malware.
// Suitable for batch jobs where infected files should be removed immediately.
// Run: node examples/delete-on-malicious.js

'use strict';

const path = require('path');
const fs   = require('fs');
const { scan, Verdict } = require('pompelmi');

async function scanAndDelete(filePath) {
  const resolved = path.resolve(filePath);
  const result   = await scan(resolved);

  if (result === Verdict.Malicious) {
    fs.unlinkSync(resolved);
    console.log(`Deleted malicious file: ${resolved}`);
    return false;
  }

  if (result === Verdict.ScanError) {
    console.warn(`Scan incomplete, skipping: ${resolved}`);
    return false;
  }

  console.log(`Clean: ${resolved}`);
  return true;
}

(async () => {
  const clean = await scanAndDelete('./uploads/attachment.zip');
  process.exit(clean ? 0 : 1);
})();
