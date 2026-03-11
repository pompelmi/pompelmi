---
title: "Introducing Pompelmi: Secure File Upload Scanning for Node.js"
description: "Learn how Pompelmi protects your Node.js applications from malicious file uploads with deep ZIP inspection, MIME validation, and optional YARA scanning."
pubDate: 2024-01-15
author: "Pompelmi Team"
tags: ["security", "nodejs", "file-upload", "release"]
---

# Introducing Pompelmi: Secure File Upload Scanning for Node.js

File uploads are one of the most common attack vectors in web applications. Whether it's a ZIP bomb that crashes your server, a malicious executable disguised as an image, or deeply nested archives designed to consume resources, the threats are real and evolving.

That's why we built **Pompelmi** — a comprehensive file upload security solution for Node.js applications.

## What is Pompelmi?

Pompelmi is a security-first file upload validation library that integrates seamlessly with Express, Koa, and Next.js. It provides:

- **Deep ZIP Inspection**: Prevents ZIP bombs by enforcing limits on entries, nesting depth, and total uncompressed size
- **MIME Type Validation**: Ensures files match their declared content type
- **Size Guards**: Protects against oversized uploads
- **Optional YARA Integration**: Advanced malware detection with custom rules
- **React UI Components**: Pre-built upload interface with real-time validation

## Why Pompelmi?

Traditional file upload solutions focus on basic validation, but modern threats require deeper inspection. Pompelmi goes beyond checking file extensions and sizes:

1. **Archive Safety**: Recursively inspects ZIP files to detect compression bombs and nested archives
2. **Content Verification**: Uses magic bytes to verify actual file types, not just extensions
3. **Flexible Policies**: Configure custom rules for your application's needs
4. **Framework Agnostic**: Works with popular Node.js frameworks out of the box

## Getting Started

Install Pompelmi in your Node.js project:

```bash
npm install pompelmi
```

For Express applications:

```typescript
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import { CommonHeuristicsScanner } from 'pompelmi';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const guard = createUploadGuard({
  includeExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  failClosed: true,
  scanner: CommonHeuristicsScanner,
});

app.post('/upload', upload.single('file'), guard, (req, res) => {
  res.json({ ok: true });
});
```

## What's Next?

We're continuously improving Pompelmi with new features and security enhancements. Our roadmap includes:

- Additional framework adapters
- Enhanced YARA rule sets
- Performance optimizations
- Expanded documentation and examples

Join us in making file uploads safer for everyone. Star us on [GitHub](https://github.com/pompelmi/pompelmi) and contribute to the project!

## Learn More

- [Documentation](/pompelmi/getting-started/)
- [GitHub Repository](https://github.com/pompelmi/pompelmi)
- [API Reference](/pompelmi/reference/ui-react/)
- [Blog: Securing Express file uploads](/pompelmi/blog/express-file-upload-security/)
- [Blog: Preventing ZIP bombs](/pompelmi/blog/preventing-zip-bombs/)
- [Blog: 17 common upload security mistakes](/pompelmi/blog/common-file-upload-mistakes-nodejs/)
