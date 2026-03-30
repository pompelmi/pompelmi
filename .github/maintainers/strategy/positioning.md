# Positioning

## Core message

Pompelmi helps Node.js teams secure file uploads before storage. It is an open-source, local-first upload gate that inspects bytes, MIME claims, archives, and risky structures in-process.

## The problem it speaks to

Most upload flows still trust filenames, extensions, or client-provided MIME types. That leaves a gap between "the app accepted a file" and "the app understands what it actually received."

## What should stay consistent

- Open-source first.
- Technical and security-aware.
- Focused on upload security, not generic malware marketing.
- Clear about scope: upload gate and risk-reduction layer, not a full endpoint-protection claim.
- Strong emphasis on local-first deployment and no required data egress.

## Audiences

- Backend and platform engineers protecting upload endpoints.
- Security-minded teams that cannot send files to third-party APIs.
- Self-hosted or privacy-sensitive environments.
- Teams that want a typed library and framework adapters instead of a daemon-first setup.

## Main differentiators

- In-process scanning path with no required cloud API.
- Practical upload-focused protections: magic-byte checks, archive controls, heuristics, optional YARA.
- Framework adapters plus a core package for direct integration.
- Public docs, tests, examples, and security policy in the repo.

## Positioning guardrails

Do say:

- "Secure file uploads for Node.js."
- "Scan untrusted files before storage."
- "Local-first, in-process upload security."
- "Upload gate" and "defense-in-depth."

Do not say:

- "Complete antivirus replacement."
- "Compliance certified" unless a specific certification exists.
- "Used by X companies" unless publicly verifiable.
- "Fastest" or "best" unless benchmarked and documented.

## 10-second repo test

A first-time visitor should understand, quickly:

1. This is for secure file uploads in Node.js.
2. It runs before storage or downstream processing.
3. It is local-first and does not require a cloud API or daemon.
4. It works with common Node.js frameworks.
5. The repo is active, serious, and easy to evaluate.
