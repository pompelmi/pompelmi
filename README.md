<p align="center">
  <a href="https://github.com/pompelmi/pompelmi" target="_blank" rel="noopener noreferrer">
    <img
      src="https://raw.githubusercontent.com/pompelmi/pompelmi/refs/heads/main/assets/logo.svg"
      alt="pompelmi"
      width="360"
      height="280"
    />
  </a>
</p>

<h1 align="center">pompelmi</h1>

<p align="center">
  Lightweight file upload scanner with optional <strong>YARA</strong> rules.<br/>
  Works out‑of‑the‑box on <strong>Node.js</strong>; supports <strong>browser</strong> via a simple HTTP “remote engine”.
</p>

<!--
<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img alt="Koa" src="https://img.shields.io/badge/Koa-33333D?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="Fastify (planned)" src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" />
  <img alt="NestJS (planned)" src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img alt="Remix (planned)" src="https://img.shields.io/badge/Remix-000000?style=for-the-badge&logo=remix&logoColor=white" />
  <img alt="SvelteKit (planned)" src="https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" />
</p>

<p align="center">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-222222?style=for-the-badge&logo=pnpm&logoColor=white" />
  <img alt="npm" src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" />
  <img alt="ESLint" src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" />
  <img alt="Prettier" src="https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=white" />
</p>


-->

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi">
    <img alt="npm" src="https://img.shields.io/npm/v/pompelmi?label=pompelmi">
  </a>
  <a href="https://www.npmjs.com/package/pompelmi">
    <img alt="downloads" src="https://img.shields.io/npm/d18m/pompelmi?label=downloads">
  </a>
  <a href="https://github.com/pompelmi/pompelmi/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/npm/l/pompelmi">
  </a>
  <img alt="node" src="https://img.shields.io/node/v/pompelmi">
  <img alt="types" src="https://img.shields.io/badge/types-TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="status" src="https://img.shields.io/badge/channel-alpha-orange">
</p>

## Installation

```bash
# core library
npm i pompelmi

# typical dev deps used in examples (optional)
npm i -D tsx express multer cors
```

<p align="center">
  <a href="#why-pompelmi">Why</a> •
  <a href="#installation">Installation</a> •
  <a href="#technologies--tools">Technologies & Tools</a> •
  <a href="#features">Features</a> •
  <a href="#packages">Packages</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#framework-adapters">Framework Adapters</a> •
  <a href="#architecture--uml">Architecture & UML</a> •
  <a href="#api-overview">API</a> •
  <a href="#security--disclaimer">Security</a> •
  <a href="#license">License</a>
</p>

---

## Technologies & Tools

