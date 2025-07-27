import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { createFastifyUploadGuard } from '../dist/index.js';

// Scanner fittizio per EICAR (puoi sostituire con 'rules' se preferisci usare YARA reale)
const SimpleEicarScanner = {
  async scan(bytes) {
    const text = Buffer.from(bytes).toString('utf8');
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) return [{ rule: 'eicar_test' }];
    return [];
  }
};

const app = Fastify();
await app.register(multipart);

app.post('/upload',
  { preHandler: createFastifyUploadGuard({
      scanner: SimpleEicarScanner,
      includeExtensions: ['txt','png','jpg','jpeg','pdf','zip'],
      allowedMimeTypes: ['text/plain','image/png','image/jpeg','application/pdf','application/zip','application/octet-stream'],
      maxFileSizeBytes: 20 * 1024 * 1024,
      timeoutMs: 5000,
      concurrency: 4,
      failClosed: true,
      onScanEvent: ev => console.log('[scan]', ev)
    })
  },
  async (req, reply) => {
    return reply.send({ ok: true, scan: req.pompelmi ?? null });
  }
);

const PORT = Number(process.env.PORT) || 3002;
app.listen({ port: PORT }, () => console.log(`demo fastify on http://localhost:${PORT}`));