# S3 Integration

Two common patterns when using pompelmi with Amazon S3: scan before uploading (local scan then putObject), and scan a file already in S3 (getObject stream then scanStream).

---

## Pattern 1: Scan locally, then upload to S3 if clean

The file is scanned before it ever reaches S3. Malicious files are rejected and never uploaded.

```js
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { scan, Verdict } = require('pompelmi');

const s3 = new S3Client({ region: process.env.AWS_REGION });

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: Number(process.env.CLAMAV_PORT) || 3310,
  timeout: 30_000,
};

async function scanThenUpload(localPath, s3Key) {
  const result = await scan(localPath, SCAN_OPTS);

  if (result === Verdict.Malicious) {
    throw new Error(`Malicious file rejected: ${localPath}`);
  }

  if (result === Verdict.ScanError) {
    throw new Error(`Scan incomplete — rejecting file: ${localPath}`);
  }

  // Only reached if Verdict.Clean
  const fileStream = fs.createReadStream(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key:    s3Key,
    Body:   fileStream,
  }));

  return s3Key;
}
```

### In an Express upload route

```js
const express = require('express');
const multer  = require('multer');
const { scan, Verdict } = require('pompelmi');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const upload = multer({ dest: '/tmp/uploads' });
const s3     = new S3Client({ region: process.env.AWS_REGION });
const app    = express();

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file.' });

  const filePath = req.file.path;

  try {
    const result = await scan(filePath, { host: process.env.CLAMAV_HOST, port: 3310 });

    if (result !== Verdict.Clean) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: `Upload rejected: ${result.description}` });
    }

    const key = `uploads/${Date.now()}-${req.file.originalname}`;
    await s3.send(new PutObjectCommand({
      Bucket:      process.env.S3_BUCKET,
      Key:         key,
      Body:        fs.createReadStream(filePath),
      ContentType: req.file.mimetype,
    }));

    fs.unlinkSync(filePath); // clean up temp file after upload
    return res.json({ ok: true, key });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    return res.status(500).json({ error: err.message });
  }
});
```

---

## Pattern 2: Scan an S3 object stream

Scan a file that already exists in S3 by streaming the `GetObjectCommand` response body through `scanStream()`. No data is written to the application host's disk.

```js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { scanStream, Verdict } = require('pompelmi');

const s3 = new S3Client({ region: process.env.AWS_REGION });

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: 3310,
  timeout: 60_000,
};

async function scanS3Object(bucket, key) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  // response.Body is a SdkStreamMixin (Node.js Readable-compatible)
  const result = await scanStream(response.Body, SCAN_OPTS);

  return result;
}

// Usage
const verdict = await scanS3Object('my-bucket', 'uploads/user-file.pdf');

if (verdict === Verdict.Malicious) {
  // Move to quarantine bucket
  await moveToQuarantine('my-bucket', 'uploads/user-file.pdf');
}
```

### AWS SDK v3 stream compatibility

The AWS SDK v3 returns `response.Body` as a `SdkStreamMixin` which implements the Node.js `Readable` interface. Pass it directly to `scanStream()`:

```js
const response = await s3.send(new GetObjectCommand({ Bucket, Key }));
const result = await scanStream(response.Body, SCAN_OPTS);
```

For the older AWS SDK v2:

```js
const response = s3.getObject({ Bucket, Key });
const result = await scanStream(response.createReadStream(), SCAN_OPTS);
```

---

## Pattern 3: Quarantine bucket

Move malicious files to a separate quarantine bucket instead of deleting them, for forensic review.

```js
const {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { scanStream, Verdict } = require('pompelmi');

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function scanAndQuarantine(sourceBucket, key) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: sourceBucket,
    Key:    key,
  }));

  const result = await scanStream(response.Body, {
    host: process.env.CLAMAV_HOST,
    port: 3310,
  });

  if (result === Verdict.Malicious) {
    const quarantineKey = `quarantine/${Date.now()}-${key}`;

    // Copy to quarantine bucket
    await s3.send(new CopyObjectCommand({
      CopySource:  `${sourceBucket}/${key}`,
      Bucket:      process.env.QUARANTINE_BUCKET,
      Key:         quarantineKey,
    }));

    // Delete from source
    await s3.send(new DeleteObjectCommand({
      Bucket: sourceBucket,
      Key:    key,
    }));

    console.warn({ event: 'quarantined', sourceBucket, key, quarantineKey });
    return { quarantined: true, quarantineKey };
  }

  return { quarantined: false, verdict: result.description };
}
```

---

## S3 trigger pattern (Lambda or background job)

Scan every object as it arrives in an upload bucket using an S3 event trigger or a polling job:

```js
// Lambda handler (or background worker)
async function processUpload(event) {
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key    = decodeURIComponent(record.s3.object.key);

  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const result   = await scanStream(response.Body, {
    host: process.env.CLAMAV_HOST,
    port: 3310,
  });

  if (result !== Verdict.Clean) {
    await moveToQuarantine(bucket, key);
    await notifyAdmin(key, result.description);
  }
}
```

> **Note on Lambda:** ClamAV cannot run inside a standard Lambda function. Use TCP mode pointing to clamd on a persistent host (EC2, ECS, Fargate) or a dedicated scan microservice.

---

## Environment variables

```
CLAMAV_HOST=clamav.internal
CLAMAV_PORT=3310
AWS_REGION=us-east-1
S3_BUCKET=uploads-bucket
QUARANTINE_BUCKET=quarantine-bucket
```
