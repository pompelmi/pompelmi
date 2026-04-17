// install-clamav.js
// Programmatically install ClamAV using the platform's native package manager.
// Safe to run multiple times — skips silently if ClamAV is already installed.
// NOTE: ClamAVInstaller is an internal utility, not exported from the main package entry.
//       Require it directly from the source path as shown below.
// Run: node examples/install-clamav.js

'use strict';

const { ClamAVInstaller } = require('pompelmi/src/ClamAVInstaller.js');

ClamAVInstaller()
  .then((msg) => {
    console.log(msg);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Installation failed:', err.message);
    process.exit(1);
  });
