---
title: "Why Extension Checks Fail on Untrusted Uploads"
description: "Extension filters still matter, but they are only the first layer. Learn where MIME sniffing and content inspection fit in a real upload-security design."
pubDate: 2024-08-01
updatedDate: 2026-03-30
author: "Pompelmi Team"
category: "Comparison"
tags: ["mime", "magic-bytes", "validation", "security", "file-upload"]
---

# Why Extension Checks Fail on Untrusted Uploads

Extension checks are useful. They are also easy to fool.

That is not a reason to throw them away. It is a reason to understand what they do and what they do not do.

## What an extension check actually answers

It answers one narrow question:

"Did the client give this file a name that ends in an extension the route expects?"

That is still worth checking because it catches accidental misuse and cheap attacks. It does not answer whether the bytes match the name or whether the content is safe enough for your route.

## What the next layers add

### MIME or magic-byte validation

This checks whether the bytes look like the type the route expects.

It is how you catch:

- An executable renamed to `.pdf`.
- A ZIP uploaded as an image.
- A client that lies in `Content-Type`.

### Content inspection

This checks whether the file is risky even if it looks like the right type.

It is how you reason about:

- Risky PDF actions.
- Macro containers.
- SVG with active content.
- Archive abuse.

## Practical rule

Use the checks in order:

1. Extension allowlist.
2. MIME or magic-byte validation.
3. Structural inspection.

That layered approach keeps the route fast while still making the trust decision based on the file itself instead of its filename.

## Where to go next

Use the decision-page version of this topic at [extension checks vs MIME sniffing vs content inspection](/comparisons/extension-checks-vs-mime-sniffing-vs-content-inspection/). For runnable code and framework routes, start with the [docs](/getting-started/), inspect the [examples](https://github.com/pompelmi/pompelmi/tree/main/examples), or follow the [repo on GitHub](https://github.com/pompelmi/pompelmi).
