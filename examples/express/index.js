'use strict';

const express   = require('express');
const multer    = require('multer');
const { middleware } = require('pompelmi');

const upload = multer({ storage: multer.memoryStorage() });
const app    = express();

// Scan uploaded file before the route handler runs.
// Any virus triggers HTTP 403 automatically.
app.post(
  '/upload',
  upload.single('file'),
  middleware({
    host: process.env.CLAMD_HOST,
    port: Number(process.env.CLAMD_PORT) || 3310,
  }),
  (req, res) => {
    res.json({ ok: true, filename: req.file.originalname, size: req.file.size });
  }
);

// Handle multiple files
app.post(
  '/upload-many',
  upload.array('files', 10),
  middleware({
    host: process.env.CLAMD_HOST,
    port: Number(process.env.CLAMD_PORT) || 3310,
  }),
  (req, res) => {
    res.json({ ok: true, count: req.files.length });
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
