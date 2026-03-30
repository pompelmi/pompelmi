---
title: Archive / ZIP upload security
description: Protect ZIP and archive upload routes with explicit archive guards for depth, expansion, entry counts, and traversal before anything is unpacked or stored.
---

Archives deserve their own controls. The same route that safely accepts a JPEG can become a resource-exhaustion problem the moment it accepts ZIP.

## Use archive-specific controls

- Limit entry count.
- Limit total uncompressed bytes.
- Limit nesting depth.
- Reject traversal-style paths.

## Example scanner composition

```ts
import { composeScanners, createZipBombGuard, CommonHeuristicsScanner } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);
```

## Continue

- [CI/CD artifact scanning](./cicd-artifact-scanning/)
- [Pompelmi vs ClamAV for file uploads](../comparisons/pompelmi-vs-clamav-for-file-uploads/)
- [Preventing ZIP bombs](/pompelmi/blog/preventing-zip-bombs/)
