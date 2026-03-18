![Pompelmi banner](./assets/readme-banner.png)

# Pompelmi

[![npm version](https://img.shields.io/npm/v/pompelmi?label=version&logo=npm)](https://www.npmjs.com/package/pompelmi)
[![CI](https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci.yml?branch=main&label=CI&logo=github)](https://github.com/pompelmi/pompelmi/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/pompelmi/pompelmi)](https://github.com/pompelmi/pompelmi/blob/main/LICENSE)

In-process file upload security for Node.js applications.

Pompelmi helps teams block risky uploads before they are written to storage or passed downstream. It runs inside your app process, with no cloud API and no daemon requirement.

Need more than the MIT core? [`@pompelmi/enterprise`](https://pompelmi.github.io/pompelmi/enterprise/) is the licensed add-on with advanced audit logging, premium YARA rules, Prometheus metrics, an embedded dashboard, and priority enterprise support.

## Why Pompelmi

Most upload handlers stop at extension checks or client-provided MIME types. That leaves gaps for spoofed files, archive bombs, polyglots, and script-bearing documents.

Pompelmi gives you a layered upload gate that is:

- In-process: no file bytes leave your infrastructure as part of scanning.
- TypeScript-first: composable scanners and typed reports.
- Operationally simple: install from npm and integrate in route handlers.
- Framework-ready: adapters for Express, Next.js, NestJS, Koa, and Fastify.

## Who It Is For

Pompelmi is designed for engineering teams that accept user uploads and need predictable controls around untrusted files, especially when privacy or data residency matter.

Typical use cases:

- Public upload endpoints where attackers control file content.
- Internal document workflows that require stricter upload hygiene.
- Privacy-sensitive deployments where cloud scanning is not acceptable.
- Teams that want a practical control layer before storage, indexing, or processing.
- Platform and enterprise teams standardizing upload controls across services.

## Core Security Capabilities

- Extension allowlists and MIME policy checks.
- Magic-byte format detection to catch renamed/disguised files.
- Heuristic scanning for common risky structures.
- ZIP risk controls: entry count, size limits, traversal and nesting constraints.
- Optional YARA-based matching using your own rules.
- Composable scanner pipeline with per-scanner timeout and stop conditions.
- Structured scan output with verdict, reasons, and rule matches.

## Quick Start

Install:

```bash
npm install pompelmi
```

Scan bytes:

```ts
import { scanBytes, STRICT_PUBLIC_UPLOAD } from 'pompelmi';

const result = await scanBytes(fileBuffer, {
  policy: STRICT_PUBLIC_UPLOAD,
  filename: 'upload.pdf',
  mimeType: 'application/pdf',
  failClosed: true,
});

if (result.verdict !== 'clean') {
  throw new Error(`Upload blocked: ${result.verdict}`);
}
```

Next steps:

- [Docs quick start](https://pompelmi.github.io/pompelmi/getting-started/)
- [Framework guides](https://pompelmi.github.io/pompelmi/how-to/express/)
- [Production readiness](https://pompelmi.github.io/pompelmi/production-readiness/)

## Framework Support

| Framework | Package |
| --- | --- |
| Express | `@pompelmi/express-middleware` |
| Next.js | `@pompelmi/next-upload` |
| NestJS | `@pompelmi/nestjs-integration` |
| Koa | `@pompelmi/koa-middleware` |
| Fastify | `@pompelmi/fastify-plugin` |
| Nuxt/Nitro | guide in docs |

## Open Source and Enterprise

### Open Source Core (MIT)

Included in this repository and npm packages:

- Core scanner APIs and policy packs.
- Framework adapters and examples.
- Quarantine workflow primitives.
- Audit trail utilities and scan hooks.
- Public documentation, issues, and discussions.

### `@pompelmi/enterprise`

`@pompelmi/enterprise` is the licensed add-on for teams that need more than the public core.

It extends Pompelmi with:

- Advanced audit logging with tamper-evident entries and multiple sinks.
- Premium YARA rules for higher-signal threat detection.
- Prometheus metrics for operational visibility.
- An embedded dashboard for local monitoring and review.
- Priority enterprise support for rollout and production blockers.

Enterprise path:

- Install: `npm install @pompelmi/enterprise`
- License: [Buy Enterprise License](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn)
- Details: [Pompelmi Enterprise](https://pompelmi.github.io/pompelmi/enterprise/)

Enterprise inquiries: [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com)

## Trust And Production Readiness

Security-sensitive teams usually evaluate boundaries before adoption. Start here:

- [Threat model and architecture](https://pompelmi.github.io/pompelmi/explaination/architecture/)
- [Production readiness notes](https://pompelmi.github.io/pompelmi/production-readiness/)
- Security disclosure policy: ./SECURITY.md
- Changelog and releases: ./CHANGELOG.md
- Tests: ./tests

## Documentation Links

- [Docs home](https://pompelmi.github.io/pompelmi/)
- [Getting started](https://pompelmi.github.io/pompelmi/getting-started/)
- [Support options](https://pompelmi.github.io/pompelmi/support/)
- [Pompelmi Enterprise](https://pompelmi.github.io/pompelmi/enterprise/)
- [Examples directory](./examples)

## FAQ

### Does Pompelmi send files to a cloud API?

No. Scanning runs in-process by default.

### Does it require ClamAV or another daemon?

No. Built-in heuristics work without a daemon. ClamAV and YARA integrations are optional.

### Is this a complete antivirus replacement?

No. Pompelmi is an upload gate and risk-reduction layer. It should be part of a broader defense-in-depth design.

### Can it help in regulated environments?

It can support internal control objectives by reducing upload risk and producing structured scan outcomes. It does not provide legal or compliance certification by itself.

### How do we start an evaluation?

1. Integrate one endpoint with a strict policy pack.
2. Log verdicts and reasons for real traffic.
3. Add quarantine flow for suspicious files.
4. Tighten policy based on observed false positives and business requirements.

## License And Contact

MIT License: ./LICENSE

- [GitHub](https://github.com/pompelmi/pompelmi)
- [npm](https://www.npmjs.com/package/pompelmi)
- [Enterprise inquiries](mailto:pompelmideveloper@yahoo.com)
