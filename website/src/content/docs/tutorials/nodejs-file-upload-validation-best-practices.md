---
title: Node.js file upload validation best practices
description: "Understand the validation layers that matter in a Node.js upload route: parser limits, allowlists, MIME sniffing, structural checks, archive controls, and storage decisions."
---

File upload validation is not one check. It is a stack of checks with different purposes.

For the broader route-design view of where validation fits, see [Secure file uploads in Node.js: Beyond Extension and MIME Checks](/blog/secure-file-uploads-nodejs/).

## Validation layers that actually matter

| Layer | Purpose | Example |
| --- | --- | --- |
| Parser limits | Protect resources before deeper work starts | Max file size, file count, request size |
| Extension allowlist | Quick route-level filter | `pdf`, `png`, `jpg` only |
| MIME allowlist | Reject obviously wrong uploads | `application/pdf`, `image/png` |
| Magic-byte / type validation | Verify what the bytes claim to be | Detect a renamed executable |
| Structural inspection | Look for risky content patterns | PDF actions, SVG scripts, macro containers |
| Archive controls | Handle ZIP-specific abuse | Traversal, depth, total expansion |
| Storage decision | Decide trust level | Store, quarantine, or reject |

## Common anti-patterns

- Trusting `req.file.mimetype` as the final answer.
- Using one generic upload route for every file type.
- Allowing ZIP or SVG through image-only routes.
- Treating validation as complete once the file extension looks right.

## A practical rule

The more powerful the file format, the narrower the route and policy should be.

- Plain images need a tighter but simpler policy.
- PDFs and Office documents need structural inspection.
- ZIPs need explicit archive rules.
- Direct-to-object-storage flows need quarantine and promotion logic.

## Continue

- [Node.js file upload security checklist](./nodejs-file-upload-security-checklist/)
- [File-type validation vs malware scanning](../comparisons/file-type-validation-vs-malware-scanning/)
- [Secure file uploads in Node.js: Beyond extension and MIME checks](/blog/secure-file-uploads-nodejs/)
- [Defense in depth for file uploads](../use-cases/defense-in-depth-for-file-uploads/)
