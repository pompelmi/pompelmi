# Pompelmi

In-process file upload security for Node.js. Inspect untrusted files before storage so your application can reject, quarantine, or accept with context.

[![npm version](https://img.shields.io/npm/v/pompelmi)](https://www.npmjs.com/package/pompelmi)
[![CI](https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci.yml?label=ci)](https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/pompelmi/pompelmi)](https://github.com/pompelmi/pompelmi/stargazers)

Pompelmi helps reduce:

- MIME / extension spoofing and magic-byte mismatches
- risky archive structures such as ZIP bombs, traversal, and deep nesting
- risky document and binary patterns such as PDF actions, Office macro hints, PE signatures, and polyglot files
- store-first upload flows that need a clean / suspicious / malicious verdict before persistence
- known malicious matches when you plug in YARA or another scanner

Install: `npm install pompelmi`

## Quick Start

```ts
import { scanBytes, STRICT_PUBLIC_UPLOAD } from 'pompelmi';

const report = await scanBytes(file.buffer, {
  filename: file.originalname,
  mimeType: file.mimetype,
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
```

Need a local scan in under a minute? Start with [Getting started](https://pompelmi.github.io/pompelmi/getting-started/). Want a preview of the verdict flow first? Open the [browser preview](https://pompelmi.github.io/pompelmi/#browser-preview). Want a minimal server route? See [examples/demo](./examples/demo).

If Pompelmi fits the way you handle upload risk, a GitHub star helps more Node.js teams find the project.

## Why It Exists

Upload endpoints are part of your attack surface. A file can look harmless at the form layer and only become dangerous after storage, extraction, rendering, or downstream parsing.

Pompelmi keeps the first decision inside the application path, where the route still knows the file class, the trust level, and the right failure mode.

## Where It Fits

- public or semi-trusted upload endpoints that should inspect first and store later
- memory-backed multipart routes in Express, Next.js, NestJS, Fastify, and Koa
- quarantine and promotion workflows for S3 or other object storage
- document, image, and archive routes that need different policies
- CI/CD or internal artifact scanning before promotion

## Integrations

- Express: [Docs](https://pompelmi.github.io/pompelmi/how-to/express/) · [Example](./examples/express-minimal)
- Next.js: [Docs](https://pompelmi.github.io/pompelmi/how-to/nextjs/) · [Example](./examples/next-app-router)
- NestJS: [Docs](https://pompelmi.github.io/pompelmi/how-to/nestjs/) · [Example app](./examples/nestjs-app)
- Fastify: [Docs](https://pompelmi.github.io/pompelmi/how-to/fastify/) · [Package](./packages/fastify-plugin)
- Koa: [Docs](https://pompelmi.github.io/pompelmi/how-to/koa/) · [Package](./packages/koa-middleware)
- Nuxt/Nitro: [Docs](https://pompelmi.github.io/pompelmi/how-to/nuxt-nitro/)
- S3 / object storage: [Tutorial](https://pompelmi.github.io/pompelmi/tutorials/secure-s3-presigned-uploads-with-malware-scanning/) · [Use case](https://pompelmi.github.io/pompelmi/use-cases/s3-presigned-upload-security/)
- CI/CD: [Use case](https://pompelmi.github.io/pompelmi/use-cases/cicd-artifact-scanning/) · [Blog](https://pompelmi.github.io/pompelmi/blog/cicd-scan-build-artifacts/)

## Docs and Examples

- [Docs home](https://pompelmi.github.io/pompelmi/)
- [Getting started](https://pompelmi.github.io/pompelmi/getting-started/)
- [Use cases](https://pompelmi.github.io/pompelmi/use-cases/)
- [Comparisons](https://pompelmi.github.io/pompelmi/comparisons/)
- [Tutorials](https://pompelmi.github.io/pompelmi/tutorials/)
- [Examples index](./examples/README.md)
- [Demo example](./examples/demo)
- [Featured in](https://pompelmi.github.io/pompelmi/featured-in/)
- [Translations](https://pompelmi.github.io/pompelmi/translations/)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Roadmap](./ROADMAP.md)

## Demo

![Pompelmi demo](assets/malware-detection-node-demo.gif)

The website includes a client-side [browser preview](https://pompelmi.github.io/pompelmi/#browser-preview) for fast evaluation. The repo also ships a minimal [Express upload gate demo](./examples/demo) that returns `clean`, `suspicious`, or `malicious` before storage.

## What It Checks

Pompelmi is designed for the upload boundary, not as a full antivirus replacement.

It can combine:

- MIME sniffing, magic-byte checks, and extension allowlists
- archive controls such as ZIP bombs, traversal, entry counts, expansion limits, and nesting limits
- common heuristics for risky PDFs, Office macro hints, executables, and other suspicious structures
- optional YARA-based signature matching
- route-level `clean`, `suspicious`, and `malicious` decisions with quarantine-friendly workflows

## Ecosystem

- `pompelmi`
- `@pompelmi/express-middleware`
- `@pompelmi/koa-middleware`
- `@pompelmi/next-upload`
- `@pompelmi/nestjs-integration`
- `@pompelmi/fastify-plugin`
- `@pompelmi/ui-react`
- `@pompelmi/cli`

## Repository Layout

- `src/` core library
- `packages/` framework adapters and supporting packages
- `examples/` runnable examples
- `tests/` test coverage
- `website/` public docs, blog, and discovery site

## Development

```bash
pnpm install
pnpm test
pnpm build
```

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

## License

[MIT](./LICENSE)
