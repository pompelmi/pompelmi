// scan-with-timeout.js
// Two timeout patterns:
//   1. Clamd path — pass `timeout` in options; the socket is torn down after N ms of idle.
//   2. Local clamscan path — wrap scan() with Promise.race + a deadline timer.
// Run: node examples/scan-with-timeout.js

'use strict';

const path = require('path');
const { scan, Verdict } = require('pompelmi');

// Pattern 1 — clamd TCP scan with a 10 s socket timeout.
async function scanViaClamdWithTimeout(filePath) {
  return scan(path.resolve(filePath), {
    host:    '127.0.0.1',
    port:    3310,
    timeout: 10_000,
  });
}

// Pattern 2 — local clamscan with an external deadline.
function withDeadline(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Scan timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function scanLocalWithTimeout(filePath, timeoutMs = 10_000) {
  return withDeadline(scan(path.resolve(filePath)), timeoutMs);
}

(async () => {
  const filePath = './uploads/archive.zip';

  try {
    const result = await scanLocalWithTimeout(filePath, 10_000);
    console.log('Verdict:', result === Verdict.Clean ? 'clean' : result.description);
  } catch (err) {
    console.error('Scan failed or timed out:', err.message);
    process.exit(1);
  }
})();
