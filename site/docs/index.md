---
title: Introduction
outline: deep
---

# Pompelmi — Introduction

**Pompelmi** is a file-upload security toolkit for Node.js. It focuses on **malware scanning** and **policy enforcement** before your app ever stores or processes a file.

## Key features

- **ZIP deep‑inspection**: safe archive opening with bomb/traversal guards (configurable).
- **Policy guards**: extension allowlist, max size caps, and basic MIME sniffing (magic bytes).
- **DX‑first**: TypeScript types, ESM/CJS builds, framework adapters.
- **Pluggable**: optional **YARA** integration for signature‑based detection (advanced).

## Install

```bash
pnpm add pompelmi
# or: npm i pompelmi
# or: yarn add pompelmi
```

> **Note**  
> Server‑side scanning runs in Node (on your server / API route). The `/demo` on this site is **client‑side** and only simulates policy checks for illustration.

## How these docs are organized

- **Quickstart (Express)** — a minimal, end‑to‑end route example: [/docs/quickstart-express](/docs/quickstart-express)
- **Policy** — how to build safe allowlists, size caps, MIME sniff and error handling: [/docs/policy](/docs/policy)
- **ZIP deep‑inspection** — safely handle archives *(coming soon)*
- **YARA** — optional signature rules *(coming soon)*
- **Adapters** for Koa / Fastify / Next.js *(coming soon)*

## Production checklist (short)

- Only allow **known‑good** extensions (deny‑by‑default).
- Enforce **size caps** per file and per request.
- Reject empty/unknown **MIME** unless purposely allowed.
- **Scan archives** before extraction and limit depth/entries/ratio.
- Never trust **client MIME**; verify using magic bytes server‑side.
- Log and return **clear errors** without leaking internals.
