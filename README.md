<div align="center">

<!-- Language Selector -->
<p>
  <strong>Read this in other languages:</strong><br/>
  <a href="docs/i18n/README.it.md">🇮🇹 Italiano</a> •
  <a href="docs/i18n/README.fr.md">🇫🇷 Français</a> •
  <a href="docs/i18n/README.es.md">🇪🇸 Español</a> •
  <a href="docs/i18n/README.de.md">🇩🇪 Deutsch</a> •
  <a href="docs/i18n/README.ja.md">🇯🇵 日本語</a> •
  <a href="docs/i18n/README.zh-CN.md">🇨🇳 简体中文</a> •
  <a href="docs/i18n/README.ko.md">🇰🇷 한국어</a> •
  <a href="docs/i18n/README.pt-BR.md">🇧🇷 Português</a> •
  <a href="docs/i18n/README.ru.md">🇷🇺 Русский</a> •
  <a href="docs/i18n/README.tr.md">🇹🇷 Türkçe</a>
</p>

> 💡 **Translation Note:** Help improve translations by opening a PR. The English README is the source of truth.

</div>

---

<!-- HERO START -->

<p align="center">
  <br/>
  <!-- Responsive logo using picture element -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/pompelmi/pompelmi/refs/heads/main/assets/logo.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/pompelmi/pompelmi/refs/heads/main/assets/logo.svg">
    <img src="https://raw.githubusercontent.com/pompelmi/pompelmi/refs/heads/main/assets/logo.svg" alt="pompelmi logo" width="360" />
  </picture>
  <br/>
  <a href="https://www.producthunt.com/products/pompelmi"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1010722&theme=light" alt="pompelmi - Secure File Upload Scanning for Node.js | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
  <br/>
  <a href="https://www.detectionengineering.net/p/det-eng-weekly-issue-124-the-defcon"><img alt="Featured in Detection Engineering Weekly #124" src="https://img.shields.io/badge/featured-Detection%20Engineering%20Weekly-0A84FF?logo=substack"></a>
  <a href="https://nodeweekly.com/issues/594"><img alt="Featured in Node Weekly #594" src="https://img.shields.io/badge/featured-Node%20Weekly%20%23594-FF6600?logo=node.js"></a>
  <a href="https://bytes.dev/archives/429"><img alt="Featured in Bytes #429" src="https://img.shields.io/badge/featured-Bytes%20%23429-111111"></a>
  <a href="https://app.daily.dev/posts/pompelmi"><img alt="Featured on daily.dev" src="https://img.shields.io/badge/featured-daily.dev-CE3DF3?logo=dailydotdev"></a>
  <a href="https://dev.to/sonotommy/secure-nodejs-file-uploads-in-minutes-with-pompelmi-3jfe"><img alt="Featured on DEV.to" src="https://img.shields.io/badge/featured-DEV.to-0A0A0A?logo=devdotto"></a>
  <br/>
  <a href="https://github.com/sorrycc/awesome-javascript"><img alt="Mentioned in Awesome JavaScript" src="https://awesome.re/mentioned-badge.svg"></a>
  <a href="https://github.com/dzharii/awesome-typescript"><img alt="Mentioned in Awesome TypeScript" src="https://awesome.re/mentioned-badge-flat.svg"></a>
  <a href="https://github.com/sbilly/awesome-security"><img alt="Mentioned in Awesome Security" src="https://awesome.re/mentioned-badge.svg"></a>
  <a href="https://github.com/sindresorhus/awesome-nodejs"><img alt="Mentioned in Awesome Node.js" src="https://awesome.re/mentioned-badge-flat.svg"></a>
  <br/><br/>
</p>

<h1 align="center">pompelmi</h1>

<p align="center">
  <strong>Secure File Upload Scanning for Node.js</strong>
</p>

<p align="center">
  <em>Privacy-first malware detection with YARA, ZIP bomb protection, and framework adapters</em>
</p>

<p align="center">
  Scan files before they hit disk • Keep user data private • Zero cloud dependencies
</p>

---

---

<!-- Badges Section -->
<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm version" src="https://img.shields.io/npm/v/pompelmi?label=version&color=0a7ea4&logo=npm"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm downloads" src="https://img.shields.io/npm/dm/pompelmi?label=downloads&color=6E9F18&logo=npm"></a>
  <a href="https://github.com/pompelmi/pompelmi/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/pompelmi?color=blue"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white">
  <a href="https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml"><img alt="CI Status" src="https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci.yml?branch=main&label=CI&logo=github"></a>
</p>

<p align="center">
  <a href="https://codecov.io/gh/pompelmi/pompelmi"><img alt="codecov" src="https://codecov.io/gh/pompelmi/pompelmi/branch/main/graph/badge.svg?flag=core"/></a>
  <img alt="types" src="https://img.shields.io/badge/types-TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="ESM" src="https://img.shields.io/badge/ESM%2FCJS-compatible-yellow">
  <a href="https://snyk.io/test/github/pompelmi/pompelmi"><img alt="Known Vulnerabilities" src="https://snyk.io/test/github/pompelmi/pompelmi/badge.svg"></a>
  <a href="https://securityscorecards.dev/viewer/?uri=github.com/pompelmi/pompelmi"><img alt="OpenSSF Scorecard" src="https://api.securityscorecards.dev/projects/github.com/pompelmi/pompelmi/badge"/></a>
</p>

