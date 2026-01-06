---
layout: home
title: pompelmi - Fast File Upload Security for Node.js
description: Fast file upload malware scanning for Node.js with YARA integration, ZIP bomb protection, and Express/Koa/Next.js adapters. Private by design. TypeScript-first.
hero:
  name: pompelmi
  text: Fast file upload security for Node.js
  tagline: 🔒 Malware scanning • YARA integration • ZIP bomb protection • Express/Koa/Next.js adapters • Private by design
  image:
    src: /logo.svg
    alt: pompelmi - File upload security library logo
  actions:
    - theme: brand
      text: Get Started
      link: /docs/
    - theme: alt
      text: View Demo
      link: /demo/
    - theme: alt
      text: GitHub ⭐
      link: https://github.com/pompelmi/pompelmi
    - theme: alt
      text: npm Install
      link: https://www.npmjs.com/package/pompelmi
features:
  - title: 🔒 Privacy First
    details: All scanning happens in-process. No cloud calls, no data leaks. Your files never leave your infrastructure. Perfect for GDPR/HIPAA compliance.
  - title: ⚡ Lightning Fast
    details: In-process scanning with zero network latency. Configurable concurrency for high-throughput scenarios. Process thousands of files efficiently.
  - title: 🧬 YARA Integration
    details: Optional YARA engine support for advanced threat detection. Bring your own rules or use community signatures for comprehensive malware scanning.
  - title: 📦 ZIP Hardening
    details: Deep ZIP inspection with bomb/ratio limits, traversal-safe extraction, and inner file MIME type verification for complete archive security.
  - title: 🎨 Developer Friendly
    details: TypeScript-first with zero-config defaults. Drop-in middleware for Express, Koa, Next.js, and Fastify. Get started in under 5 minutes.
  - title: 🛡️ Multi-Layer Defense
    details: Extension allowlisting, server-side MIME checks, size limits, heuristic scanners, and composable security policies for robust protection.
---

## 🌟 Trusted by Developers

> "pompelmi made it incredibly easy to add malware scanning to our Express API. The TypeScript support is fantastic!"
> — Developer using pompelmi in production

> "Finally, a file scanning solution that doesn't require sending our users' data to third parties. Perfect for GDPR compliance."
> — Security Engineer at a healthcare startup

## 📈 Featured In

- **Detection Engineering Weekly #124** - Security community spotlight
- **Node Weekly #594** - JavaScript ecosystem highlight
- **Bytes #429** - Developer newsletter feature
- **DEV.to** - Community showcase

## 🚀 Quick Start

```bash
npm install pompelmi
```

```typescript
import { scanFile } from 'pompelmi';

const result = await scanFile('path/to/upload.zip');
console.log(result.verdict); // "clean" | "suspicious" | "malicious"
```

[View complete documentation →](/docs/)