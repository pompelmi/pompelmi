<div align="center">
  <img src="assets/logo.svg" alt="Pompelmi logo" width="160" />
  <h1>Pompelmi</h1>
  <p>Local-first file upload scanning for Node.js.</p>
  <p>
    <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm version" src="https://img.shields.io/npm/v/pompelmi"></a>
    <a href="https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci.yml?label=ci"></a>
    <a href="https://github.com/pompelmi/pompelmi/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/pompelmi/pompelmi"></a>
    <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm downloads" src="https://img.shields.io/npm/dm/pompelmi"></a>
  </p>
  <p>
    <a href="https://github.com/sorrycc/awesome-javascript"><img alt="Mentioned in Awesome JavaScript" src="https://img.shields.io/badge/mentioned-Awesome%20JavaScript-f59e0b"></a>
    <a href="https://github.com/dzharii/awesome-typescript"><img alt="Mentioned in Awesome TypeScript" src="https://img.shields.io/badge/mentioned-Awesome%20TypeScript-3178C6"></a>
    <a href="https://nodeweekly.com/issues/594"><img alt="Featured in Node Weekly #594" src="https://img.shields.io/badge/featured-Node%20Weekly%20%23594-339933?logo=node.js&logoColor=white"></a>
    <a href="https://bytes.dev/archives/429"><img alt="Featured in Bytes #429" src="https://img.shields.io/badge/featured-Bytes%20%23429-111111"></a>
  </p>
  <p>
    <a href="https://www.detectionengineering.net/p/det-eng-weekly-issue-124-the-defcon"><img alt="Featured in Detection Engineering Weekly #124" src="https://img.shields.io/badge/featured-Detection%20Engineering%20Weekly%20%23124-0A84FF?logo=substack&logoColor=white"></a>
    <a href="https://stackoverflow.blog/2026/02/23/defense-against-uploads-oss-file-scanner-pompelmi/"><img alt="Featured on Stack Overflow by Ryan Donovan" src="https://img.shields.io/badge/featured-Stack%20Overflow-F48024?logo=stackoverflow&logoColor=white"></a>
    <a href="https://stackoverflow.blog/newsletter/issue-319-dogfooding-your-sdlc/"><img alt="Featured in The Overflow #319" src="https://img.shields.io/badge/featured-The%20Overflow%20%23319-F48024?logo=stackoverflow&logoColor=white"></a>
    <a href="https://www.helpnetsecurity.com/2026/02/02/pompelmi-open-source-secure-file-upload-scanning-node-js/"><img alt="Featured in Help Net Security" src="https://img.shields.io/badge/featured-Help%20Net%20Security-2563eb"></a>
  </p>
</div>

Pompelmi inspects untrusted files before storage and helps you decide whether to allow, reject, or quarantine them before they reach downstream systems.

It is built for upload endpoints that cannot rely on filenames, extensions, or client-provided MIME types alone.

## Demo

![Pompelmi demo](assets/malware-detection-node-demo.gif)

## Install

```bash
npm install pompelmi
```

Requires Node.js 18+.

## Quick Start

```ts
import { scanBytes } from 'pompelmi';

const report = await scanBytes(file.buffer, {
  ctx: {
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  },
});

if (!report.ok) {
  return res.status(422).json({
    error: 'Upload blocked',
    verdict: report.verdict,
    reasons: report.reasons,
  });
}
```

## What Problem It Solves

Upload endpoints are part of your attack surface. A renamed executable, a risky PDF, or a hostile archive can look harmless until it is stored, unpacked, served, or parsed by another system.

Pompelmi adds checks at the upload boundary for:

- MIME spoofing and magic-byte mismatches
- Archive abuse such as ZIP bombs, traversal, and deep nesting
- Polyglot files and risky document structures
- Optional YARA-based signature matching

The goal is simple: inspect first, store later.

## Why This Shape

- Plain Markdown, readable in GitHub and in a terminal
- Fast path first: install, example, then deeper links
- Minimal top-level detail, with docs and examples for everything else

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
- `website/` documentation site

## Development

```bash
pnpm install
pnpm test
pnpm build
```

## Links

- [Documentation](https://pompelmi.github.io/pompelmi/)
- [Examples](./examples)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Roadmap](./ROADMAP.md)

<!-- MENTIONS:START -->

## 🌟 Featured In

*Last updated: March 20, 2026*

### 📋 Awesome Lists & Curated Collections

- [Awesome JavaScript](https://github.com/sorrycc/awesome-javascript) — sorrycc
- [Awesome TypeScript](https://github.com/dzharii/awesome-typescript) — dzharii

### 📰 Newsletters & Roundups

- [The Overflow Issue 319: Dogfooding your SDLC](https://stackoverflow.blog/newsletter/issue-319-dogfooding-your-sdlc/) — Stack Overflow (2026-03-04)
- [Hottest cybersecurity open-source tools of the month: February 2026](https://www.helpnetsecurity.com/2026/02/26/hottest-cybersecurity-open-source-tools-of-the-month-february-2026/) — Help Net Security (2026-02-26)
- [Bytes #429](https://bytes.dev/archives/429) — Bytes (2025-10-03)
- [Node Weekly Issue 594](https://nodeweekly.com/issues/594) — Node Weekly (2025-09-30)
- [Det. Eng. Weekly Issue #124 - The DEFCON hangover is real](https://www.detectionengineering.net/p/det-eng-weekly-issue-124-the-defcon) — Detection Engineering (2025-08-13)

### 🔗 Other Mentions

- [Defense against uploads: Q&A with OSS file scanner, pompelmi](https://stackoverflow.blog/2026/02/23/defense-against-uploads-oss-file-scanner-pompelmi/) — Stack Overflow (2026-02-23)
- [Pompelmi: Open-source secure file upload scanning for Node.js](https://www.helpnetsecurity.com/2026/02/02/pompelmi-open-source-secure-file-upload-scanning-node-js/) — Help Net Security (2026-02-02)


*Found 9 mentions. To update, run `npm run mentions:update`.*

<!-- MENTIONS:END -->

## License

[MIT](./LICENSE)
