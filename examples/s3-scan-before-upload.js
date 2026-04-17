// s3-scan-before-upload.js
// Scan a local file with ClamAV, then upload to AWS S3 only if it is clean.
// Run: node examples/s3-scan-before-upload.js
// Requires: @aws-sdk/client-s3  (npm install @aws-sdk/client-s3)
// Expects: AWS credentials in environment or ~/.aws/credentials

'use strict';

const path = require('path');
const fs   = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { scan, Verdict } = require('pompelmi');

const S3_BUCKET = process.env.S3_BUCKET || 'my-upload-bucket';
const S3_REGION = process.env.AWS_REGION  || 'us-east-1';

const s3 = new S3Client({ region: S3_REGION });

async function scanThenUpload(localPath, s3Key) {
  const resolved = path.resolve(localPath);

  const result = await scan(resolved);

  if (result !== Verdict.Clean) {
    throw new Error(`File rejected (verdict: ${result.description}) — not uploaded to S3.`);
  }

  const body = fs.createReadStream(resolved);
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: body }));
  console.log(`Uploaded s3://${S3_BUCKET}/${s3Key}`);
}

(async () => {
  await scanThenUpload('./uploads/report.pdf', 'reports/report.pdf');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
