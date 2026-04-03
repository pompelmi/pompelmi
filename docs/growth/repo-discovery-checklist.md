# Repository Discovery Checklist

This file captures the current recommended discovery metadata and sharing surfaces for `pompelmi/pompelmi`.

## GitHub "About" settings

Recommended homepage URL:

- `https://pompelmi.github.io/pompelmi/`

Recommended social preview image for the GitHub repository settings UI:

- `assets/social-preview-github.png`

Recommended description options:

1. `Inspect untrusted uploads before storage in Node.js. Open-source upload security with spoofing checks, archive controls, risky document/binary detection, and optional YARA.`
2. `Open-source upload security for Node.js. Inspect untrusted files before storage with route-level verdicts for spoofing, archive abuse, risky documents, and optional YARA.`
3. `Inspect-first, store-later upload security for Node.js. Detect spoofing, archive abuse, risky document/binary signals, and optional YARA before persistence.`

## Recommended GitHub topics

GitHub supports up to 20 topics. Recommended set:

- `nodejs`
- `typescript`
- `secure-file-upload`
- `file-upload-security`
- `upload-security`
- `upload-scanning`
- `file-validation`
- `mime-sniffing`
- `magic-bytes`
- `archive-security`
- `zip-bomb-protection`
- `yara`
- `malware-scanner`
- `document-security`
- `express`
- `nextjs`
- `nestjs`
- `fastify`
- `koa`
- `nuxt`

## README and link strategy

- Keep the root README focused on four first-screen questions: what it is, why it matters, where it fits, and how to try it fast.
- Keep one compact proof line near the top and move longer mention lists lower in the page.
- Link the top of the README to four destinations only: getting started, browser preview, Express demo, and examples index.
- Keep the first code sample route-level and visually short enough to understand at a glance.

## Homepage and social link usage

- Use the landing page URL for X, LinkedIn, newsletters, and other link previews because it carries the stronger Open Graph card.
- Use the GitHub repo URL for Hacker News comments, dev-to-dev replies, and places where readers primarily want source code first.
- Use the featured page when someone asks for public references or outside validation.
- Keep the GitHub homepage pointing to the landing page, not a deep docs page.

## Current proof and trust surfaces

- Root README: compact mention line near the top plus the generated featured section lower down.
- Landing page: proof strip in the hero and a dedicated featured section.
- Dedicated proof page: `/featured-in/`.
- Trust docs: `SECURITY.md`, `CONTRIBUTING.md`, and the public docs site.

## Social asset notes

- Source file: `assets/social-preview-source.svg`
- Website Open Graph output: `website/public/og.png`
- GitHub repository social preview upload candidate: `assets/social-preview-github.png`

The asset should continue to communicate the same category in one glance: open-source upload security for Node.js, before storage.
