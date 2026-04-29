# Next.js Integration

Scan uploaded files in Next.js API routes before writing them to disk or forwarding them to S3. Covers both the App Router (Next.js 13+) and the Pages Router.

---

## App Router (Next.js 13+)

### Scan from `formData()` — scan buffer, upload to S3 if clean

In the App Router, request bodies are parsed via the Web Fetch API. Use `request.formData()` to get the file as a `Blob`, convert it to a Node.js `Buffer`, then call `scanBuffer()`.

```ts
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scanBuffer, Verdict } from 'pompelmi';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: Number(process.env.CLAMAV_PORT) || 3310,
  timeout: 30_000,
};

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let result: symbol;
  try {
    result = await scanBuffer(buffer, SCAN_OPTS);
  } catch (err) {
    return NextResponse.json(
      { error: `Scan failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  if (result === Verdict.Malicious) {
    return NextResponse.json({ error: 'Malicious file rejected.' }, { status: 422 });
  }

  if (result === Verdict.ScanError) {
    return NextResponse.json(
      { error: 'Scan incomplete — file rejected as precaution.' },
      { status: 422 }
    );
  }

  // Upload to S3 only after a clean scan
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key:    `uploads/${Date.now()}-${file.name}`,
    Body:   buffer,
    ContentType: file.type,
  }));

  return NextResponse.json({ ok: true });
}
```

### Disable Next.js body parsing

By default, Next.js App Router does not parse multipart bodies — the `request.formData()` call handles it natively. No special config needed.

---

## Pages Router

### With `formidable` — scan by file path

The Pages Router does not handle multipart natively. Use `formidable` to parse the upload, then scan the temp file path.

```bash
npm install pompelmi formidable
npm install -D @types/formidable
```

```ts
// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import { scan, Verdict } from 'pompelmi';

export const config = {
  api: { bodyParser: false }, // required for multipart
};

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: Number(process.env.CLAMAV_PORT) || 3310,
};

function parseForm(req: NextApiRequest): Promise<{ file: FormidableFile }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ uploadDir: '/tmp', keepExtensions: true });
    form.parse(req, (err, _fields, files) => {
      if (err) return reject(err);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) return reject(new Error('No file.'));
      resolve({ file });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  let file: FormidableFile;
  try {
    ({ file } = await parseForm(req));
  } catch (err) {
    return res.status(400).json({ error: 'Upload failed.' });
  }

  const filePath = file.filepath;

  try {
    const result = await scan(filePath, SCAN_OPTS);

    if (result !== Verdict.Clean) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ error: `Upload rejected: ${result.description}` });
    }

    // Move or store the clean file
    return res.status(200).json({ ok: true });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    return res.status(500).json({ error: `Scan failed: ${(err as Error).message}` });
  }
}
```

---

## Client-side upload

```tsx
// components/UploadForm.tsx
'use client';
import { useState } from 'react';

export default function UploadForm() {
  const [status, setStatus] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch('/api/upload', { method: 'POST', body: data });
    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error}`);
    } else {
      setStatus('File uploaded successfully.');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" name="file" required />
      <button type="submit">Upload</button>
      {status && <p>{status}</p>}
    </form>
  );
}
```

---

## Environment variables

Add to `.env.local`:

```
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
S3_BUCKET=my-upload-bucket
AWS_REGION=us-east-1
```

In production (Docker), set `CLAMAV_HOST` to the clamd service name (e.g. `clamav`).

---

## Notes

- **Vercel / serverless:** ClamAV cannot be installed on Vercel's serverless functions. Use TCP mode pointing to a self-hosted clamd instance (fly.io, Railway, EC2) or switch to a dedicated scan microservice.
- **File size limits:** Next.js has a default request body size limit (4 MB for Pages Router). Increase it via `export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }` or disable parsing for multipart routes.
- **App Router streaming:** The App Router supports streaming request bodies via `request.body` (`ReadableStream`). To use `scanStream()`, convert with `Readable.fromWeb(request.body)` (Node.js 18+).

```ts
import { Readable } from 'stream';
const nodeStream = Readable.fromWeb(request.body as ReadableStream);
const result = await scanStream(nodeStream, SCAN_OPTS);
```
