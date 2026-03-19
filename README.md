<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/pompelmi/pompelmi/main/assets/logo.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/pompelmi/pompelmi/main/assets/logo.svg">
  <img src="https://raw.githubusercontent.com/pompelmi/pompelmi/main/assets/logo.svg" alt="Pompelmi logo" width="220" />
</picture>

<h1>Pompelmi</h1>

<p><strong>Stop malicious uploads before they hit storage.</strong></p>

<p>Secure file upload scanning for Node.js with MIME sniffing, ZIP bomb protection, polyglot detection, risky document checks, and optional YARA.</p>

<p>
  <a href="https://github.com/pompelmi/pompelmi/stargazers"><img alt="Star on GitHub" src="https://img.shields.io/badge/Star%20on%20GitHub-181717?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="#quick-start"><img alt="Start in 60 seconds" src="https://img.shields.io/badge/Start%20in-60%20seconds-059669?style=for-the-badge"></a>
  <a href="https://pompelmi.github.io/pompelmi/"><img alt="Read the docs" src="https://img.shields.io/badge/Read%20the-Docs-2563eb?style=for-the-badge"></a>
</p>

<p><strong>Private by design</strong> • <strong>No cloud API</strong> • <strong>No daemon</strong> • <strong>Express / Next.js / Koa / NestJS / Fastify</strong></p>

<p>
  <a href="https://github.com/pompelmi/pompelmi/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/pompelmi/pompelmi?style=for-the-badge&logo=github&label=stars"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm downloads per month" src="https://img.shields.io/npm/dm/pompelmi?style=for-the-badge&logo=npm&label=downloads%2Fmonth"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm version" src="https://img.shields.io/npm/v/pompelmi?style=for-the-badge&logo=npm&label=npm"></a>
  <a href="https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci.yml?style=for-the-badge&branch=main&label=CI"></a>
</p>

<p>
  <img alt="Node 18+" src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-0f172a?style=for-the-badge">
  <img alt="Zero cloud dependency" src="https://img.shields.io/badge/cloud-none-059669?style=for-the-badge">
</p>

<p>
  <strong>
    <a href="https://pompelmi.github.io/pompelmi/">Docs</a> •
    <a href="#quick-start">Quick start</a> •
    <a href="./examples">Examples</a> •
    <a href="#frameworks">Frameworks</a> •
    <a href="#star-history">Star history</a>
  </strong>
</p>

<p>If Pompelmi saves you from building upload security plumbing from scratch, give it a star. It helps the project grow and helps more Node.js teams find it.</p>

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/pompelmi/pompelmi/main/assets/readme-banner.png" alt="Pompelmi banner" width="100%">
</p>

## Featured In

Picked up by developer newsletters, security media, and curated awesome lists.

<p align="center">
  <a href="https://www.producthunt.com/products/pompelmi"><img alt="Featured on Product Hunt" src="https://img.shields.io/badge/featured-Product%20Hunt-da552f?style=for-the-badge&logo=producthunt&logoColor=white"></a>
  <a href="https://www.helpnetsecurity.com/2026/02/02/pompelmi-open-source-secure-file-upload-scanning-node-js/"><img alt="Featured on Help Net Security" src="https://img.shields.io/badge/featured-Help%20Net%20Security-ff6b35?style=for-the-badge"></a>
  <a href="https://stackoverflow.blog/2026/02/23/defense-against-uploads-oss-file-scanner-pompelmi/"><img alt="Featured on Stack Overflow Blog" src="https://img.shields.io/badge/featured-Stack%20Overflow%20Blog-f58025?style=for-the-badge&logo=stackoverflow&logoColor=white"></a>
  <a href="https://nodeweekly.com/issues/594"><img alt="Featured in Node Weekly issue 594" src="https://img.shields.io/badge/featured-Node%20Weekly%20%23594-43853d?style=for-the-badge&logo=node.js&logoColor=white"></a>
  <a href="https://bytes.dev/archives/429"><img alt="Featured in Bytes issue 429" src="https://img.shields.io/badge/featured-Bytes%20%23429-111111?style=for-the-badge"></a>
  <a href="https://www.detectionengineering.net/p/det-eng-weekly-issue-124-the-defcon"><img alt="Featured in Detection Engineering Weekly issue 124" src="https://img.shields.io/badge/featured-Detection%20Engineering%20Weekly-2563eb?style=for-the-badge&logo=substack&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://github.com/sorrycc/awesome-javascript"><img alt="Included in Awesome JavaScript" src="https://img.shields.io/badge/awesome-Awesome%20JavaScript-f7df1e?style=for-the-badge&logo=javascript&logoColor=black"></a>
  <a href="https://github.com/dzharii/awesome-typescript"><img alt="Included in Awesome TypeScript" src="https://img.shields.io/badge/awesome-Awesome%20TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white"></a>
