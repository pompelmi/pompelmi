<div align="center">
  <img src="./assets/logo.svg" alt="Pompelmi logo" width="144" />

  <h1>Pompelmi</h1>

  <p><strong>Route-level upload security for Node.js.</strong></p>

  <p>Inspect untrusted uploads before storage.</p>

  <p>
    MIME and extension spoofing · archive abuse · risky document and binary
    signals · optional YARA
  </p>

  <p><code>clean</code> · <code>suspicious</code> · <code>malicious</code></p>

  <p>
    <sub>Express · Next.js · NestJS · Fastify · Koa · Nuxt/Nitro · S3 quarantine flows · CI/CD</sub>
  </p>

  <p><sub>Open-source core · MIT · Node.js 18+</sub></p>

  <p>
    <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm version" src="https://img.shields.io/npm/v/pompelmi" /></a>
    <a href="https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci.yml?label=ci" /></a>
    <a href="https://codecov.io/gh/pompelmi/pompelmi"><img alt="codecov" src="https://codecov.io/gh/pompelmi/pompelmi/graph/badge.svg" /></a>
    <a href="https://github.com/pompelmi/pompelmi/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/pompelmi/pompelmi?style=social" /></a>
    <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm weekly downloads" src="https://img.shields.io/npm/dw/pompelmi" /></a>
    <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm monthly downloads" src="https://img.shields.io/npm/dm/pompelmi" /></a>
  </p>

  <p>
    <a href="https://pompelmi.github.io/pompelmi/getting-started/"><strong>Getting started</strong></a>
    ·
    <a href="https://pompelmi.github.io/pompelmi/#browser-preview"><strong>Browser preview</strong></a>
    ·
    <a href="./examples/demo"><strong>Express demo</strong></a>
    ·
    <a href="./examples/README.md"><strong>Examples</strong></a>
  </p>
</div>

<p align="center">
  Mentioned by <a href="https://nodeweekly.com/issues/594">Node Weekly</a>,
  <a href="https://stackoverflow.blog/2026/02/23/defense-against-uploads-oss-file-scanner-pompelmi/">Stack Overflow</a>,
  <a href="https://www.helpnetsecurity.com/2026/02/02/pompelmi-open-source-secure-file-upload-scanning-node-js/">Help Net Security</a>,
  <a href="https://github.com/sorrycc/awesome-javascript">Awesome JavaScript</a>,
  and
  <a href="https://github.com/dzharii/awesome-typescript">Awesome TypeScript</a>.
</p>

## Quick Start

Install the core package:

```bash
npm install pompelmi
```

Minimal route-level example:

```ts
import { scanBytes, STRICT_PUBLIC_UPLOAD } from 'pompelmi';

const report = await scanBytes(req.file.buffer, {
  filename: req.file.originalname,
  mimeType: req.file.mimetype,
  policy: STRICT_PUBLIC_UPLOAD,
  failClosed: true,
});

if (report.verdict !== 'clean') {
  return res.status(422).json({
    error: 'Upload blocked',
    verdict: report.verdict,
    reasons: report.reasons,
  });
}

return res.status(200).json({ verdict: report.verdict });
```

