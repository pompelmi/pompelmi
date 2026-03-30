---
title: Extension checks vs MIME sniffing vs content inspection
description: Compare the three common file-upload checks developers rely on and understand why extension checks alone are not enough for untrusted uploads.
---

These checks sit at different depths.

## Extension checks

- Fast and useful as a first filter.
- Easy to bypass because filenames are user-controlled.

## MIME sniffing

- Looks at bytes or signatures instead of trusting the request header.
- Better than extension checks, but still only answers what the file appears to be.

## Content inspection

- Looks for risky structures or matches inside the file.
- Needed for PDFs, archives, macro containers, SVG, and more nuanced threat patterns.

## Practical takeaway

Use all three in the right order:

1. Extension allowlist.
2. MIME or magic-byte validation.
3. Structural inspection or optional signature scanning.

## Continue

- [Why extension checks are not enough](/pompelmi/blog/mime-sniffing-magic-bytes/)
- [File-type validation vs malware scanning](./file-type-validation-vs-malware-scanning/)
- [Defense in depth for file uploads](../use-cases/defense-in-depth-for-file-uploads/)
