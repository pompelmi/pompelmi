---
title: Quick Start Tutorial
description: Secure a file upload endpoint in a new Node.js application in under 5 minutes.
---

# Quick Start Tutorial

This tutorial walks you through adding upload security to a new Node.js application. You will have a working, protected upload endpoint running in a few minutes.

## Prerequisites

- Node.js 18 or higher
- Basic familiarity with Express

## Step 1: Create a new project

```bash
mkdir my-secure-upload
cd my-secure-upload
npm init -y
```

## Step 2: Install dependencies

```bash
npm install pompelmi express multer
```

Then add `"type": "module"` to your `package.json` to use ES modules:

```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js"
  }
}
```

## Step 3: Create your upload server

Create a file named `server.js`:

```javascript
import express from 'express';
import multer from 'multer';
import { scanBytes, CONSERVATIVE_DEFAULT } from 'pompelmi';

const app = express();

// Multer buffers the file in memory.
// Keep the limit below what your process can safely hold.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /upload — scan the file before accepting it
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const result = await scanBytes(req.file.buffer, {
    policy: CONSERVATIVE_DEFAULT,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  if (result.verdict === 'malicious') {
    return res.status(422).json({
      accepted: false,
      verdict: result.verdict,
      reasons: result.reasons,
    });
  }

  // File passed — in production you would now move it to storage
  res.json({
    accepted: true,
    verdict: result.verdict,
    filename: req.file.originalname,
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Upload failed' });
});

app.listen(3000, () => {
  console.log('Secure upload server running on http://localhost:3000');
});
```

## Step 4: Start the server

```bash
npm start
```

You should see:
```
Secure upload server running on http://localhost:3000
```

## Step 5: Test your endpoint

Create a simple test form `test-upload.html` in the same directory:

```html
<!DOCTYPE html>
<html>
<head><title>Upload Test</title></head>
<body>
  <h1>Test File Upload</h1>
  <form action="http://localhost:3000/upload" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" required>
    <button type="submit">Upload</button>
  </form>
</body>
</html>
```

Open `test-upload.html` in your browser and try:

- A small image file → should return `{ accepted: true, verdict: 'clean' }`
- A file larger than 10 MB → rejected by multer before scanning
- A file with an executable extension → rejected with `accepted: false`

You can also test with curl:

```bash
# Clean file
curl -F "file=@package.json;type=application/json" http://localhost:3000/upload

# Force a malicious verdict using EICAR test content (safe, standard test string)
printf 'X5O!P%%@AP[4\PZX54(P^^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
curl -F "file=@eicar.txt;type=text/plain" http://localhost:3000/upload
```

## What happened?

Pompelmi automatically ran several checks:

1. **Size limit** — rejects files over 10 MB before reading bytes.
2. **MIME type check** — compares declared content-type against actual file signature.
3. **Structural heuristics** — checks for PE/ELF headers, embedded scripts, polyglot patterns.
4. **ZIP protection** — archive entries are checked for bomb patterns.

## Next steps

- [Getting started guide](../getting-started/) — scanner API overview, all built-in policy packs.
- [Express how-to](../how-to/express/) — production hardening, auth, CORS configuration.
- [Next.js how-to](../how-to/nextjs/) — App Router integration.
- [Architecture & threat model](../explaination/architecture/) — what Pompelmi protects against and what it does not.
