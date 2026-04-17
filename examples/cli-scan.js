// cli-scan.js
// Accept one or more file paths as CLI arguments and print their verdicts.
// Exit code 0 = all clean; 1 = at least one threat or error.
// Run: node examples/cli-scan.js ./uploads/file1.pdf ./uploads/file2.zip

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: node cli-scan.js <file> [file ...]');
  process.exit(1);
}

(async () => {
  let exitCode = 0;

  for (const file of files) {
    const resolved = path.resolve(file);
    try {
      const result = await scan(resolved);
      const label  = result.description.toUpperCase().padEnd(10);
      console.log(`${label} ${resolved}`);
      if (result !== Verdict.Clean) exitCode = 1;
    } catch (err) {
      console.error(`ERROR      ${resolved}: ${err.message}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
})();
