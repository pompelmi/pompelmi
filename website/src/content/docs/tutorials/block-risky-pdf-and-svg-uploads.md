---
title: How to block risky PDFs and SVG uploads
description: A practical Node.js pattern for treating PDFs and SVGs as higher-risk file types, inspecting them before storage, and deciding between reject or quarantine.
---

PDF and SVG uploads often look routine, but both formats can carry active content or structures you do not want to trust blindly.

## Why these formats need special handling

### PDFs

- Can contain JavaScript, launch actions, and embedded attachments.
- Often move through document viewers, OCR pipelines, or internal review tools.

### SVGs

- Are XML, not passive bitmaps.
- Can embed scripts or browser-active content when served with the wrong headers.

## Recommended route shape

1. Keep PDF and SVG routes separate from generic image or document endpoints.
2. Scan bytes before persistence.
3. Reject obviously bad files.
4. Quarantine `suspicious` PDFs when business users still need a review path.
5. Prefer raster-only image routes when you do not actually need SVG support.

## Example with `scanBytes`

```ts
import { scanBytes, STRICT_PUBLIC_UPLOAD } from 'pompelmi';

const report = await scanBytes(bytes, {
  filename,
  mimeType,
  policy: STRICT_PUBLIC_UPLOAD,
  failClosed: true,
});

if (report.verdict !== 'clean') {
  return { action: 'reject-or-quarantine', report };
}
```

## Practical policy choices

- Treat SVG as a separate route with its own allowlist and serving rules.
- Keep uploaded SVGs off any path that browsers will execute inline unless you sanitize and re-serve them deliberately.
- For PDFs, decide whether `suspicious` means reject or review based on your product and user expectations.

## Continue

- [PDF upload security](../use-cases/pdf-upload-security/)
- [Image upload security](../use-cases/image-upload-security/)
- [Extension checks vs MIME sniffing vs content inspection](../comparisons/extension-checks-vs-mime-sniffing-vs-content-inspection/)
