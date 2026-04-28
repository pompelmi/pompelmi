// scan-stream.js
// Express route: scan an S3 object stream with scanStream() before accepting the upload.
// scanStream() pipes the Readable directly to clamd in TCP mode — no temp file, no disk I/O.
// Run: node examples/scan-stream.js
// Requires: express, @aws-sdk/client-s3  (npm install express @aws-sdk/client-s3)

'use strict';

const express = require('express');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { scanStream, Verdict } = require('pompelmi');

const app = express();
app.use(express.json());

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Scan an existing S3 object before processing it.
// POST /scan-s3  body: { bucket, key }
app.post('/scan-s3', async (req, res) => {
  const { bucket, key } = req.body;
  if (!bucket || !key) {
    return res.status(400).json({ error: 'bucket and key are required.' });
  }

  let stream;
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    stream = response.Body;
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch S3 object: ${err.message}` });
  }

  let result;
  try {
    // TCP mode: stream piped directly to clamd — no temp file written.
    result = await scanStream(stream, {
      host: process.env.CLAMD_HOST || '127.0.0.1',
      port: Number(process.env.CLAMD_PORT) || 3310,
    });
  } catch (err) {
    return res.status(500).json({ error: `Scan failed: ${err.message}` });
  }

  if (result === Verdict.Malicious) {
    return res.status(422).json({ error: 'Malicious file rejected.', bucket, key });
  }

  if (result === Verdict.ScanError) {
    return res.status(422).json({ error: 'Scan incomplete — file rejected as precaution.', bucket, key });
  }

  // File is clean — proceed with your processing logic here.
  return res.json({ ok: true, bucket, key });
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
