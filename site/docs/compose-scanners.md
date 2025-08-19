---
title: Compose Scanners
description: Run multiple scanners together (sequential or parallel) with stop-on, timeouts, and rule de-duplication.
sidebar:
  label: Compose Scanners
  order: 3
---

`composeScanners()` lets you orchestrate several scanners as a single one.

**Features**
- **parallel** or **sequential** execution
- optional **stopOn** (`'suspicious' | 'malicious'`) short-circuit (sequential only)
- per-scanner **timeout**
- rule **de-duplication**
- optional tagging of the source scanner in `match.meta.source`

## Quick example

```ts
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const zipGuard = createZipBombGuard({
  maxEntries: 512,
  maxTotalUncompressedBytes: 100 * 1024 * 1024,
  maxCompressionRatio: 12,
});

export const scanner = composeScanners(
  [
    ['zipGuard', zipGuard],
    ['heuristics', CommonHeuristicsScanner],
    // ['yara', YaraScanner], // optional
  ],
  { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
);
```

Use `scanner` in your upload guard/middleware just like any other single scanner.

## API

```ts
type Severity = 'info' | 'suspicious' | 'malicious';

type Match = {
  rule: string;
  severity?: Severity;
  meta?: Record<string, unknown>; // e.g. { tokens: ['/JavaScript'], source: 'heuristics' }
};

interface Scanner {
  scan(bytes: Uint8Array): Promise<Match[]>;
}

type NamedScanner = Scanner | [name: string, scanner: Scanner];

type ComposeOptions = {
  parallel?: boolean;                // default: true
  stopOn?: Exclude<Severity,'info'>; // 'suspicious' | 'malicious' (sequential only)
  timeoutMsPerScanner?: number;      // default: undefined (no timeout)
  dedupeRules?: boolean;             // default: true
  tagSourceName?: boolean;           // default: false
};
```

## Common patterns

**Latency-first (parallel):**
```ts
const scanner = composeScanners([CommonHeuristicsScanner, createZipBombGuard()], { parallel: true });
```

**Fail-fast (sequential + stopOn):**
```ts
const scanner = composeScanners(
  [
    ['fast', CommonHeuristicsScanner],
    // ['deep', YaraScanner],
  ],
  { parallel: false, stopOn: 'suspicious' }
);
```

**Resilience (timeouts):**
```ts
const scanner = composeScanners([/* ... */], { timeoutMsPerScanner: 1500 });
```

## Tips
- Put **cheap checks first** when `parallel: false` + `stopOn` is enabled.
- Enable `tagSourceName` to see which scanner produced each match.
- Keep `dedupeRules: true` to avoid duplicate `rule` entries in the result.
