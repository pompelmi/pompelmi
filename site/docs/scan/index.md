---
title: Scanners
---

# Scanners

These scanners run inside the Pompelmi engine and are reused by all adapters (Express, Koa, Next.js, CLI). Each rule returns a **match** with a severity (usually `malicious` or `suspicious`) and a short reason.

> Want to wire multiple rules together? See **[Compose scanners](/docs/compose-scanners)**.

## Available scanners

- **[Executable detector](/docs/scan/executable-detector)**  
  Blocks uploads that look like native executables (Windows **PE**, Linux **ELF**, macOS **Mach‑O**). Marked **malicious** by default.

- **[PDF actions](/docs/scan/pdf-actions)**  
  Flags PDFs that contain interactive/active entries such as **/OpenAction**, **/AA**, **/JS**, or **/EmbeddedFile**. Marked **suspicious** by default.

- **[SVG active content](/docs/scan/svg-active-content)**  
  Flags `<script>` tags and inline event handlers (`on*=`) inside SVG. Marked **suspicious** by default.

- **[Polyglot magic](/docs/scan/polyglot-magic)**  
  Flags files whose header matches **2+ distinct file signatures** (e.g. `PNG+ZIP`). Marked **suspicious** by default.

- **[ZIP deep‑inspection](/docs/zip-inspection)**  
  ZIP bomb limits, traversal‑safe extraction, inner‑MIME sniff and header consistency checks.

## Quick start

Use the engine to compose a scanner pipeline. You can tweak severities or disable any rule in your project config.

```ts
import {
  compose,
  ExecutableDetector,
  PdfActionScanner,
  SvgActiveContentScanner,
  PolyglotMagicScanner,
} from '@pompelmi/engine'

export const scan = compose([
  ExecutableDetector(),
  PdfActionScanner(),
  SvgActiveContentScanner(),
  PolyglotMagicScanner(),
])
```

### Tuning

Every scanner accepts options (thresholds, allowlists, etc.). Check each page above for parameters and examples. If a rule is too noisy, set it to `suspicious` or turn it off per route.