<p align="center">
  <a href="https://github.com/pompelmi/pompelmi/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/pompelmi/pompelmi?style=social"></a>
  <a href="https://github.com/pompelmi/pompelmi/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/pompelmi/pompelmi?style=social"></a>
  <a href="https://github.com/pompelmi/pompelmi/watchers"><img alt="GitHub watchers" src="https://img.shields.io/github/watchers/pompelmi/pompelmi?style=social"></a>
  <a href="https://github.com/pompelmi/pompelmi/issues"><img alt="open issues" src="https://img.shields.io/github/issues/pompelmi/pompelmi?color=orange"></a>
</p>

<p align="center">
  <strong>
    <a href="https://pompelmi.github.io/pompelmi/">📚 Documentation</a> •
    <a href="#-installation">💾 Install</a> •
    <a href="#-quick-start">⚡ Quick Start</a> •
    <a href="#-adapters">🧩 Adapters</a> •
    <a href="#-yara-getting-started">🧬 YARA</a> •
    <a href="#-github-action">🤖 CI/CD</a>
  </strong>
</p>

<p align="center"><em>Coverage badge reflects core library (<code>src/**</code>); adapters are measured separately.</em></p>

<!-- HERO END -->

---

## 🎬 Demo

> *(Demo GIF coming soon — showing Express + pompelmi scanning a file upload)*

**Want to try it now?** Check out our [live examples](./examples/) or install and run locally:

```bash
npm i pompelmi @pompelmi/express-middleware
```

---

## ✨ Features

**pompelmi** provides enterprise-grade file scanning for Node.js applications:

- **🔒 Privacy-First Architecture** — All scanning happens in-process. No cloud calls, no data leaks. Your files never leave your infrastructure.
- **⚡ Lightning Fast** — In-process scanning with zero network latency. Configurable concurrency for high-throughput scenarios.
- **🧩 Composable Scanners** — Mix heuristics + signatures; set `stopOn` and timeouts. Bring your own YARA rules.
- **📦 Deep ZIP Inspection** — Traversal/bomb guards, polyglot & macro hints, nested archive scanning with configurable depth limits.
- **🔌 Framework Adapters** — Drop-in middleware for Express, Koa, Fastify, Next.js, Nuxt/Nitro, and **NestJS** with first-class TypeScript support.
- **🌊 Stream-Based Processing** — Memory-efficient scanning with configurable buffer limits. Scan large files without loading them entirely into memory.
- **🔍 Polyglot Detection** — Advanced magic bytes analysis detects mixed-format files and embedded scripts with **30+ file signatures**.
- **⚙️ CLI for CI/CD** — Standalone command-line tool for scanning files and directories with watch mode and multiple output formats.
- **📘 TypeScript-First** — Complete type definitions, modern ESM/CJS builds, minimal surface, tree-shakeable.
- **⚡ Zero Core Dependencies** — Core library has minimal deps for fast installation and reduced supply chain risk.

---

## Table of Contents

- [Overview](#overview)
- [Highlights](#highlights)
- [Why pompelmi](#why-pompelmi)
- [How it compares](#how-it-compares)
- [What Developers Say](#what-developers-say)
- [What Makes pompelmi Special](#what-makes-pompelmi-special)
- [Use Cases](#use-cases)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Minimal Node usage](#minimal-node-usage)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js (App Router)](#nextjs-app-router)
- [Adapters](#adapters)
- [GitHub Action](#github-action)
- [Configuration](#configuration)
- [YARA Getting Started](#yara-getting-started)
- [Security Notes](#security-notes)

- [Testing & Development](#testing--development)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## 🌍 Translations

pompelmi documentation is available in multiple languages to help developers worldwide:

- 🇮🇹 **[Italiano (Italian)](docs/i18n/README.it.md)** — Documentazione completa in italiano
- 🇫🇷 **[Français (French)](docs/i18n/README.fr.md)** — Documentation complète en français
- 🇪🇸 **[Español (Spanish)](docs/i18n/README.es.md)** — Documentación completa en español
- 🇩🇪 **[Deutsch (German)](docs/i18n/README.de.md)** — Vollständige Dokumentation auf Deutsch
- 🇯🇵 **[日本語 (Japanese)](docs/i18n/README.ja.md)** — 日本語による完全なドキュメント
- 🇨🇳 **[简体中文 (Simplified Chinese)](docs/i18n/README.zh-CN.md)** — 完整的简体中文文档
- 🇰🇷 **[한국어 (Korean)](docs/i18n/README.ko.md)** — 완전한 한국어 문서
- 🇧🇷 **[Português (Brasil)](docs/i18n/README.pt-BR.md)** — Documentação completa em português
- 🇷🇺 **[Русский (Russian)](docs/i18n/README.ru.md)** — Полная документация на русском
- 🇹🇷 **[Türkçe (Turkish)](docs/i18n/README.tr.md)** — Türkçe tam dokümantasyon

**Help improve translations:** We welcome contributions to improve and maintain translations. The English README is the authoritative source. To contribute, please open a Pull Request with your improvements.

---

## 🚀 Overview

**pompelmi** scans untrusted file uploads **before** they hit disk. A tiny, TypeScript-first toolkit for Node.js with composable scanners, deep ZIP inspection, and optional signature engines.

### 🎯 Key Features

**🔒 Private by design** — no outbound calls; bytes never leave your process

**🧩 Composable scanners** — mix heuristics + signatures; set `stopOn` and timeouts

**📦 ZIP hardening** — traversal/bomb guards, polyglot & macro hints

**🔌 Drop-in adapters** — Express, Koa, Fastify, Next.js, Nuxt/Nitro, **NestJS**

**🌊 Stream-based scanning** — memory-efficient processing with configurable buffer limits

**⚙️ CLI for CI/CD** — standalone command-line tool for scanning files and directories

**🔍 Polyglot detection** — advanced magic bytes analysis and embedded script detection

**📘 Typed & tiny** — modern TS, minimal surface, tree-shakeable

**⚡ Zero dependencies** — core library has minimal deps, fast installation

## ✨ Highlights

**🛡️ Block risky uploads early** — classify uploads as _clean_, _suspicious_, or _malicious_ and stop them at the edge.

**✅ Real guards** — extension allow‑list, server‑side MIME sniff (magic bytes), per‑file size caps, and **deep ZIP** traversal with anti‑bomb limits.

**🔍 Built‑in scanners** — drop‑in **CommonHeuristicsScanner** (PDF risky actions, Office macros, PE header) and **Zip‑bomb Guard**; add your own or YARA via a tiny `{ scan(bytes) }` contract.

**🔬 Polyglot & embedded script detection** — advanced magic bytes analysis detects mixed-format files and embedded scripts with **30+ file signatures**.

**🌊 Memory-efficient streaming** — scan large files without loading them entirely into memory with automatic stream routing.

**⚙️ Compose scanning** — run multiple scanners in parallel or sequentially with timeouts and short‑circuiting via `composeScanners()`.

**🏗️ Framework integrations** — native modules for **NestJS**, Express, Koa, Next.js, Nuxt/Nitro, and Fastify with first-class TypeScript support.

**🔧 Production-ready CLI** — standalone tool for CI/CD pipelines with watch mode, multiple output formats (JSON, table, minimal).

**☁️ Zero cloud** — scans run in‑process. Keep bytes private. Perfect for GDPR/HIPAA compliance.

**👨‍💻 DX first** — TypeScript types, ESM/CJS builds, tiny API, adapters for popular web frameworks.

> **SEO Keywords:** file upload security, malware detection, virus scanner, Node.js security, Express middleware, YARA integration, ZIP bomb protection, file validation, upload sanitization, threat detection, security scanner, antivirus Node.js, file scanning library, TypeScript security, Next.js security, Nuxt security, Nitro security, Koa middleware, server-side validation, file integrity check, malware prevention, secure file upload

## 🧠 Why pompelmi?

- **On‑device, private scanning** – no outbound calls, no data sharing.
- **Blocks early** – runs _before_ you write to disk or persist anything.
- **Fits your stack** – drop‑in adapters for Express, Koa, Next.js, Nuxt/Nitro (Fastify plugin in alpha).
- **Defense‑in‑depth** – ZIP traversal limits, ratio caps, server‑side MIME sniffing, size caps.
- **Pluggable detection** – bring your own engine (e.g., YARA) via a tiny `{ scan(bytes) }` contract.

### Who is it for?

- Teams who can’t send uploads to third‑party AV APIs.
- Apps that need predictable, low‑latency decisions inline.
- Developers who want simple, typed building blocks instead of a daemon.

## 🔍 How it compares

| Capability | pompelmi | ClamAV / node‑clam | Cloud AV APIs |
| --- | --- | --- | --- |
| Runs fully in‑process | ✅ | ❌ (separate daemon) | ❌ (network calls) |
| Bytes stay private | ✅ | ✅ | ❌ |
| Deep ZIP limits & MIME sniff | ✅ | ✅ (archive scan) | ❓ varies |
| YARA integration | ✅ optional | ❌* | ❓ varies |
| Framework adapters | ✅ Express/Koa/Next.js | ❌ | ❌ |
| Works in CI on artifacts | ✅ | ✅ | ❓ varies |
| Licensing | MIT | GPL (engine) | Proprietary |

\* You can run YARA alongside ClamAV, but it’s not built‑in.

---
## 💬 What Developers Say

> "pompelmi made it incredibly easy to add malware scanning to our Express API. The TypeScript support is fantastic!"
> — Developer using pompelmi in production

> "Finally, a file scanning solution that doesn't require sending our users' data to third parties. Perfect for GDPR compliance."
> — Security Engineer at a healthcare startup

> "The YARA integration is seamless. We went from prototype to production in less than a week."
> — DevSecOps Engineer

_Want to share your experience? [Open a discussion](https://github.com/pompelmi/pompelmi/discussions)!_

---

## 🌟 What Makes pompelmi Special?

### 🎯 Developer Experience

Built with developers in mind from day one. Simple API, comprehensive TypeScript types, and excellent documentation mean you can integrate secure file scanning in minutes, not days. Hot module replacement support and detailed error messages make debugging a breeze.

### 🚀 Performance First

Optimized for high-throughput scenarios with configurable concurrency, streaming support, and minimal memory overhead. Process thousands of files without breaking a sweat. Scans run in-process with no IPC overhead.

### 🔐 Security Without Compromise

Multi-layered defense including MIME type verification (magic bytes), extension validation, size limits, ZIP bomb protection, and optional YARA integration. Each layer is configurable to match your threat model.

### 🌍 Privacy Guaranteed

Your data never leaves your infrastructure. No telemetry, no cloud dependencies, no third-party API calls. Perfect for regulated industries (healthcare, finance, government) and privacy-conscious applications.

---

## 💡 Use Cases

pompelmi is trusted across diverse industries and use cases:

### 🏥 Healthcare (HIPAA Compliance)

Scan patient document uploads without sending PHI to third-party services. Keep medical records and imaging files secure on your infrastructure.

### 🏦 Financial Services (PCI DSS)

Validate customer document uploads (ID verification, tax forms) without exposing sensitive financial data to external APIs.

### 🎓 Education Platforms

Protect learning management systems from malicious file uploads while maintaining student privacy.

### 🏢 Enterprise Document Management

Scan files at ingestion time for corporate file sharing platforms, wikis, and collaboration tools.

### 🎨 Media & Creative Platforms

Validate user-generated content uploads (images, videos, documents) before processing and storage.

---

---

## 📦 Installation

**pompelmi** is a privacy-first Node.js library for local file scanning.

**Requirements:**
- Node.js 18+
- Optional: ClamAV binaries (for signature-based scanning)
- Optional: YARA libraries (for custom rules)

<table>
<tr>
<td><b>npm</b></td>
<td><code>npm install pompelmi</code></td>
</tr>
<tr>
<td><b>pnpm</b></td>
<td><code>pnpm add pompelmi</code></td>
</tr>
<tr>
<td><b>yarn</b></td>
<td><code>yarn add pompelmi</code></td>
</tr>
<tr>
<td><b>bun</b></td>
<td><code>bun add pompelmi</code></td>
</tr>
</table>

#### 📦 Framework Adapters

```bash
# Express
npm i @pompelmi/express-middleware

# Koa
npm i @pompelmi/koa-middleware

# Next.js
npm i @pompelmi/next-upload

# NestJS
npm i @pompelmi/nestjs-integration

# Fastify (alpha)
npm i @pompelmi/fastify-plugin

# Standalone CLI
npm i -g @pompelmi/cli
```

> **Note:** Core library works standalone. Install adapters only if using specific frameworks.

---

## 🚀 Getting Started

Get secure file scanning running in under 5 minutes with pompelmi's zero-config defaults.

### Step 1: Install

```bash
npm install pompelmi
```

### Step 2: Create Security Policy

Create a reusable security policy and scanner configuration:

```ts
// lib/security.ts
import { CommonHeuristicsScanner, createZipBombGuard, composeScanners } from 'pompelmi';

export const policy = {
  includeExtensions: ['zip', 'png', 'jpg', 'jpeg', 'pdf', 'txt'],
  allowedMimeTypes: ['application/zip', 'image/png', 'image/jpeg', 'application/pdf', 'text/plain'],
  maxFileSizeBytes: 20 * 1024 * 1024, // 20MB
  timeoutMs: 5000,
  concurrency: 4,
  failClosed: true, // Block uploads on scanner errors
  onScanEvent: (event: unknown) => console.log('[scan]', event)
};

export const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({ 
      maxEntries: 512, 
      maxTotalUncompressedBytes: 100 * 1024 * 1024,
      maxCompressionRatio: 12 
    })],
    ['heuristics', CommonHeuristicsScanner],
    // Add your own scanners or YARA rules here
  ],
  { 
    parallel: false, 
    stopOn: 'suspicious', 
    timeoutMsPerScanner: 1500,
    tagSourceName: true 
  }
);
```

### Step 3: Choose Your Integration

Pick the integration that matches your framework:

#### Express

```ts
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import { policy, scanner } from './lib/security';

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: policy.maxFileSizeBytes }
});

app.post('/upload', 
  upload.any(), 
  createUploadGuard({ ...policy, scanner }), 
  (req, res) => {
    // File is safe - proceed with your logic
    res.json({ 
      success: true, 
      verdict: (req as any).pompelmi?.verdict || 'clean'
    });
  }
);

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));
```

#### Next.js App Router

```ts
// app/api/upload/route.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';
import { policy, scanner } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createNextUploadHandler({ ...policy, scanner });
```

#### Koa

```ts
import Koa from 'koa';
import Router from '@koa/router';
import multer from '@koa/multer';
import { createKoaUploadGuard } from '@pompelmi/koa-middleware';
import { policy, scanner } from './lib/security';

const app = new Koa();
const router = new Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: policy.maxFileSizeBytes }
});

router.post('/upload',
  upload.any(),
  createKoaUploadGuard({ ...policy, scanner }),
  (ctx) => {
    ctx.body = { 
      success: true, 
      verdict: (ctx as any).pompelmi?.verdict || 'clean'
    };
  }
);

app.use(router.routes()).use(router.allowedMethods());
app.listen(3003, () => console.log('🚀 Server running on http://localhost:3003'));
```

#### Standalone / Programmatic

```ts
import { scanFile } from 'pompelmi';

const result = await scanFile('path/to/file.zip');
console.log(result.verdict); // "clean" | "suspicious" | "malicious"

if (result.verdict === 'malicious') {
  console.error('⚠️ Malicious file detected!');
  console.error(result.reasons);
}
```

### Step 4: Test It

Upload a test file to verify everything works:

```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@test.pdf"
```

✅ **Done!** Your app now has secure file upload scanning.

---

## 📘 Code Examples

### Example 1: Express with Custom Error Handling

```ts
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import { policy, scanner } from './lib/security';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload',
  upload.single('file'),
  createUploadGuard({ ...policy, scanner }),
  (req, res) => {
    const scanResult = (req as any).pompelmi;
    
    if (scanResult?.verdict === 'malicious') {
      return res.status(422).json({
        error: 'Malicious file detected',
        reasons: scanResult.reasons
      });
    }
    
    if (scanResult?.verdict === 'suspicious') {
      // Log for review but allow upload
      console.warn('Suspicious file uploaded:', req.file?.originalname);
    }
    
    // Process clean file
    res.json({ success: true, fileName: req.file?.originalname });
  }
);

app.listen(3000);
```

### Example 2: Next.js Route Handler with Custom Response

```ts
// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scanBuffer } from 'pompelmi';
import { scanner } from '@/lib/security';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await scanner.scan(buffer);
  
  return NextResponse.json({
    fileName: file.name,
    verdict: result.verdict,
    safe: result.verdict === 'clean',
    reasons: result.reasons || []
  });
}
```

### Example 3: NestJS Controller

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { PompelmiModule } from '@pompelmi/nestjs-integration';
import { CommonHeuristicsScanner } from 'pompelmi';

@Module({
  imports: [
    PompelmiModule.forRoot({
      includeExtensions: ['pdf', 'zip', 'png', 'jpg'],
      allowedMimeTypes: ['application/pdf', 'application/zip', 'image/png', 'image/jpeg'],
      maxFileSizeBytes: 10 * 1024 * 1024,
      scanners: [CommonHeuristicsScanner],
    }),
  ],
})
export class AppModule {}

// upload.controller.ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiInterceptor, PompelmiResult } from '@pompelmi/nestjs-integration';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file'), PompelmiInterceptor)
  async uploadFile(@UploadedFile() file: Express.Multer.File & { pompelmi?: PompelmiResult }) {
    if (file.pompelmi?.verdict === 'malicious') {
      throw new BadRequestException('Malicious file detected');
    }
    
    return { 
      success: true, 
      verdict: file.pompelmi?.verdict,
      fileName: file.originalname
    };
  }
}
```

> 📖 **More examples:** Check the [examples/](./examples/) directory for complete working demos including Express, Koa, Next.js, Nuxt/Nitro, and more.

---

## 🤖 GitHub Action

Run **pompelmi** in CI to scan repository files or built artifacts.

**Minimal usage**
```yaml
name: Security scan (pompelmi)
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan repository with pompelmi
        uses: pompelmi/pompelmi/.github/actions/pompelmi-scan@v1
        with:
          path: .
          deep_zip: true
          fail_on_detect: true
```

**Scan a single artifact**
```yaml
- uses: pompelmi/pompelmi/.github/actions/pompelmi-scan@v1
  with:
    artifact: build.zip
    deep_zip: true
    fail_on_detect: true
```

**Inputs**
| Input | Default | Description |
| --- | --- | --- |
| `path` | `.` | Directory to scan. |
| `artifact` | `""` | Single file/archive to scan. |
| `yara_rules` | `""` | Glob path to YARA rules (e.g. `rules/*.yar`). |
| `deep_zip` | `true` | Enable deep nested-archive inspection. |
| `max_depth` | `3` | Max nested-archive depth. |
| `fail_on_detect` | `true` | Fail the job if detections occur. |

> The Action lives in this repo at `.github/actions/pompelmi-scan`. When published to the Marketplace, consumers can copy the snippets above as-is.

---

## 🧩 Adapters

Use the adapter that matches your web framework. All adapters share the same policy options and scanning contract.

<p align="center">
  <img src="https://img.shields.io/badge/Express-✓-000000?style=flat-square&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/Koa-✓-33333D?style=flat-square&logo=koa" alt="Koa">
  <img src="https://img.shields.io/badge/Next.js-✓-000000?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Nuxt-✓-00DC82?style=flat-square&logo=nuxt.js" alt="Nuxt">
  <img src="https://img.shields.io/badge/NestJS-✓-E0234E?style=flat-square&logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/Fastify-alpha-000000?style=flat-square&logo=fastify" alt="Fastify">
  <img src="https://img.shields.io/badge/Remix-planned-000000?style=flat-square&logo=remix" alt="Remix">
  <img src="https://img.shields.io/badge/hapi-planned-F26D00?style=flat-square" alt="hapi">
  <img src="https://img.shields.io/badge/SvelteKit-planned-FF3E00?style=flat-square&logo=svelte" alt="SvelteKit">
</p>

### Available Adapters

| Framework | Package | Status | Install |
|-----------|---------|--------|---------|
| **Express** | `@pompelmi/express-middleware` | ✅ Stable | `npm i @pompelmi/express-middleware` |
| **Koa** | `@pompelmi/koa-middleware` | ✅ Stable | `npm i @pompelmi/koa-middleware` |
| **Next.js** | `@pompelmi/next-upload` | ✅ Stable | `npm i @pompelmi/next-upload` |
| **Nuxt/Nitro** | `pompelmi` (local) or remote API | ✅ Docs | [See guide](https://pompelmi.github.io/pompelmi/how-to/nuxt-nitro/) |
| **NestJS** | `@pompelmi/nestjs-integration` | ✅ Stable | `npm i @pompelmi/nestjs-integration` |
| **Fastify** | `@pompelmi/fastify-plugin` | 🔶 Alpha | `npm i @pompelmi/fastify-plugin` |
| **Remix** | - | 🔜 Planned | Coming soon |
| **SvelteKit** | - | 🔜 Planned | Coming soon |
| **hapi** | - | 🔜 Planned | Coming soon |

See the [📘 Code Examples](#-code-examples) section above for integration examples.

---

| Framework | Package | Status |
| --- | --- | --- |
| Express | `@pompelmi/express-middleware` | ✅ alpha |
| Koa | `@pompelmi/koa-middleware` | ✅ alpha |
| Next.js (App Router) | `@pompelmi/next-upload` | ✅ alpha |
| Fastify | `@pompelmi/fastify-plugin` | 🚧 alpha |
| NestJS | nestjs | 📋 planned |
| Remix | remix | 📋 planned |
| hapi | hapi plugin | 📋 planned |
| SvelteKit | sveltekit | 📋 planned |

---

## 🗺️ Diagrams

### Upload scanning flow
```mermaid
flowchart TD
  A["Client uploads file(s)"] --> B["Web App Route"]
  B --> C{"Pre-filters<br/>(ext, size, MIME)"}
  C -- fail --> X["HTTP 4xx"]
  C -- pass --> D{"Is ZIP?"}
  D -- yes --> E["Iterate entries<br/>(limits & scan)"]
  E --> F{"Verdict?"}
  D -- no --> F{"Scan bytes"}
  F -- malicious/suspicious --> Y["HTTP 422 blocked"]
  F -- clean --> Z["HTTP 200 ok + results"]
```
<details>
<summary>Mermaid source</summary>

```mermaid
flowchart TD
  A["Client uploads file(s)"] --> B["Web App Route"]
  B --> C{"Pre-filters<br/>(ext, size, MIME)"}
  C -- fail --> X["HTTP 4xx"]
  C -- pass --> D{"Is ZIP?"}
  D -- yes --> E["Iterate entries<br/>(limits & scan)"]
  E --> F{"Verdict?"}
  D -- no --> F{"Scan bytes"}
  F -- malicious/suspicious --> Y["HTTP 422 blocked"]
  F -- clean --> Z["HTTP 200 ok + results"]
```
</details>

### Sequence (App ↔ pompelmi ↔ YARA)
```mermaid
sequenceDiagram
  participant U as User
  participant A as App Route (/upload)
  participant P as pompelmi (adapter)
  participant Y as YARA engine

  U->>A: POST multipart/form-data
  A->>P: guard(files, policies)
  P->>P: MIME sniff + size + ext checks
  alt ZIP archive
    P->>P: unpack entries with limits
  end
  P->>Y: scan(bytes)
  Y-->>P: matches[]
  P-->>A: verdict (clean/suspicious/malicious)
  A-->>U: 200 or 4xx/422 with reason
```
<details>
<summary>Mermaid source</summary>

```mermaid
sequenceDiagram
  participant U as User
  participant A as App Route (/upload)
  participant P as pompelmi (adapter)
  participant Y as YARA engine

  U->>A: POST multipart/form-data
  A->>P: guard(files, policies)
  P->>P: MIME sniff + size + ext checks
  alt ZIP archive
    P->>P: unpack entries with limits
  end
  P->>Y: scan(bytes)
  Y-->>P: matches[]
  P-->>A: verdict (clean/suspicious/malicious)
  A-->>U: 200 or 4xx/422 with reason
```
</details>

### Components (monorepo)
```mermaid
flowchart LR
  subgraph Repo
    core["pompelmi (core)"]
    express["@pompelmi/express-middleware"]
    koa["@pompelmi/koa-middleware"]
    next["@pompelmi/next-upload"]
    fastify(("fastify-plugin · planned"))
    nest(("nestjs · planned"))
    remix(("remix · planned"))
    hapi(("hapi-plugin · planned"))
    svelte(("sveltekit · planned"))
  end
  core --> express
  core --> koa
  core --> next
  core -.-> fastify
  core -.-> nest
  core -.-> remix
  core -.-> hapi
  core -.-> svelte
```
<details>
<summary>Mermaid source</summary>

```mermaid
flowchart LR
  subgraph Repo
    core["pompelmi (core)"]
    express["@pompelmi/express-middleware"]
    koa["@pompelmi/koa-middleware"]
    next["@pompelmi/next-upload"]
    fastify(("fastify-plugin · planned"))
    nest(("nestjs · planned"))
    remix(("remix · planned"))
    hapi(("hapi-plugin · planned"))
    svelte(("sveltekit · planned"))
  end
  core --> express
  core --> koa
  core --> next
  core -.-> fastify
  core -.-> nest
  core -.-> remix
  core -.-> hapi
  core -.-> svelte
```
</details>

---

## ⚙️ Configuration

All adapters accept a common set of options:

| Option | Type (TS) | Purpose |
| --- | --- | --- |
| `scanner` | `{ scan(bytes: Uint8Array): Promise<Match[]> }` | Your scanning engine. Return `[]` when clean; non‑empty to flag. |
| `includeExtensions` | `string[]` | Allow‑list of file extensions. Evaluated case‑insensitively. |
| `allowedMimeTypes` | `string[]` | Allow‑list of MIME types after magic‑byte sniffing. |
| `maxFileSizeBytes` | `number` | Per‑file size cap. Oversize files are rejected early. |
| `timeoutMs` | `number` | Per‑file scan timeout; guards against stuck scanners. |
| `concurrency` | `number` | How many files to scan in parallel. |
| `failClosed` | `boolean` | If `true`, errors/timeouts block the upload. |
| `onScanEvent` | `(event: unknown) => void` | Optional telemetry hook for logging/metrics. |

**Common recipes**

Allow only images up to 5 MB:

```ts
includeExtensions: ['png','jpg','jpeg','webp'],
allowedMimeTypes: ['image/png','image/jpeg','image/webp'],
maxFileSizeBytes: 5 * 1024 * 1024,
failClosed: true,
```

---

## ✅ Production checklist

- [ ] **Limit file size** aggressively (`maxFileSizeBytes`).
- [ ] **Restrict extensions & MIME** to what your app truly needs.
- [ ] **Set `failClosed: true` in production** to block on timeouts/errors.
- [ ] **Handle ZIPs carefully** (enable deep ZIP, keep nesting low, cap entry sizes).
- [ ] **Compose scanners** with `composeScanners()` and enable `stopOn` to fail fast on early detections.
- [ ] **Log scan events** (`onScanEvent`) and monitor for spikes.
- [ ] **Run scans in a separate process/container** for defense‑in‑depth when possible.
- [ ] **Sanitize file names and paths** if you persist uploads.
- [ ] **Prefer memory storage + post‑processing**; avoid writing untrusted bytes before policy passes.
- [ ] **Add CI scanning** with the GitHub Action to catch bad files in repos/artifacts.

---

## 🧬 YARA Getting Started

YARA lets you detect suspicious or malicious content using pattern‑matching rules.  
**pompelmi** treats YARA matches as signals that you can map to your own verdicts  
(e.g., mark high‑confidence rules as `malicious`, heuristics as `suspicious`).

> **Status:** Optional. You can run without YARA. If you adopt it, keep your rules small, time‑bound, and tuned to your threat model.

### Starter rules

Below are three example rules you can adapt:

`rules/starter/eicar.yar`
```yar
rule EICAR_Test_File
{
    meta:
        description = "EICAR antivirus test string (safe)"
        reference   = "https://www.eicar.org"
        confidence  = "high"
        verdict     = "malicious"
    strings:
        $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    condition:
        $eicar
}
```

`rules/starter/pdf_js.yar`
```yar
rule PDF_JavaScript_Embedded
{
    meta:
        description = "PDF contains embedded JavaScript (heuristic)"
        confidence  = "medium"
        verdict     = "suspicious"
    strings:
        $magic = { 25 50 44 46 } // "%PDF"
        $js1 = "/JavaScript" ascii
        $js2 = "/JS" ascii
        $open = "/OpenAction" ascii
        $aa = "/AA" ascii
    condition:
        uint32(0) == 0x25504446 and ( $js1 or $js2 ) and ( $open or $aa )
}
```

`rules/starter/office_macros.yar`
```yar
rule Office_Macro_Suspicious_Words
{
    meta:
        description = "Heuristic: suspicious VBA macro keywords"
        confidence  = "medium"
        verdict     = "suspicious"
    strings:
        $s1 = /Auto(Open|Close)/ nocase
        $s2 = "Document_Open" nocase ascii
        $s3 = "CreateObject(" nocase ascii
        $s4 = "WScript.Shell" nocase ascii
        $s5 = "Shell(" nocase ascii
        $s6 = "Sub Workbook_Open()" nocase ascii
    condition:
        2 of ($s*)
}
```

> These are **examples**. Expect some false positives; tune to your app.

### Minimal integration (adapter contract)

If you use a YARA binding (e.g., `@automattic/yara`), wrap it behind the `scanner` contract:

```ts
// Example YARA scanner adapter (pseudo‑code)
import * as Y from '@automattic/yara';

// Compile your rules from disk at boot (recommended)
// const sources = await fs.readFile('rules/starter/*.yar', 'utf8');
// const compiled = await Y.compile(sources);

export const YourYaraScanner = {
  async scan(bytes: Uint8Array) {
    // const matches = await compiled.scan(bytes, { timeout: 1500 });
    const matches = []; // plug your engine here
    // Map to the structure your app expects; return [] when clean.
    return matches.map((m: any) => ({
      rule: m.rule,
      meta: m.meta ?? {},
      tags: m.tags ?? [],
    }));
  }
};
```

Then include it in your composed scanner:

```ts
import { composeScanners, CommonHeuristicsScanner } from 'pompelmi';
// import { YourYaraScanner } from './yara-scanner';

export const scanner = composeScanners(
  [
    ['heuristics', CommonHeuristicsScanner],
    // ['yara', YourYaraScanner],
  ],
  { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
);
```

### Policy suggestion (mapping matches → verdict)

- **malicious**: high‑confidence rules (e.g., `EICAR_Test_File`)
- **suspicious**: heuristic rules (e.g., PDF JavaScript, macro keywords)
- **clean**: no matches

Combine YARA with MIME sniffing, ZIP safety limits, and strict size/time caps.

## 🧪 Quick test (no EICAR)

Use the examples above, then send a **minimal PDF** that contains risky tokens (this triggers the built‑in heuristics).

**1) Create a tiny PDF with risky actions**

Linux:
```bash
printf '%%PDF-1.7\n1 0 obj\n<< /OpenAction 1 0 R /AA << /JavaScript (alert(1)) >> >>\nendobj\n%%EOF\n' > risky.pdf
```

macOS:
```bash
printf '%%PDF-1.7\n1 0 obj\n<< /OpenAction 1 0 R /AA << /JavaScript (alert(1)) >> >>\nendobj\n%%EOF\n' > risky.pdf
```

**2) Send it to your endpoint**

Express (default from the Quick‑start):
```bash
curl -F "file=@risky.pdf;type=application/pdf" http://localhost:3000/upload -i
```

You should see an HTTP **422 Unprocessable Entity** (blocked by policy). Clean files return **200 OK**. Pre‑filter failures (size/ext/MIME) should return a **4xx**. Adapt these conventions to your app as needed.

---

## 🔒 Security notes

- The library **reads** bytes; it never executes files.
- YARA detections depend on the **rules you provide**; expect some false positives/negatives.
- ZIP scanning applies limits (entries, per‑entry size, total uncompressed, nesting) to reduce archive‑bomb risk.
- Prefer running scans in a **dedicated process/container** for defense‑in‑depth.

---

##  Releases & security

- **Changelog / releases:** see [GitHub Releases](https://github.com/pompelmi/pompelmi/releases).
- **Security disclosures:** please use [GitHub Security Advisories](https://github.com/pompelmi/pompelmi/security/advisories). We’ll coordinate a fix before public disclosure.
- **Production users:** open a [Discussion](https://github.com/pompelmi/pompelmi/discussions) to share requirements or request adapters.

## ⭐ Star history

[![Star History Chart](https://api.star-history.com/svg?repos=pompelmi/pompelmi&type=Date)](https://star-history.com/#pompelmi/pompelmi&Date)

---

---

## 🏆 Community & Recognition

pompelmi has been featured in leading developer publications and is trusted by teams worldwide for secure file upload handling.

<p align="center">
  <img src="https://img.shields.io/badge/Featured%20in-Detection%20Engineering%20Weekly-0A84FF?style=for-the-badge&logo=substack" alt="Detection Engineering">
  <img src="https://img.shields.io/badge/Featured%20in-Node%20Weekly-FF6600?style=for-the-badge&logo=node.js" alt="Node Weekly">
  <img src="https://img.shields.io/badge/Featured%20in-Bytes-111111?style=for-the-badge" alt="Bytes">
</p>

<!-- MENTIONS:START -->

## 🌟 Featured In

*Last updated: January 24, 2026*

*No mentions found yet. Run `npm run mentions:find` to discover mentions.*

<!-- MENTIONS:END -->

### 🤝 Community & Support

**Need help? We're here for you!**

- 📖 **[Documentation](https://pompelmi.github.io/pompelmi/)** — Complete API reference, guides, and tutorials
- 💬 **[GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions)** — Ask questions, share ideas, get community support
- 🐛 **[Issue Tracker](https://github.com/pompelmi/pompelmi/issues)** — Report bugs, request features
- 🔒 **[Security Policy](https://github.com/pompelmi/pompelmi/security)** — Report security vulnerabilities privately
- 💼 **Commercial Support** — For enterprise support and consulting, contact the maintainers

**Supported Frameworks:**
- ✅ Express
- ✅ Koa  
- ✅ Next.js (App & Pages Router)
- ✅ NestJS
- ✅ Fastify (alpha)
- 🔜 Remix (planned)
- 🔜 SvelteKit (planned)
- 🔜 hapi (planned)

---

## 📊 Star History

<p align="center">
  <a href="https://star-history.com/#pompelmi/pompelmi&Date">
    <img src="https://api.star-history.com/svg?repos=pompelmi/pompelmi&type=Date" alt="Star History Chart" />
  </a>
</p>

---

## 🎖️ Contributors

Thanks to all the amazing contributors who have helped make pompelmi better!

<p align="center">
  <a href="https://github.com/pompelmi/pompelmi/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=pompelmi/pompelmi" alt="Contributors" />
  </a>
</p>

<p align="center">
  <em>Want to contribute? Check out our <a href="./CONTRIBUTING.md">Contributing Guide</a>!</em>
</p>

---

## 💬 FAQ

**Do I need YARA?**  
No. `scanner` is pluggable. The examples use a minimal scanner for clarity; you can call out to a YARA engine or any other detector you prefer.

**Where do the results live?**  
In the examples, the guard attaches scan data to the request context (e.g. `req.pompelmi` in Express, `ctx.pompelmi` in Koa). In Next.js, include the results in your JSON response as you see fit.

**Why 422 for blocked files?**  
Using **422** to signal a policy violation keeps it distinct from transport errors; it’s a common pattern. Use the codes that best match your API guidelines.

**Are ZIP bombs handled?**  
Archives are traversed with limits to reduce archive‑bomb risk. Keep your size limits conservative and prefer `failClosed: true` in production.

---

## 🧪 Tests & Coverage

Run tests locally with coverage:

```bash
pnpm vitest run --coverage --passWithNoTests
```

The badge tracks the **core library** (`src/**`). Adapters and engines are reported separately for now and will be folded into global coverage as their suites grow.

If you integrate Codecov in CI, upload `coverage/lcov.info` and you can use this Codecov badge:

```md
[![codecov](https://codecov.io/gh/pompelmi/pompelmi/branch/main/graph/badge.svg?flag=core)](https://codecov.io/gh/pompelmi/pompelmi)
```

## 🤝 Contributing

PRs and issues welcome! Start with:

```bash
pnpm -r build
pnpm -r lint
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 🎓 Learning Resources

### 📚 Documentation

- [Official Docs](https://pompelmi.github.io/pompelmi/) — Complete API reference and guides
- [Examples](./examples/) — Real-world integration examples
- [Security Guide](./SECURITY.md) — Security best practices and disclosure policy

### 🎥 Tutorials & Articles

- **File Upload Security in Node.js** — Best practices guide (coming soon)
- **Integrating YARA with pompelmi** — Advanced detection setup (coming soon)
- **Zero-Trust File Uploads** — Architecture patterns (coming soon)

### 🛠️ Tools & Integrations

- [GitHub Action](https://github.com/pompelmi/pompelmi/tree/main/.github/actions/pompelmi-scan) — CI/CD scanning
- [Docker Images](https://hub.docker.com/r/pompelmi/pompelmi) — Containerized scanning (coming soon)
- [Cloud Functions](https://github.com/pompelmi/cloud-functions) — Serverless examples (coming soon)

---

## 📊 Project Stats

<p align="center">
  <img src="https://repobeats.axiom.co/api/embed/YOUR_EMBED_ID.svg" alt="Repobeats analytics" />
</p>

---

## 🙏 Acknowledgments

pompelmi stands on the shoulders of giants. Special thanks to:

- The YARA project for powerful pattern matching
- The Node.js community for excellent tooling
- All our contributors and users

---

## 📞 Support

Need help? We're here for you!

- 📖 [Documentation](https://pompelmi.github.io/pompelmi/)
- 💬 [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions)
- 🐛 [Issue Tracker](https://github.com/pompelmi/pompelmi/issues)
- 🔒 [Security](https://github.com/pompelmi/pompelmi/security) (for vulnerabilities)

For commercial support and consulting, contact the maintainers.

---

<p align="right"><a href="#pompelmi">↑ Back to top</a></p>

## 📜 License

[MIT](./LICENSE) © 2025‑present pompelmi contributors
