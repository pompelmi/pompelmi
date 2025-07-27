import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createNextUploadHandler } from '../dist/index.js';

// Scanner EICAR (demo). In produzione passa 'rules' YARA o uno scanner vero.
const SimpleEicarScanner = {
  async scan(bytes) {
    const text = Buffer.from(bytes).toString('utf8');
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) return [{ rule: 'eicar_test' }];
    return [];
  }
};

const handler = createNextUploadHandler({
  scanner: SimpleEicarScanner,
  includeExtensions: ['txt','png','jpg','jpeg','pdf','zip'],
  allowedMimeTypes: ['text/plain','image/png','image/jpeg','application/pdf','application/zip'],
  maxFileSizeBytes: 20 * 1024 * 1024,
  timeoutMs: 5000,
  concurrency: 4,
  failClosed: true,
  onScanEvent: (ev) => console.log('[scan]', ev)
});

const PORT = Number(process.env.PORT) || 3004;

function headersFromNode(nodeHeaders) {
  const h = new Headers();
  for (const [k, v] of Object.entries(nodeHeaders)) {
    if (Array.isArray(v)) {
      for (const vv of v) if (vv != null) h.append(k, String(vv));
    } else if (v != null) {
      h.set(k, String(v));
    }
  }
  return h;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/upload') {
      // Converte IncomingMessage (Node stream) in WHATWG ReadableStream
      const body = Readable.toWeb(req);
      const headers = headersFromNode(req.headers);

      // Quando il body è uno stream, Request richiede duplex: 'half'
      const webReq = new Request(`http://localhost:${PORT}${req.url}`, {
        method: req.method,
        headers,
        body,
        duplex: 'half'
      });

      const webRes = await handler(webReq);

      res.statusCode = webRes.status;
      webRes.headers.forEach((v, k) => res.setHeader(k, v));
      const ab = await webRes.arrayBuffer();
      res.end(Buffer.from(ab));
      return;
    }

    res.statusCode = 404;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Not Found');
  } catch (err) {
    console.error('[demo] error', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: false, reason: 'server_error' }));
  }
});

server.listen(PORT, () => {
  console.log(`demo next-upload on http://localhost:${PORT}`);
});