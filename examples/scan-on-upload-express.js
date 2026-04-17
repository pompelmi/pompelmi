// scan-on-upload-express.js
// Express route: receive a file upload, scan it before saving to disk.
// Rejects the request immediately if the file is malicious or cannot be scanned.
// Run: node examples/scan-on-upload-express.js
// Requires: express, multer  (npm install express multer)

'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { scan, Verdict } = require('pompelmi');

const UPLOAD_DIR = path.resolve('./uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const app = express();

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;

  try {
    const result = await scan(filePath);

    if (result === Verdict.Malicious) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: 'Malicious file rejected.' });
    }

    if (result === Verdict.ScanError) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: 'Scan incomplete — file rejected as precaution.' });
    }

    return res.json({ ok: true, file: req.file.filename });
  } catch (err) {
    fs.unlink(filePath, () => {});
    return res.status(500).json({ error: `Scan failed: ${err.message}` });
  }
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
