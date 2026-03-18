![Pompelmi banner](./assets/readme-banner.png)

# Pompelmi

[![GitHub stars](https://img.shields.io/github/stars/pompelmi/pompelmi?style=flat-square&logo=github)](https://github.com/pompelmi/pompelmi/stargazers)
[![npm version](https://img.shields.io/npm/v/pompelmi?label=version&logo=npm)](https://www.npmjs.com/package/pompelmi)
[![CI](https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci.yml?branch=main&label=CI&logo=github)](https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml)

Secure file uploads for Node.js.

Pompelmi is the open-source upload gate for Node.js. It scans untrusted files before storage or downstream processing with in-process, local-first checks for spoofed files, archive bombs, polyglots, and risky document structures. No cloud API. No daemon.

If this project helps you harden upload flows, a GitHub star helps more Node.js teams find it.

## Why it exists

Most upload handlers still trust filenames, extensions, or client-provided MIME types. That is usually not enough for public uploads, customer document portals, or any route that later parses, indexes, transforms, or serves the file.

Typical flow:

`upload -> trust filename/MIME -> store -> parse or serve later`

With Pompelmi:

`upload -> inspect bytes + structure -> allow | quarantine | reject -> store/process`

## Quick start

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

## What it checks

- Extension, size, and declared MIME policy checks.
- Magic-byte validation for renamed or disguised files.
- Archive protections for ZIP bombs, traversal, and nesting depth.
- Heuristics for risky structures such as executables, polyglots, and script-bearing documents.
- Optional YARA matching when you need signature-based rules.

## Who it is for

- Teams handling untrusted uploads in Node.js services.
- Products that cannot send uploaded files to third-party scanning APIs.
- Engineers who want a typed upload-security layer instead of ad hoc validation code.

## Why not just MIME checks, cloud AV, or ClamAV?

| Approach | Where it helps | Where it falls short |
| --- | --- | --- |
| File extensions or MIME checks only | Cheap allowlists and basic policy enforcement | Client-provided MIME values and renamed files are easy to fake. |
| DIY upload validation | Full control over your own rules | Easy to miss archive handling, polyglots, structured verdicts, and consistent fail-closed behavior. |
| Cloud scanning APIs | Outsourced detection and managed infrastructure | Adds data egress, network latency, and a hard dependency on an external service. |
| ClamAV or other daemon-based setups | Familiar signature scanning and existing operations model | Adds process or daemon overhead and still benefits from an application-layer upload gate in front of storage. |

Pompelmi focuses on the upload gate itself. It can complement YARA or ClamAV. It is not presented as a full antivirus replacement.

## Framework support

| Framework | Package or guide |
| --- | --- |
| Express | `@pompelmi/express-middleware` |
| Next.js | `@pompelmi/next-upload` |
| NestJS | `@pompelmi/nestjs-integration` |
| Koa | `@pompelmi/koa-middleware` |
| Fastify | `@pompelmi/fastify-plugin` |
| Nuxt/Nitro | guide in docs |

## Evaluate and trust

- MIT-licensed core with typed APIs, framework adapters, and composable policy packs.
- Structured verdicts, reasons, and rule matches for logging, quarantine, and review flows.
- Public docs, examples, changelog, tests, and a security disclosure policy.
- Local-first scanning path with no required cloud dependency.
- Clear scope: defense-in-depth for file uploads, not a compliance certification or universal malware guarantee.

Recommended reading:

- [Production readiness](https://pompelmi.github.io/pompelmi/production-readiness/)
- [Threat model and architecture](https://pompelmi.github.io/pompelmi/explaination/architecture/)
- [Examples directory](./examples)
- [Security policy](./SECURITY.md)
- [Tests](./tests)

## Community

- [Contributing guide](./CONTRIBUTING.md)
- [Roadmap](./ROADMAP.md)
- [Good first issue ideas](./docs/good-first-issues.md)
- [Discussion prompts](./docs/community-prompts.md)
- [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions)
- [GitHub Issues](https://github.com/pompelmi/pompelmi/issues)

Questions, docs fixes, examples, tests, and real-world integration feedback are all useful here.

## Support

Start with docs, Issues, and Discussions whenever the question can be public. If you need private rollout help or a commercial relationship, see [Support options](https://pompelmi.github.io/pompelmi/support/) and [Enterprise support](https://pompelmi.github.io/pompelmi/enterprise/).

## FAQ

### Does Pompelmi send files to a cloud API?

No. Scanning runs in-process by default. File bytes do not need to leave your infrastructure.

### Does it require ClamAV, a sidecar, or another daemon?

No. Built-in heuristics and archive protections work without a daemon. ClamAV and YARA are optional integrations.

### What does it help block?

It adds a layered upload gate before storage or downstream processing. That helps catch spoofed files, archive bombs, polyglots, and common risky document structures.

### Is this a complete antivirus replacement?

No. Pompelmi is an upload security layer and risk-reduction control inside a broader defense-in-depth design.

## License

MIT. See [LICENSE](./LICENSE). Also: [Docs](https://pompelmi.github.io/pompelmi/), [GitHub](https://github.com/pompelmi/pompelmi), [npm](https://www.npmjs.com/package/pompelmi).
