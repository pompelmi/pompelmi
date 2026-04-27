// scan-buffer.js
// Express route: scan an in-memory Buffer using multer memoryStorage + scanBuffer().
// memoryStorage never writes to disk — scanBuffer() handles the scan directly.
// In TCP mode (host/port options), no temp file is created at all.
// Run: node examples/scan-buffer.js
// Requires: express, multer  (npm install express multer)

'use strict';

const express = require('express');
const multer  = require('multer');
const { scanBuffer, Verdict } = require('pompelmi');

// memoryStorage keeps the upload in memory as req.file.buffer — no disk I/O.
const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  let result;
  try {
    // Pass the in-memory Buffer directly — no file path needed.
    result = await scanBuffer(req.file.buffer);
  } catch (err) {
    return res.status(500).json({ error: `Scan failed: ${err.message}` });
  }

  if (result === Verdict.Malicious) {
    return res.status(422).json({ error: 'Malicious file rejected.' });
  }

  if (result === Verdict.ScanError) {
    return res.status(422).json({ error: 'Scan incomplete — file rejected as precaution.' });
  }

  // File is clean — proceed with your upload logic here.
  return res.json({ ok: true, file: req.file.originalname, size: req.file.size });
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
