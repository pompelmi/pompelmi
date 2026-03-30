---
title: Defense in depth for file uploads
description: Build layered file-upload security in Node.js with parser limits, type validation, structural inspection, quarantine, and safe storage patterns.
---

No single check is enough for upload security. The useful question is which layer catches which class of failure.

## Layered model

| Layer | Goal |
| --- | --- |
| Parser limits | Protect resources early |
| Extension + MIME allowlists | Narrow the route to what you actually expect |
| Magic-byte and structural checks | Verify the content instead of the metadata |
| Archive rules | Handle ZIP-specific abuse |
| Quarantine | Avoid all-or-nothing handling for business-critical flows |
| Storage isolation | Keep accepted files away from executable or public paths |

## Where Pompelmi fits

Pompelmi covers the application-layer upload gate. It does not replace auth, storage ACLs, logging, or endpoint protection.

## Continue

- [File-type validation vs malware scanning](../comparisons/file-type-validation-vs-malware-scanning/)
- [Quarantine / inspect-first-store-later workflows](./quarantine-inspect-first-store-later/)
- [Production readiness](../production-readiness/)
