// scan-with-options.js
// Scan a file via a remote clamd instance (e.g. Docker) with custom host, port, and timeout.
// Use this when ClamAV runs as a separate service on the network rather than locally.
// Run: node examples/scan-with-options.js
// Expects: a clamd container reachable at 127.0.0.1:3310

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

async function main() {
  const filePath = path.resolve('./uploads/archive.zip');

  const result = await scan(filePath, {
    host:    '127.0.0.1',
    port:    3310,
    timeout: 30_000, // 30 s socket idle timeout
  });

  console.log(`Verdict for ${path.basename(filePath)}: ${result.description}`);

  if (result === Verdict.Malicious) process.exit(1);
}

main().catch((err) => {
  console.error('Scan failed:', err.message);
  process.exit(1);
});