</p>

## Why It Exists

Your file upload endpoint is part of your attack surface.

Most upload handlers still trust filenames, extensions, or client-provided MIME types. That leaves room for renamed files, archive bombs, polyglots, active PDFs, and other risky payloads to land in storage before your app notices.

Without Pompelmi:

`upload -> trust filename/MIME -> store -> parse or serve later`

With Pompelmi:

`upload -> inspect bytes + structure -> allow | quarantine | reject -> store/process`

Why teams choose it:

- In-process and local-first. No cloud API, no daemon, no data egress.
- Built for the stuff attackers actually abuse: spoofed MIME, nested archives, ZIP bombs, traversal, polyglots, macro hints, and active documents.
- Typed and composable APIs with `scanBytes`, `scanFile`, policy packs, hooks, and optional YARA.
- Drop-in packages for Express, Next.js, Koa, NestJS, Fastify, CLI workflows, and React UI.

## Why People Star It

- It solves a real pain point fast: secure uploads are usually more dangerous and more annoying than they look.
- It is easy to adopt: `npm install`, add a policy, block risky files before storage.
- It stays privacy-first: no cloud dependency, no file egress, no extra scanning service to operate.
- It feels production-minded: structured verdicts, clear reasons, adapters, examples, docs, and active release history.

## Demo

<p align="center">
  <img src="https://raw.githubusercontent.com/pompelmi/pompelmi/main/assets/malware-detection-node-demo.gif" alt="Pompelmi demo showing a risky upload being blocked" width="920">
</p>

## Quick Start

```bash
npm install pompelmi
```

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
    reasons: report.reasons,
  });
}
```

Start here next:

- [Getting started](https://pompelmi.github.io/pompelmi/getting-started/)
- [Express guide](https://pompelmi.github.io/pompelmi/how-to/express/)
- [Examples](./examples)
- [Threat model and architecture](https://pompelmi.github.io/pompelmi/explaination/architecture/)

## What It Checks

- Extension, size, and declared MIME policy checks.
- Magic-byte validation for renamed or disguised files.
- Archive protections for ZIP bombs, traversal, and nesting depth.
- Heuristics for risky structures such as executables, polyglots, script-bearing documents, and macro hints.
- Optional YARA matching when you need signature-based rules.

## Frameworks

| Use case | Package or guide |
| --- | --- |
| Core library | `pompelmi` |
| Express | `@pompelmi/express-middleware` |
| Next.js | `@pompelmi/next-upload` |
| Koa | `@pompelmi/koa-middleware` |
| NestJS | `@pompelmi/nestjs-integration` |
| Fastify | `@pompelmi/fastify-plugin` |
| React UI | `@pompelmi/ui-react` |
| CLI | `@pompelmi/cli` |

## Why Not Just MIME Checks, Cloud AV, or ClamAV?

| Approach | Where it helps | Where it falls short |
| --- | --- | --- |
| File extensions or MIME checks only | Cheap allowlists and quick policy enforcement | Renamed files and client-provided MIME values are easy to fake. |
| DIY upload validation | Full control over your own rules | Easy to miss archive handling, polyglots, structured verdicts, and consistent fail-closed behavior. |
| Cloud scanning APIs | Outsourced detection and managed infrastructure | Adds data egress, network latency, and a hard dependency on an external service. |
| ClamAV or daemon-based setups | Familiar signature scanning and existing operations model | Adds process overhead and still benefits from an application-layer upload gate before storage. |

Pompelmi focuses on the upload gate itself. It can complement YARA or ClamAV. It is not presented as a full antivirus replacement.

## Star History

If you want to follow the project as it grows, star the repo and keep an eye on releases.

<p align="center">
  <a href="https://star-history.com/#pompelmi/pompelmi&Date">
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=pompelmi/pompelmi&type=Date">
  </a>
</p>

## Community

- [Contributing guide](./CONTRIBUTING.md)
- [Roadmap](./ROADMAP.md)
- [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions)
- [GitHub Issues](https://github.com/pompelmi/pompelmi/issues)
- [Changelog](./CHANGELOG.md)
- [Security policy](./SECURITY.md)

Questions, docs fixes, examples, tests, and real-world integration feedback are all useful here.

## License

MIT. See [LICENSE](./LICENSE). Also: [Docs](https://pompelmi.github.io/pompelmi/), [GitHub](https://github.com/pompelmi/pompelmi), [npm](https://www.npmjs.com/package/pompelmi).
