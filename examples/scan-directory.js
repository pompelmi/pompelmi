// scan-directory.js
// Walk a directory recursively and scan every file.
// Prints a summary table with each file's verdict.
// Run: node examples/scan-directory.js [directory]

'use strict';

const path = require('path');
const fs   = require('fs');
const { scan, Verdict } = require('pompelmi');

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files   = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function scanDirectory(dir) {
  const files   = walkDir(path.resolve(dir));
  let   clean   = 0;
  let   threats = 0;
  let   errors  = 0;

  for (const filePath of files) {
    try {
      const result = await scan(filePath);
      if (result === Verdict.Malicious) {
        console.error(`MALICIOUS  ${filePath}`);
        threats++;
      } else if (result === Verdict.ScanError) {
        console.warn(`SCAN-ERROR ${filePath}`);
        errors++;
      } else {
        console.log(`clean      ${filePath}`);
        clean++;
      }
    } catch (err) {
      console.error(`ERROR      ${filePath}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Clean: ${clean}  Malicious: ${threats}  Errors: ${errors}`);
  return threats === 0 && errors === 0;
}

const target = process.argv[2] || './uploads';
scanDirectory(target).then((ok) => process.exit(ok ? 0 : 1));
