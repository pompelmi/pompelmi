// scan-multiple-files.js
// Scan an array of files concurrently with Promise.all.
// All scans run in parallel; results are returned in the same order as the input.
// Run: node examples/scan-multiple-files.js

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

const FILES = [
  './uploads/invoice.pdf',
  './uploads/photo.jpg',
  './uploads/backup.zip',
];

async function scanAll(filePaths) {
  const results = await Promise.all(
    filePaths.map(async (filePath) => {
      const resolved = path.resolve(filePath);
      try {
        const verdict = await scan(resolved);
        return { file: resolved, verdict: verdict.description };
      } catch (err) {
        return { file: resolved, verdict: 'error', error: err.message };
      }
    })
  );

  const malicious = results.filter((r) => r.verdict === Verdict.Malicious.description);
  if (malicious.length > 0) {
    console.error('Malicious files found:', malicious.map((r) => r.file));
  }

  return results;
}

(async () => {
  const results = await scanAll(FILES);
  console.table(results);
})();
