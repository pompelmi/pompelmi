import express from 'express';
import multer from 'multer';
import { createExpressUploadMiddleware } from '@pompelmi/express-middleware';
import { createProductionScannerFactory, composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const app = express();
const upload = multer();
const scanner = createProductionScannerFactory({ composeScanners, createZipBombGuard, CommonHeuristicsScanner });

app.post('/upload', upload.single('file'), createExpressUploadMiddleware({
  scanner,
  includeExtensions: ['png','jpg','jpeg','pdf','zip'],
  allowedMimeTypes: ['image/png','image/jpeg','application/pdf','application/zip','text/plain'],
  failClosed: true,
}));

app.listen(3000, () => console.log('listening on :3000'));
