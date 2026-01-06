import Koa from 'koa';
import Router from '@koa/router';
import multer from '@koa/multer';
import { createKoaUploadGuard } from '../dist/index.js';

// Scanner fittizio EICAR (per la demo; in prod puoi passare `rules` YARA)
const SimpleEicarScanner = {
  async scan(bytes) {
    const text = Buffer.from(bytes).toString('utf8');
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) return [{ rule: 'eicar_test' }];
    return [];
  }
};

const app = new Koa();
const router = new Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post(
  '/upload',
  upload.any(),
  createKoaUploadGuard({
    scanner: SimpleEicarScanner,
    filesSource: 'multer',
    includeExtensions: ['txt', 'png', 'jpg', 'jpeg', 'pdf', 'zip'],
    allowedMimeTypes: ['text/plain', 'image/png', 'image/jpeg', 'application/pdf', 'application/zip'],
    maxFileSizeBytes: 20 * 1024 * 1024,
    timeoutMs: 5000,
    concurrency: 4,
    failClosed: true,
    onScanEvent: (ev) => console.log('[scan]', ev)
  }),
  (ctx) => {
    ctx.body = { ok: true, scan: ctx.pompelmi ?? null };
  }
);

app.use(router.routes()).use(router.allowedMethods());

const PORT = Number(process.env.PORT) || 3003;
app.listen(PORT, () => console.log(`demo koa on http://localhost:${PORT}`));