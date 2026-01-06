import express from 'express';
import multer from 'multer';
import { createYaraScannerFromRules } from '../src/yara/index';
import cors from 'cors';

const app = express();
const upload = multer();

// CORS (dev-friendly). In produzione imposta origin a un elenco esplicito.
app.use(
  cors({
    origin: true,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  })
);
// Preflight per la rotta
app.options('/api/yara/scan', cors());

app.use(express.json({ limit: '20mb' }));

app.post('/api/yara/scan', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'rules', maxCount: 1 }]), async (req, res) => {
  try {
    let rules = '';
    let bytes: Uint8Array | null = null;

    if (req.is('multipart/form-data')) {
      const files = req.files as Record<string, Array<{ buffer: Buffer }>> | undefined;

      // rules può arrivare come file (campo 'rules') o come testo (body.rules)
      if (files?.rules?.[0]) {
        rules = files.rules[0].buffer.toString('utf8');
      } else {
        rules = (req.body?.rules ?? '').toString();
      }

      // file binario obbligatorio nel campo 'file'
      const f = files?.file?.[0];
      if (!f) return res.status(400).json({ error: 'file missing' });
      bytes = new Uint8Array(f.buffer);
    } else {
      // JSON { rules: string, file: base64 }  oppure { rulesB64: base64, file: base64 }
      const rulesB64 = (req.body as any)?.rulesB64;
      if (typeof rulesB64 === 'string') {
        rules = Buffer.from(rulesB64, 'base64').toString('utf8');
      } else {
        rules = (req.body?.rules ?? '').toString();
      }
      const b64 = (req.body as any)?.file;
      if (typeof b64 !== 'string') {
        return res.status(400).json({ error: 'file (base64) missing' });
      }
      bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
    }

    if (!rules.trim()) return res.status(400).json({ error: 'rules empty' });

    const compiled = await createYaraScannerFromRules(rules);
    const matches = await compiled.scan(bytes!);
    res.json(matches);
  } catch (err: any) {
    console.error('[remote-yara] error', err);
    res.status(500).json({ error: 'internal_error', detail: String(err?.message ?? err) });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8787;
app.listen(port, () => {
  console.log(`[remote-yara] listening on http://localhost:${port}`);
});