Start with [Getting started](https://pompelmi.github.io/pompelmi/getting-started/) for a local scan in under a minute, open the [browser preview](https://pompelmi.github.io/pompelmi/#browser-preview) to inspect the verdict flow without sending files anywhere, or run the minimal [Express demo](./examples/demo).

If Pompelmi matches how you want upload security to work, star the repo so more Node.js teams can find it.

## Why It Exists

Upload endpoints are part of your attack surface. A file can look harmless at the form layer and become dangerous only after storage, extraction, rendering, or downstream parsing.

Pompelmi keeps the first decision inside the application path, where the route still knows the file class, trust level, storage path, and failure mode.

## What It Checks

- MIME sniffing, magic-byte validation, and extension allowlists
- risky archive structures such as traversal, deep nesting, entry-count abuse, and ZIP bomb-style expansion
- suspicious document and binary signals such as risky PDF actions, Office macro hints, PE headers, and polyglot files
- optional YARA or other scanner matches
- route-level verdicts that support reject, quarantine, or promote workflows

## Where It Fits

- public or semi-trusted upload endpoints that should inspect first and store later
- memory-backed multipart routes in Express, Next.js, NestJS, Fastify, and Koa
- quarantine and promotion workflows for S3 or other object storage
- document, image, and archive routes that need different policies
- CI/CD or internal artifact scanning before promotion

## Why Not Just X?

| Approach | Useful for | What it misses |
| --- | --- | --- |
| Browser MIME and extension checks | Fast client-side hints and UX feedback | Filenames and client-reported MIME are easy to spoof |
| Simple file-type or magic-byte checks | Confirming the file appears to be the claimed type | Risky internal structure, archive abuse, and route policy decisions |
| Antivirus-only thinking | Known malicious matches and signature-based detection | Route context, spoofing checks, storage decisions, and non-signature risk signals |
| Pompelmi at the upload route | Inspect-first, store-later decisions with policy, structure checks, and optional YARA | It is not a full antivirus replacement on its own |

## Integrations

- Express: [Docs](https://pompelmi.github.io/pompelmi/how-to/express/) · [Minimal example](./examples/express-minimal) · [Demo](./examples/demo)
- Next.js: [Docs](https://pompelmi.github.io/pompelmi/how-to/nextjs/) · [Example](./examples/next-app-router)
- NestJS: [Docs](https://pompelmi.github.io/pompelmi/how-to/nestjs/) · [Example app](./examples/nestjs-app)
- Fastify: [Docs](https://pompelmi.github.io/pompelmi/how-to/fastify/) · [Package](./packages/fastify-plugin)
- Koa: [Docs](https://pompelmi.github.io/pompelmi/how-to/koa/) · [Package](./packages/koa-middleware)
- Nuxt/Nitro: [Docs](https://pompelmi.github.io/pompelmi/how-to/nuxt-nitro/)
- S3 / object storage: [Tutorial](https://pompelmi.github.io/pompelmi/tutorials/secure-s3-presigned-uploads-with-malware-scanning/) · [Use case](https://pompelmi.github.io/pompelmi/use-cases/s3-presigned-upload-security/)
- CI/CD: [Use case](https://pompelmi.github.io/pompelmi/use-cases/cicd-artifact-scanning/) · [Blog](https://pompelmi.github.io/pompelmi/blog/cicd-scan-build-artifacts/)

## Demo, Preview, and Examples

![Pompelmi upload security demo](assets/malware-detection-node-demo.gif)

- [Browser preview](https://pompelmi.github.io/pompelmi/#browser-preview) for a fast local evaluation of the verdict UX
- [Demo](./examples/demo) for a tiny Express upload gate that returns `clean`, `suspicious`, or `malicious` before storage
- [Examples index](./examples/README.md) for framework-specific and production-oriented examples

## Docs

- [Docs home](https://pompelmi.github.io/pompelmi/)
- [Getting started](https://pompelmi.github.io/pompelmi/getting-started/)
- [Use cases](https://pompelmi.github.io/pompelmi/use-cases/)
- [Comparisons](https://pompelmi.github.io/pompelmi/comparisons/)
- [Tutorials](https://pompelmi.github.io/pompelmi/tutorials/)
- [Featured in](https://pompelmi.github.io/pompelmi/featured-in/)
- [Translations](https://pompelmi.github.io/pompelmi/translations/)

## Enterprise and Commercial Support

The MIT core remains the primary path. Teams that need private rollout help, architecture review, or policy tuning can use the existing [enterprise support path](https://pompelmi.github.io/pompelmi/enterprise/).

<!-- MENTIONS:START -->

## Featured In

Full page: [pompelmi.github.io/pompelmi/featured-in](https://pompelmi.github.io/pompelmi/featured-in/)

*Last updated: March 20, 2026*

### Awesome Lists & Curated Collections

- [Awesome JavaScript](https://github.com/sorrycc/awesome-javascript) — sorrycc
- [Awesome TypeScript](https://github.com/dzharii/awesome-typescript) — dzharii

### Newsletters & Roundups

- [The Overflow Issue 319: Dogfooding your SDLC](https://stackoverflow.blog/newsletter/issue-319-dogfooding-your-sdlc/) — Stack Overflow (2026-03-04)
- [Hottest cybersecurity open-source tools of the month: February 2026](https://www.helpnetsecurity.com/2026/02/26/hottest-cybersecurity-open-source-tools-of-the-month-february-2026/) — Help Net Security (2026-02-26)
- [Bytes #429](https://bytes.dev/archives/429) — Bytes (2025-10-03)
- [Node Weekly Issue 594](https://nodeweekly.com/issues/594) — Node Weekly (2025-09-30)
- [Det. Eng. Weekly Issue #124 - The DEFCON hangover is real](https://www.detectionengineering.net/p/det-eng-weekly-issue-124-the-defcon) — Detection Engineering (2025-08-13)

### Other Mentions

- [Defense against uploads: Q&A with OSS file scanner, pompelmi](https://stackoverflow.blog/2026/02/23/defense-against-uploads-oss-file-scanner-pompelmi/) — Stack Overflow (2026-02-23)
- [Pompelmi: Open-source secure file upload scanning for Node.js](https://www.helpnetsecurity.com/2026/02/02/pompelmi-open-source-secure-file-upload-scanning-node-js/) — Help Net Security (2026-02-02)


*Found 9 mentions. To update, run `npm run mentions:update`.*

<!-- MENTIONS:END -->

## Project

- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Roadmap](./ROADMAP.md)
- [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions)
- [License](./LICENSE)
