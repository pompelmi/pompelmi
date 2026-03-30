---
title: Document upload security
description: Secure PDF, Office, and mixed business-document uploads with route-specific policies, structural inspection, and review-friendly verdict handling.
---

Document uploads are usually where teams need a softer decision than "block everything suspicious" while still keeping risky files out of durable storage.

## Common risks

- Macro-enabled Office files.
- PDFs with active or suspicious actions.
- Executables renamed as documents.
- ZIP-wrapped document bundles.

## Recommended baseline

- Use a document-specific allowlist instead of a generic upload route.
- Start with `DOCUMENTS_ONLY` or `STRICT_PUBLIC_UPLOAD`.
- Pair document routes with `CommonHeuristicsScanner`.
- Quarantine `suspicious` documents if business users still need review.

## Example

```ts
import { scanBytes, DOCUMENTS_ONLY } from 'pompelmi';

const report = await scanBytes(bytes, {
  filename,
  mimeType,
  policy: DOCUMENTS_ONLY,
  failClosed: true,
});
```

## Continue

- [PDF upload security](./pdf-upload-security/)
- [Quarantine / inspect-first-store-later workflows](./quarantine-inspect-first-store-later/)
- [When to use Pompelmi + YARA](../comparisons/when-to-use-pompelmi-plus-yara/)
