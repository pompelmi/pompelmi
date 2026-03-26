import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import pompelmiFastifyPlugin from '../dist/index.js';

// Scanner fittizio per EICAR (puoi sostituire con scanner reale/YARA)
const SimpleEicarScanner = {
  async scan(bytes) {
    const text = Buffer.from(bytes).toString('utf8');
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      return { severity: 'malicious', ruleId: 'eicar_test' };
    }
    return { severity: 'clean' };
  }
};

const app = Fastify();
await app.register(multipart);
await app.register(pompelmiFastifyPlugin);

app.post('/upload',
  { preHandler: app.createUploadGuard({
      scanner: SimpleEicarScanner,
      includeExtensions: ['txt','png','jpg','jpeg','pdf','zip'],
      allowedMimeTypes: ['text/plain','image/png','image/jpeg','application/pdf','application/zip','application/octet-stream'],
      maxFileSizeBytes: 20 * 1024 * 1024,
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
