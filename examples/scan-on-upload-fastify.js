// scan-on-upload-fastify.js
// Fastify route: receive a file upload, scan it before saving to disk.
// Run: node examples/scan-on-upload-fastify.js
// Requires: fastify, @fastify/multipart  (npm install fastify @fastify/multipart)

'use strict';

const Fastify = require('fastify');
const path    = require('path');
const fs      = require('fs');
const { pipeline } = require('stream/promises');
const { scan, Verdict } = require('pompelmi');

const UPLOAD_DIR = path.resolve('./uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = Fastify({ logger: true });
app.register(require('@fastify/multipart'));

app.post('/upload', async (req, reply) => {
  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ error: 'No file uploaded.' });
  }

  const fileName = `${Date.now()}-${data.filename}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const writeStream = fs.createWriteStream(filePath);

  await pipeline(data.file, writeStream);

  try {
    const result = await scan(filePath);

    if (result === Verdict.Malicious) {
      fs.unlinkSync(filePath);
      return reply.code(422).send({ error: 'Malicious file rejected.' });
    }

    if (result === Verdict.ScanError) {
      fs.unlinkSync(filePath);
      return reply.code(422).send({ error: 'Scan incomplete — file rejected as precaution.' });
    }

    return reply.send({ ok: true, file: fileName });
  } catch (err) {
    fs.unlink(filePath, () => {});
    return reply.code(500).send({ error: `Scan failed: ${err.message}` });
  }
});

app.listen({ port: 3000 }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
});
