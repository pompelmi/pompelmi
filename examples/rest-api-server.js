// rest-api-server.js
// Minimal HTTP server exposing POST /scan.
// Accepts multipart/form-data with a `file` field, scans it, responds with the verdict.
// Run: node examples/rest-api-server.js
// Requires: express, multer  (npm install express multer)

'use strict';

const express = require('express');
const multer  = require('multer');
const os      = require('os');
const fs      = require('fs');
const { scan, Verdict } = require('pompelmi');

const upload = multer({ dest: os.tmpdir() });
const app    = express();

app.post('/scan', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided. Send multipart/form-data with a "file" field.' });
  }

  const filePath = req.file.path;

  try {
    const result  = await scan(filePath);
    const verdict = result.description.toLowerCase(); // 'clean' | 'malicious' | 'scanerror'

    const statusCode = result === Verdict.Clean ? 200 : 422;
    return res.status(statusCode).json({ verdict, file: req.file.originalname });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`pompelmi scan server listening on http://localhost:${PORT}`));
