---
title: Image upload security
description: Secure image uploads in Node.js with route-level allowlists, content inspection, SVG separation, and inspect-first-store-later handling.
---

Image uploads look low-risk until the route quietly accepts SVG, renamed executables, or oversized files that downstream image tooling will parse.

## Recommended baseline

- Use `IMAGES_ONLY` for raster image routes.
- Keep SVG on its own route or reject it outright if you do not need it.
- Enforce parser limits and image-specific extension allowlists.
- Persist only after the upload is `clean`.

## Good route boundaries

- Avatar uploads: JPEG, PNG, WebP only.
- Marketing assets: handle SVG separately with stricter rules.
- Archive or PSD uploads: do not mix them into the same route as public images.

## Continue

- [How to block risky PDFs and SVG uploads](../tutorials/block-risky-pdf-and-svg-uploads/)
- [Secure file uploads in Express](../how-to/express/)
- [Extension checks vs MIME sniffing vs content inspection](../comparisons/extension-checks-vs-mime-sniffing-vs-content-inspection/)
