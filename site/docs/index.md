---
title: Introduction
outline: deep
---

# Pompelmi — Introduction

**Pompelmi** is a file‑upload security toolkit for Node.js. It focuses on **malware scanning** and **policy enforcement** before your app ever stores or processes a file.

## Key features

- **[ZIP deep‑inspection](/docs/zip-inspection)**: safe archive opening with bomb/traversal guards (configurable).
- **[Policy guards](/docs/policy)**: extension allowlist, size caps, and basic MIME sniffing (magic bytes).
- **DX‑first**: TypeScript types, ESM/CJS builds, framework adapters.
- **Pluggable**: optional **YARA** integration for signature‑based detection *(coming soon)*.

## Install

```bash
pnpm add @pompelmi/engine @pompelmi/express-middleware
# or: npm i @pompelmi/engine @pompelmi/express-middleware
# or: yarn add @pompelmi/engine @pompelmi/express-middleware
```

> **Note**  
> Server‑side scanning runs in Node (on your server / API route). The `/demo` on this site is **client‑side** and only simulates policy checks for illustration.

## How these docs are organized

- **Quickstart (Express)** — a minimal, end‑to‑end route example: [/docs/quickstart-express](/docs/quickstart-express)
- **Policy** — build safe allowlists, caps, and MIME sniffing: [/docs/policy](/docs/policy)
- **Scanning** — scanners you can compose:
  - [/docs/scan/executable-detector](/docs/scan/executable-detector)
  - [/docs/scan/pdf-actions](/docs/scan/pdf-actions)
  - [/docs/scan/svg-active-content](/docs/scan/svg-active-content)
  - [/docs/scan/polyglot-magic](/docs/scan/polyglot-magic)
  - Compose multiple: [/docs/compose-scanners](/docs/compose-scanners)
- **ZIP deep‑inspection** — safely handle archives: [/docs/zip-inspection](/docs/zip-inspection)
- **Adapters** for Koa / Fastify / Next.js *(coming soon)*
- **YARA** — optional signature rules *(coming soon)*

## Production checklist (short)

- Only allow **known‑good** extensions (deny‑by‑default).
- Enforce **size caps** per file and per request.
- Reject empty/unknown **MIME** unless purposely allowed.
- **Scan archives** before extraction and limit depth/entries/ratio.
- Never trust **client MIME**; verify using magic bytes server‑side.
- Log and return **clear errors** without leaking internals.
