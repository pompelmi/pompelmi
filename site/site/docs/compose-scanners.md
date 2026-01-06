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

---
title: Compose scanners
description: Run multiple scanners together (sequential or parallel) with optional stop-on, timeouts, and rule de-duplication.
sidebar:
  label: Compose scanners
  order: 3
---

# Compose scanners

Use the engine’s **`compose(...)`** to run multiple scanners as a single scanner.
For advanced orchestration (parallel, per‑scanner timeouts, early stop, rule
 de‑duplication, source tagging), use **`composeScanners(...)`** if available in
your version.

> Both forms return a **Scanner** with `scan(bytes): Promise<Match[]>`.

## Quick start (sequential compose)

```ts
import {
  compose,
  ExecutableDetector,
  PdfActionScanner,
  SvgActiveContentScanner,
  PolyglotMagicScanner,
} from 'pompelmi'

export const scan = compose([
  ExecutableDetector(),
  PdfActionScanner(),
  SvgActiveContentScanner(),
  PolyglotMagicScanner(),
])
```

Use `scan` in your upload guard/middleware just like any single scanner.

## Advanced orchestration (optional)
If your build exports `composeScanners`, you can control execution strategy and
resiliency.

```ts
import {
  composeScanners,
  ExecutableDetector,
  PdfActionScanner,
  SvgActiveContentScanner,
  PolyglotMagicScanner,
} from 'pompelmi'

export const scan = composeScanners(
  [
    ['exec', ExecutableDetector()],
    ['pdf',  PdfActionScanner()],
    ['svg',  SvgActiveContentScanner()],
    ['poly', PolyglotMagicScanner()],
    // ['yara', YaraScanner()], // optional
  ],
  {
    parallel: false,                  // run sequentially to enable stopOn
    stopOn: 'suspicious',             // short‑circuit on first suspicious/malicious
    timeoutMsPerScanner: 1500,        // fail‑open per scanner after 1.5s
    dedupeRules: true,                // drop duplicate rule names
    tagSourceName: true,              // write match.meta.source = 'exec' | 'pdf' | …
  }
)
```

### API (types)
```ts
type Severity = 'info' | 'suspicious' | 'malicious'

type Match = {
  rule: string
  severity?: Severity
  meta?: Record<string, unknown> // e.g. { tokens: ['/JavaScript'], source: 'pdf' }
}

interface Scanner {
  scan(bytes: Uint8Array): Promise<Match[]>
}

/** A scanner or a named pair used for meta‑tagging */
type NamedScanner = Scanner | [name: string, scanner: Scanner]

/** composeScanners options */
type ComposeOptions = {
  parallel?: boolean                // default: true
  stopOn?: Exclude<Severity,'info'> // 'suspicious' | 'malicious' (sequential only)
  timeoutMsPerScanner?: number      // default: undefined (no timeout)
  dedupeRules?: boolean             // default: true
  tagSourceName?: boolean           // default: false
}
```

## Common patterns

**Latency‑first (parallel):**
```ts
const scan = composeScanners([
  ExecutableDetector(),
  PdfActionScanner(),
  SvgActiveContentScanner(),
], { parallel: true })
```

**Fail‑fast (sequential + stopOn):**
```ts
const scan = composeScanners(
  [
    ['fast', ExecutableDetector()],
    ['deep', PdfActionScanner()],
  ],
  { parallel: false, stopOn: 'suspicious' }
)
```

**Resilience (timeouts):**
```ts
const scan = composeScanners([
  ExecutableDetector(),
  PdfActionScanner(),
], { timeoutMsPerScanner: 1500 })
```

## Tips
- Put **cheap checks first** when using `parallel: false` + `stopOn`.
- Enable **`tagSourceName`** to see which scanner produced each match.
- Keep **`dedupeRules: true`** to avoid duplicate `rule` entries across scanners.
- If `composeScanners` isn’t exported in your version, stick with `compose([...])`.

## See also
- **[Executable detector](/docs/scan/executable-detector)**
- **[PDF actions](/docs/scan/pdf-actions)**
- **[SVG active content](/docs/scan/svg-active-content)**
- **[Polyglot magic](/docs/scan/polyglot-magic)**
- **[ZIP deep‑inspection](/docs/zip-inspection)**