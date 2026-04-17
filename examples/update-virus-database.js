// update-virus-database.js
// Download or update the ClamAV virus definition database via freshclam.
// Skips if the database file is already present on disk.
// NOTE: updateClamAVDatabase is an internal utility, not exported from the main package entry.
//       Require it directly from the source path as shown below.
// Run: node examples/update-virus-database.js

'use strict';

const { updateClamAVDatabase } = require('pompelmi/src/ClamAVDatabaseUpdater.js');

updateClamAVDatabase()
  .then((msg) => {
    console.log(msg);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database update failed:', err.message);
    process.exit(1);
  });
