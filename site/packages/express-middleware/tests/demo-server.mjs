import express from 'express';
import multer from 'multer';
import { Buffer } from 'node:buffer';
import { createUploadGuard } from '../dist/index.js';

// Scanner minimo che rileva la stringa EICAR (solo per demo)
// Rispetta l'interfaccia { scan(bytes: Uint8Array): Promise<YaraMatch[]> }
const SimpleEicarScanner = {
  async scan(bytes) {
    const text = Buffer.from(bytes).toString('utf8');
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      return [{ rule: 'eicar_test' }];
    }
    return [];
  }
};

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  // niente limits qui, oppure qualcosa di alto (es. 100 MiB)
  // limits: { fileSize: 100 * 1024 * 1024 }
});

app.post(
  '/upload',
  upload.any(),
  createUploadGuard({
    // 👉 qui usiamo lo scanner “finto” per la demo
    scanner: SimpleEicarScanner,

    includeExtensions: ['txt', 'png', 'jpg', 'jpeg', 'pdf', 'zip'],
    allowedMimeTypes: ['text/plain', 'image/png', 'image/jpeg', 'application/pdf', 'application/zip'],
    maxFileSizeBytes: 20 * 1024 * 1024,
    timeoutMs: 5000,
    concurrency: 4,
    failClosed: true,
    onScanEvent: (ev) => console.log('[scan]', ev)
  }),
  (req, res) => {
    res.json({ ok: true, scan: req.pompelmi ?? null });
  }
);

app.listen(3000, () => console.log('demo server on http://localhost:3000'));