| Technology | Badge | Link | Description |
| --- | --- | --- | --- |
| Node.js | <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" /> | [nodejs.org](https://nodejs.org/) | Runtime used by all adapters and the core engine. |
| TypeScript | <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" /> | [typescriptlang.org](https://www.typescriptlang.org/) | Typed development and bundled type definitions. |
| Express | <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" /> | [expressjs.com](https://expressjs.com/) | Middleware adapter `@pompelmi/express-middleware`. |
| Koa | <img alt="Koa" src="https://img.shields.io/badge/Koa-33333D?style=for-the-badge&logo=nodedotjs&logoColor=white" /> | [koajs.com](https://koajs.com/) | Middleware adapter `@pompelmi/koa-middleware`. |
| Next.js | <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" /> | [nextjs.org](https://nextjs.org/) | App Router upload handler `@pompelmi/next-upload`. |
| Fastify *(planned)* | <img alt="Fastify" src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" /> | [fastify.dev](https://fastify.dev/) | Planned plugin with identical policies and ZIP handling. |
| NestJS *(planned)* | <img alt="NestJS" src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" /> | [nestjs.com](https://nestjs.com/) | Planned interceptor/guard for file uploads. |
| Remix *(planned)* | <img alt="Remix" src="https://img.shields.io/badge/Remix-000000?style=for-the-badge&logo=remix&logoColor=white" /> | [remix.run](https://remix.run/) | Planned helpers to scan `FormData` in actions/loaders. |
| SvelteKit *(planned)* | <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" /> | [kit.svelte.dev](https://kit.svelte.dev/) | Planned utilities for `+server.ts` and actions. |
| pnpm | <img alt="pnpm" src="https://img.shields.io/badge/pnpm-222222?style=for-the-badge&logo=pnpm&logoColor=white" /> | [pnpm.io](https://pnpm.io/) | Monorepo/workspace package manager. |
| npm | <img alt="npm" src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" /> | [npmjs.com](https://www.npmjs.com/) | Registry and install scripts. |
| Vitest | <img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" /> | [vitest.dev](https://vitest.dev/) | Test runner for future E2E and unit tests. |
| ESLint | <img alt="ESLint" src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" /> | [eslint.org](https://eslint.org/) | Linting. |
| Prettier | <img alt="Prettier" src="https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=white" /> | [prettier.io](https://prettier.io/) | Code formatting. |
| YARA | <img alt="YARA" src="https://img.shields.io/badge/YARA-2F855A?style=for-the-badge" /> | [virustotal.github.io/yara](https://virustotal.github.io/yara/) | Optional rule engine for advanced detections. |
| file-type | <img alt="file-type" src="https://img.shields.io/badge/file--type-24292E?style=for-the-badge" /> | [sindresorhus/file-type](https://github.com/sindresorhus/file-type) | MIME sniffing (magic bytes) on buffers. |
| unzipper | <img alt="unzipper" src="https://img.shields.io/badge/unzipper-24292E?style=for-the-badge" /> | [ZJONSSON/node-unzipper](https://github.com/ZJONSSON/node-unzipper) | ZIP processing with anti‑bomb limits and nested scan. |
| Multer | <img alt="Multer" src="https://img.shields.io/badge/Multer-000000?style=for-the-badge" /> | [expressjs/multer](https://github.com/expressjs/multer) | In‑memory file buffers for Express/Koa demos. |

---

## Why pompelmi?

- **Stop risky uploads**: quickly tells you if a file looks **clean**, **suspicious**, or **malicious**—and blocks it when needed.
- **Easy to adopt**: drop‑in middlewares/handlers for popular frameworks (Express, Koa, Next.js, more coming).
- **YARA when you need it**: plug your YARA rules for advanced detections, or start with a simple matcher.
- **Real file checks**: extension whitelist, **MIME sniffing with fallback**, file size caps, and ZIP inspection with anti‑bomb limits.
- **Local & private**: scans run in your app process. No cloud calls required.
- **Typed and tiny**: TypeScript types included, ESM & CJS builds.

---

## Features

- **Node-first scanning** with optional **YARA** engine (native binaries are auto‑pulled by platform packages; no brew/apt for consumers).
- **ZIP aware**: inspects archive contents with limits on entries, per‑entry size, total uncompressed size, and nesting depth.
- **Policy filters**:
  - allowed extensions
  - allowed MIME types (with extension fallback)
  - max file size per upload
- **Clear responses**:
  - success (200) with scan results
  - 4xx for policy violations (415/413)
  - 422 when verdict is suspicious/malicious
  - 503 on fail‑closed errors
- **Observability**: structured `onScanEvent` callbacks (start/end/blocked/errors/archive_*).
- **Browser support** via a **Remote Engine** (HTTP endpoint) that compiles rules and runs scans for you.

---

## Packages

This is a monorepo. The following packages are included:

| Package | NPM | Description |
| --- | --- | --- |
| **`pompelmi`** | <a href="https://www.npmjs.com/package/pompelmi"><img src="https://img.shields.io/npm/v/pompelmi?label=pompelmi" alt="npm"/></a> | Core scanning library (Node + Remote Engine for browsers). |
| **`@pompelmi/express-middleware`** | *(alpha)* | Express middleware that scans uploads and enforces policies. |
| **`@pompelmi/koa-middleware`** | *(alpha)* | Koa middleware compatible with `@koa/multer`/`koa-body`. |
| **`@pompelmi/next-upload`** | *(alpha)* | Next.js (App Router) `POST` handler factory for `/api/upload`. |
| **(Planned)** `@pompelmi/fastify-plugin` | — | Fastify plugin with the same policies and ZIP support. |
| **(Planned)** `@pompelmi/nestjs` | — | NestJS Guard/Interceptor module for uploads. |
| **(Planned)** `@pompelmi/remix` | — | Remix helpers to scan `FormData` in actions/loaders. |
| **(Planned)** `@pompelmi/hapi-plugin` | — | Hapi plugin with `onPreHandler`. |
| **(Planned)** `@pompelmi/sveltekit` | — | SvelteKit utilities for `+server.ts` and actions. |

> Status: **alpha** — expect minor API refinements before a stable `0.2.0`.

---

## Quickstart

### Express (middleware)

```ts
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Simple demo scanner (replace with YARA rules in production)
const SimpleEicarScanner = {
  async scan(bytes: Uint8Array) {
    const text = Buffer.from(bytes).toString('utf8');
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) return [{ rule: 'eicar_test' }];
    return [];
  }
};

app.post(
  '/upload',
  upload.any(),
  createUploadGuard({
    scanner: SimpleEicarScanner,
    includeExtensions: ['txt','png','jpg','jpeg','pdf','zip'],
    allowedMimeTypes: ['text/plain','image/png','image/jpeg','application/pdf','application/zip'],
    maxFileSizeBytes: 20 * 1024 * 1024,
    timeoutMs: 5000,
    concurrency: 4,
    failClosed: true,
    onScanEvent: (ev) => console.log('[scan]', ev)
  }),
  (req, res) => {
    res.json({ ok: true, scan: (req as any).pompelmi ?? null });
  }
);

app.listen(3000, () => console.log('demo on http://localhost:3000'));
```

### Koa (middleware)

```ts
import Koa from 'koa';
import Router from '@koa/router';
import multer from '@koa/multer';
import { createKoaUploadGuard } from '@pompelmi/koa-middleware';

const app = new Koa();
const router = new Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const SimpleEicarScanner = { /* same as above */ };

router.post(
  '/upload',
  upload.any(),
  createKoaUploadGuard({
    scanner: SimpleEicarScanner,
    includeExtensions: ['txt','png','jpg','jpeg','pdf','zip'],
    allowedMimeTypes: ['text/plain','image/png','image/jpeg','application/pdf','application/zip'],
    maxFileSizeBytes: 20 * 1024 * 1024,
    timeoutMs: 5000,
    concurrency: 4,
    failClosed: true,
    onScanEvent: (ev) => console.log('[scan]', ev)
  }),
  (ctx) => { ctx.body = { ok: true, scan: (ctx as any).pompelmi ?? null }; }
);

app.use(router.routes()).use(router.allowedMethods());
app.listen(3003, () => console.log('demo on http://localhost:3003'));
```

### Next.js (App Router)

```ts
// app/api/upload/route.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';

export const runtime = 'nodejs';          // Next: Node runtime (not Edge)
export const dynamic = 'force-dynamic';   // optional: avoid route cache

const SimpleEicarScanner = { /* same as above */ };

export const POST = createNextUploadHandler({
  scanner: SimpleEicarScanner,
  includeExtensions: ['txt','png','jpg','jpeg','pdf','zip'],
  allowedMimeTypes: ['text/plain','image/png','image/jpeg','application/pdf','application/zip'],
  maxFileSizeBytes: 20 * 1024 * 1024,
  timeoutMs: 5000,
  concurrency: 4,
  failClosed: true,
  onScanEvent: (ev) => console.log('[scan]', ev)
});
```

---

## Framework Adapters

The adapters share the same behavior and defaults:

- **Extension whitelist**
- **MIME sniffing with extension fallback**
- **Max file size**
- **ZIP scanning** (entry count / per‑entry size / total uncompressed / depth)
- **Timeout & concurrency** controls
- **Fail‑closed** and **report‑only** modes
- **Structured events** via `onScanEvent`

**HTTP status codes**

- `200` — accepted, includes `{ scan: { results: [...] } }`
- `415` — `extension_not_allowed`, `mime_mismatch`, or `mime_not_allowed`
- `413` — `file_too_large`
- `422` — `blocked` with `verdict: suspicious|malicious`
- `503` — `scanner_init_error` / `scan_error` (when `failClosed: true`)

---

## Architecture & UML

> **Note:** Diagrams are embedded as images via mermaid.ink so they render on GitHub, npm, and other Markdown viewers. The Mermaid source is included below each image.
> **Tip:** To avoid parser issues across renderers, labels use quotes inside node shapes (e.g., `A["text"]`, `C{"text"}`) when they include parentheses, slashes, or other symbols.


### Upload scanning flow
<p align="center">
  <img alt="Upload scanning flow diagram" src="https://mermaid.ink/svg/eyJjb2RlIjogImZsb3djaGFydCBURFxuICBBW1wiQ2xpZW50IHVwbG9hZHMgZmlsZShzKVwiXSAtLT4gQltcIldlYiBBcHAgUm91dGVcIl1cbiAgQiAtLT4gQ3tcIlByZS1maWx0ZXJzPGJyPihleHQsIHNpemUsIE1JTUUpXCJ9XG4gIEMgLS0gZmFpbCAtLT4gWFtcIkhUVFAgNHh4XCJdXG4gIEMgLS0gcGFzcyAtLT4gRHtcIklzIFpJUD9cIn1cbiAgRCAtLSB5ZXMgLS0+IEVbXCJJdGVyYXRlIGVudHJpZXM8YnI+KGxpbWl0cyAmIHNjYW4pXCJdXG4gIEUgLS0+IEZ7XCJWZXJkaWN0P1wifVxuICBEIC0tIG5vIC0tPiBGe1wiU2NhbiBieXRlc1wifVxuICBGIC0tIG1hbGljaW91cy9zdXNwaWNpb3VzIC0tPiBZW1wiSFRUUCA0MjIgYmxvY2tlZFwiXVxuICBGIC0tIGNsZWFuIC0tPiBaW1wiSFRUUCAyMDAgb2sgKyByZXN1bHRzXCJdIiwgIm1lcm1haWQiOiB7InRoZW1lIjogImRlZmF1bHQifX0=?bgColor=white" />
</p>

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
<p align="center">
  <img alt="App ↔ pompelmi ↔ YARA sequence diagram" src="https://mermaid.ink/img/eyJjb2RlIjogInNlcXVlbmNlRGlhZ3JhbVxuICBwYXJ0aWNpcGFudCBVIGFzIFVzZXJcbiAgcGFydGljaXBhbnQgQSBhcyBBcHAgUm91dGUgKC91cGxvYWQpXG4gIHBhcnRpY2lwYW50IFAgYXMgcG9tcGVsbWkgKGFkYXB0ZXIpXG4gIHBhcnRpY2lwYW50IFkgYXMgWUFSQSBlbmdpbmVcblxuICBVLT4+QTogUE9TVCBtdWx0aXBhcnQvZm9ybS1kYXRhXG4gIEEtPj5QOiBndWFyZChmaWxlcywgcG9saWNpZXMpXG4gIFAtPj5QOiBNSU1FIHNuaWZmICsgc2l6ZSArIGV4dCBjaGVja3NcbiAgYWx0IFpJUCBhcmNoaXZlXG4gICAgUC0+PlA6IHVucGFjayBlbnRyaWVzIHdpdGggbGltaXRzXG4gIGVuZFxuICBQLT4+WTogc2NhbihieXRlcylcbiAgWS0tPj5QOiBtYXRjaGVzW11cbiAgUC0tPj5BOiB2ZXJkaWN0IChjbGVhbi9zdXNwaWNpb3VzL21hbGljaW91cylcbiAgQS0tPj5VOiAyMDAgb3IgNHh4LzQyMiB3aXRoIHJlYXNvbiIsICJtZXJtYWlkIjogeyJ0aGVtZSI6ICJkZWZhdWx0In19?bgColor=white" />
</p>

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
<p align="center">
  <img alt="Monorepo components diagram" width="1100" src="https://mermaid.ink/img/eyJjb2RlIjogImZsb3djaGFydCBMUlxuICBzdWJncmFwaCBSZXBvXG4gICAgY29yZVtcInBvbXBlbG1pIChjb3JlKVwiXVxuICAgIGV4cHJlc3NbXCJAcG9tcGVsbWkvZXhwcmVzcy1taWRkbGV3YXJlXCJdXG4gICAga29hW1wiQHBvbXBlbG1pL2tvYS1taWRkbGV3YXJlXCJdXG4gICAgbmV4dFtcIkBwb21wZWxtaS9uZXh0LXVwbG9hZFwiXVxuICAgIGZhc3RpZnkoKFwiZmFzdGlmeS1wbHVnaW4gwrcgcGxhbm5lZFwiKSlcbiAgICBuZXN0KChcIm5lc3RqcyDCtyBwbGFubmVkXCIpKVxuICAgIHJlbWl4KChcInJlbWl4IMK3IHBsYW5uZWRcIikpXG4gICAgaGFwaSgoXCJoYXBpLXBsdWdpbiDCtyBwbGFubmVkXCIpKVxuICAgIHN2ZWx0ZSgoXCJzdmVsdGVraXQgwrcgcGxhbm5lZFwiKSlcbiAgZW5kXG4gIGNvcmUgLS0+IGV4cHJlc3NcbiAgY29yZSAtLT4ga29hXG4gIGNvcmUgLS0+IG5leHRcbiAgY29yZSAtLi0+IGZhc3RpZnlcbiAgY29yZSAtLi0+IG5lc3RcbiAgY29yZSAtLi0+IHJlbWl4XG4gIGNvcmUgLS4tPiBoYXBpXG4gIGNvcmUgLS4tPiBzdmVsdGUiLCAibWVybWFpZCI6IHsidGhlbWUiOiAiZGVmYXVsdCJ9fQ==?bgColor=white&width=1400&scale=2" />
</p>

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

## API Overview

### Core (Node)

```ts
import { scanDir } from 'pompelmi';
import { resolve } from 'node:path';

const opts = {
  enableYara: true,
  yaraRulesPath: resolve(process.cwd(), 'rules/demo.yar'),
  includeExtensions: ['.txt', '.bin'],
  maxFileSizeBytes: 10 * 1024 * 1024,
  yaraAsync: true,
};

for await (const entry of scanDir('./some-folder', opts)) {
  console.log(entry.path, entry.yara?.verdict);
}
```

**NodeScanOptions**

```ts
type NodeScanOptions = {
  enableYara?: boolean;
  yaraRules?: string;
  yaraRulesPath?: string;
  includeExtensions?: string[];
  maxFileSizeBytes?: number;
  yaraAsync?: boolean;
  yaraPreferBuffer?: boolean;
  yaraSampleBytes?: number;
};
```

### Browser (Remote Engine)

```ts
import { createRemoteEngine } from 'pompelmi';

const RULES = `
rule demo_contains_virus_literal {
  strings: $a = "virus" ascii nocase
  condition: $a
}`;

async function scanFileInBrowser(file: File) {
  const engine = await createRemoteEngine({
    endpoint: 'http://localhost:8787/api/yara/scan',
    mode: 'json-base64',
    rulesAsBase64: true,
  });
  const compiled = await engine.compile(RULES);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const matches = await compiled.scan(bytes);
  console.log('REMOTE MATCHES:', matches);
}
```

---

## Security & Disclaimer

- The library **reads** bytes; it does not execute files.
- YARA detections depend on the **rules you supply**. Expect false positives/negatives.
- Always run scanning in a controlled environment with appropriate security controls.
- ZIP scanning enforces limits (entries, per‑entry size, total uncompressed, nesting) to reduce archive‑bomb risk.

---

## Contributing

PRs and issues are welcome!

- Run build & smoke tests:
  ```bash
  npm run build
  npm run yara:int:smoke
  ```
- Keep commits focused and well described.
- For new features, please add or adjust tests.

---

## Versioning

Channel: **`0.3.5`**  
Expect minor API changes before a stable `0.3.5`.

Suggested publish:
```bash
npm version 0.3.5
npm publish --tag next
```

---

## License

[MIT](./LICENSE) © 2025‑present pompelmi contributors