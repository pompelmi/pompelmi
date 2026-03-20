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
</div>

Pompelmi inspects untrusted files before storage and helps you decide whether to allow, reject, or quarantine them before they reach downstream systems.

It is built for upload endpoints that cannot rely on filenames, extensions, or client-provided MIME types alone.

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

## License

[MIT](./LICENSE)
