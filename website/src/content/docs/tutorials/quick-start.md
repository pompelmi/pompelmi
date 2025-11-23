---
title: Quick Start Tutorial
description: Get started with Pompelmi in 5 minutes - secure your first file upload endpoint
---

# Quick Start Tutorial

This tutorial will guide you through setting up Pompelmi in a new Node.js application. You'll have a secure file upload endpoint running in just a few minutes.

## Prerequisites

- Node.js 18 or higher
- Basic knowledge of Express or Next.js
- 5 minutes of your time

## Step 1: Create a New Project

```bash
mkdir my-secure-upload
cd my-secure-upload
npm init -y
```

## Step 2: Install Dependencies

```bash
npm install pompelmi express multer
```

## Step 3: Create Your Upload Server

Create a file named `server.js`:

```javascript
import express from 'express';
import multer from 'multer';
import { createExpressAdapter } from 'pompelmi';

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configure Pompelmi with security policies
const scanner = createExpressAdapter({
  maxFileSize: 10 * 1024 * 1024, // 10MB limit
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ],
  // ZIP protection
  maxZipEntries: 100,
  maxZipDepth: 2,
  maxTotalUncompressedSize: 50 * 1024 * 1024,
});

// Upload endpoint with security scanning
app.post('/upload', upload.single('file'), scanner, (req, res) => {
  res.json({ 
    success: true, 
    message: 'File uploaded and scanned successfully!',
    file: req.file.filename
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Upload failed' 
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🔒 Secure upload server running on http://localhost:${PORT}`);
});
```

## Step 4: Update package.json

Add the `"type": "module"` field to use ES modules:

```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js"
  }
}
```

## Step 5: Start the Server

```bash
npm start
```

You should see:
```
🔒 Secure upload server running on http://localhost:3000
```

## Step 6: Test Your Endpoint

Create a test file `test-upload.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Upload Test</title>
</head>
<body>
  <h1>Test File Upload</h1>
  <form action="http://localhost:3000/upload" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" required>
    <button type="submit">Upload</button>
  </form>
</body>
</html>
```

Open `test-upload.html` in your browser and try uploading:
- ✅ A small image file (should succeed)
- ❌ A large file over 10MB (should be rejected)
- ❌ An executable file (should be rejected)

## What Just Happened?

Pompelmi automatically:

1. **Validated file size** - Rejected files over 10MB
2. **Checked MIME types** - Only allowed images and PDFs
3. **Inspected ZIP files** - Protected against ZIP bombs
4. **Prevented malicious uploads** - Blocked executables and scripts

## Next Steps

Now that you have a basic setup, you can:

- Add [YARA scanning](/pompelmi/how-to/yara/) for advanced malware detection
- Integrate the [React UI component](/pompelmi/reference/ui-react/) for a better user experience
- Customize [security policies](/pompelmi/reference/configuration/) for your use case
- Deploy to production with proper [error handling](/pompelmi/how-to/error-handling/)

## Troubleshooting

### Error: "Cannot find package 'pompelmi'"

Make sure you've installed pompelmi:
```bash
npm install pompelmi
```

### Uploads are rejected immediately

Check that your MIME types are correctly configured and match the files you're uploading.

### Server crashes on large files

Ensure multer's file size limits align with Pompelmi's `maxFileSize` setting.

## Learn More

- [Express Integration Guide](/pompelmi/how-to/express/)
- [Next.js Integration Guide](/pompelmi/how-to/nextjs/)
- [Configuration Reference](/pompelmi/reference/configuration/)
