// scan-directory.js
// Recursively scan every file in a directory with scanDirectory().
// Clean/malicious/error paths are returned in separate arrays.
// Run: node examples/scan-directory.js [directory]
//
// WARNING: this example calls fs.unlinkSync on malicious files.
// Point it at a safe test directory before running.

'use strict';

const fs   = require('fs');
const path = require('path');
const { scanDirectory } = require('pompelmi');

const TARGET_DIR = process.argv[2] || './uploads';

(async () => {
  const resolved = path.resolve(TARGET_DIR);
  console.log(`Scanning directory: ${resolved}\n`);

  const { clean, malicious, errors } = await scanDirectory(resolved);

  console.log(`Clean    (${clean.length}):`);
  clean.forEach((f) => console.log(`  ✔  ${f}`));

  console.log(`\nMalicious (${malicious.length}):`);
  malicious.forEach((f) => console.log(`  ✘  ${f}`));

  console.log(`\nErrors   (${errors.length}):`);
  errors.forEach((f) => console.log(`  ?  ${f}`));

  if (malicious.length > 0) {
    console.log('\nDeleting malicious files…');
    malicious.forEach((f) => {
      fs.unlinkSync(f);
      console.log(`  deleted: ${f}`);
    });
  }

  process.exit(malicious.length > 0 ? 1 : 0);
})();
