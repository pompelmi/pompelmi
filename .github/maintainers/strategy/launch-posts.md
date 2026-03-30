# Launch Posts

These are reusable draft patterns for launch posts, release notes, or community updates. Adjust them to match what actually changed.

## Short launch post

Pompelmi is an open-source upload gate for Node.js. It scans untrusted files before storage with in-process, local-first checks for spoofed files, archive bombs, and risky document structures. No cloud API or daemon required.

Repo: https://github.com/pompelmi/pompelmi

## Show HN style draft

Pompelmi is a Node.js library for secure file uploads. The goal is narrow and practical: inspect untrusted files before storage or downstream processing instead of trusting filenames, extensions, or client-provided MIME types.

It runs in-process, stays local-first, and works with common Node.js stacks. The repo includes the MIT core, framework adapters, docs, examples, tests, and production-readiness notes.

I would especially value feedback on:

- Which upload flows you need to protect.
- Where the docs or examples are still unclear.
- What observability or quarantine workflow you need in practice.

## X or Mastodon draft

Pompelmi is open-source file upload security for Node.js.

- Scan before storage
- No required cloud API
- No daemon
- Express, Next.js, NestJS, Fastify, Koa

It focuses on the upload gate itself: bytes, MIME claims, archives, and risky structures.

https://github.com/pompelmi/pompelmi

## LinkedIn draft

File upload endpoints are often treated like plumbing, but they are part of the attack surface. Pompelmi is an open-source Node.js library that adds an upload gate before storage or downstream processing. It uses in-process, local-first checks for spoofed files, archive bombs, polyglots, and risky document structures, with optional YARA when teams need custom matching.

The project is deliberately scoped: it is an upload-security layer, not a claim that one library replaces the rest of a security stack.

Repo and docs:

- https://github.com/pompelmi/pompelmi
- https://pompelmi.github.io/pompelmi/

## Dev.to or blog intro

Secure upload handling usually fails in one predictable place: the route accepts a file because the filename or MIME type looked fine, then the system stores it and only later discovers what actually arrived. Pompelmi is built around closing that gap in Node.js applications by making file inspection part of the upload decision itself.
