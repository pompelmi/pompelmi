---
title: "Announcing pompelmi v0.20"
date: 2025-11-30
draft: false
tags: ["security", "nodejs", "file-upload", "yara", "announcement"]
categories: ["releases"]
author: "pompelmi team"
description: "v0.20 focused on stronger upload scanning defaults, improved YARA integration, and framework adapter updates."
---

pompelmi v0.20 focused on practical improvements for teams securing Node.js upload paths.

## Highlights

- Improved heuristic scanning behavior.
- Better ZIP bomb and archive-handling controls.
- Better MIME detection based on file bytes.
- Improved framework adapter ergonomics.
- Updated YARA integration patterns.

## YARA integration example

```typescript
import { createYaraScanner } from '@pompelmi/engine-yara';

const yaraScanner = createYaraScanner({
  rules: ['./rules/*.yar'],
  timeout: 5000,
});

const scanner = composeScanners(
  [
    ['heuristics', CommonHeuristicsScanner],
    ['yara', yaraScanner],
  ],
  { parallel: true, stopOn: 'suspicious' }
);
```

## Upgrade notes

Most users can upgrade directly:

```bash
npm update pompelmi
```

Review release notes and tests in your environment before promoting to production.

## Security posture reminder

pompelmi is one control in a broader upload security design. For production use:

- Use strict endpoint-specific allowlists.
- Set `failClosed: true` on production upload paths.
- Route suspicious results to quarantine or manual review.
- Keep storage non-executable and access-controlled.

## Resources

- [Documentation](https://pompelmi.github.io/pompelmi/)
- [GitHub Repository](https://github.com/pompelmi/pompelmi)
- [npm Package](https://www.npmjs.com/package/pompelmi)
- [Security Policy](https://github.com/pompelmi/pompelmi/blob/main/SECURITY.md)
