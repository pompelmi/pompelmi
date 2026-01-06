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

```javascript
import express from 'express';
import { createExpressAdapter } from 'pompelmi';

const app = express();
const scanner = createExpressAdapter({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png'],
});

app.post('/upload', scanner, (req, res) => {
  res.json({ success: true });
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
