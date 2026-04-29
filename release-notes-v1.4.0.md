## What's new

`scanStream(stream, [options])` — scan any Node.js Readable stream directly without writing to disk.

Useful when the file never passes through the local filesystem: S3 `getObject`, HTTP responses, piped data, or any other streaming source. In TCP mode the stream is piped directly to clamd via the INSTREAM protocol — zero disk I/O. In local mode a temp file is created, scanned, and deleted automatically in a `finally` block regardless of outcome.

```js
const { scanStream, Verdict } = require('pompelmi');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: 'us-east-1' });

const response = await s3.send(new GetObjectCommand({ Bucket: 'my-bucket', Key: 'upload.zip' }));
const result = await scanStream(response.Body, {
  host: '127.0.0.1',
  port: 3310,
});

if (result === Verdict.Malicious) throw new Error('Malware detected — upload rejected.');
if (result === Verdict.ScanError) console.warn('Scan incomplete — treat stream as untrusted.');
```

The function accepts any `stream.Readable` and returns the same `Verdict.Clean`, `Verdict.Malicious`, or `Verdict.ScanError` Symbols as `scan()`. Passing a non-Readable throws `stream must be a Readable`.

**Full changelog:** https://github.com/pompelmi/pompelmi/blob/main/CHANGELOG.md
