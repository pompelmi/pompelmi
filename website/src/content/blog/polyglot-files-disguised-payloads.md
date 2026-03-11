---
title: "Polyglot Files and Disguised Payloads: What They Are and How to Detect Them"
description: "Polyglot files are valid in two formats simultaneously — a JPEG that is also a valid PHP script, or a PDF that contains a ZIP. Learn how they bypass basic checks and what Pompelmi detects."
pubDate: 2024-08-15
author: "Pompelmi Team"
tags: ["security", "polyglot", "advanced-threats", "heuristics", "file-upload"]
---

# Polyglot Files and Disguised Payloads: What They Are and How to Detect Them

A polyglot file is a file that is simultaneously valid in two or more formats. This isn't a theoretical curiosity — it's a real attack technique used to bypass upload filters, exploit server-side code execution, and deliver payloads to browsers.

**TL;DR:** A file can be a valid JPEG *and* a valid PHP script. A JPEG can contain an embedded ZIP. A PDF can contain an XFA form with JavaScript. Pompelmi's `detectPolyglot` utility and `CommonHeuristicsScanner` catch the most common variants by inspecting raw bytes — not trusting format claims.

---

## How Polyglot Files Work

Most file parsers read a format's magic bytes and stop as soon as they understand what they need. A JPEG parser reads `FF D8 FF` at the start, processes image data, and ignores trailing bytes. That means you can append arbitrary data — including another complete file — to the end of a JPEG and most imaging libraries will never notice.

### Example: JPEG + ZIP

```
[FF D8 FF E0 ... JPEG data ... FF D9] [PK\x03\x04 ... ZIP data ...]
```

- An image viewer reads the JPEG header, renders the image, stops at `FF D9` (JPEG end-of-image marker).
- A ZIP extractor finds `PK\x03\x04`, parses the Central Directory, extracts files.
- Both parsers accept the same file as valid.

If this file is uploaded to a server that checks "is it a JPEG?" but then passes the raw bytes to a ZIP extraction step (e.g., a document processing pipeline), the ZIP payload executes.

### Example: PDF + ZIP (OOXML Trick)

Office Open XML files (`.docx`, `.xlsx`) are ZIP archives. A crafted document can combine a valid PDF header with ZIP content — some early Office processing libraries accepted both, creating a parsing ambiguity.

### Example: GIF + JavaScript

The GIF89a header (`47 49 46 38 39 61`) is short. The rest of a GIF can contain JavaScript tokens that parse as valid JS when the file is served with `text/javascript` instead of `image/gif`. Some server misconfiguration or content-negotiation bypass leads to script execution.

### Example: JPEG + PHP

A classic web shell attack: insert PHP code into a JPEG's EXIF comment field. If the web server is misconfigured to execute `.jpg` files as PHP (not uncommon in shared hosting), the embedded `<?php ...?>` runs.

```
<?php system($_GET['cmd']); ?>
```

Embedded in a JPEG comment block, an extension-only check passes. A magic-byte check passes. Only content inspection catches it.

---

## Pompelmi's Detection Capabilities

### Advanced Detection: detectPolyglot

The `pompelmi` package exports `detectPolyglot`, a utility that looks for known polyglot signatures:

```typescript
import { detectPolyglot } from 'pompelmi';

const bytes = new Uint8Array(fileBuffer);
const result = await detectPolyglot(bytes);

if (result.isPolyglot) {
  console.log('Polyglot detected:', result.formats, result.suspiciousIndicators);
}
```

`detectPolyglot` looks for:
- Multiple format magic bytes at different offsets
- Appended ZIP/OOXML structures after a primary format's end-marker
- PHP/server-side script tokens embedded in image data

### CommonHeuristicsScanner: SVG + Script

SVG files are XML. They can contain `<script>` elements that execute in a browser when the SVG is served as `image/svg+xml`. This is a real XSS vector in user-content pipelines.

```typescript
import { CommonHeuristicsScanner } from 'pompelmi';

const matches = await CommonHeuristicsScanner.scan(bytes);
// If the file is SVG with <script>, you'll see:
// [{ rule: 'svg_xss_risk', severity: 'suspicious' }]
```

### CommonHeuristicsScanner: Obfuscated Scripts

`detectObfuscatedScripts` looks for patterns commonly used to obfuscate JavaScript or other scripts:

```typescript
import { detectObfuscatedScripts } from 'pompelmi';

const flags = await detectObfuscatedScripts(bytes);
// Returns indicators of base64-encoded eval(), char code arrays, etc.
```

---

## Building a Polyglot-Aware Upload Pipeline

```typescript
import { createUploadGuard } from '@pompelmi/express-middleware';
import {
  composeScanners,
  CommonHeuristicsScanner,
  createZipBombGuard,
} from 'pompelmi';

// The composeScanners chain inspects file content at the byte level
const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 1000,
      maxTotalUncompressedBytes: 200 * 1024 * 1024,
      maxCompressionRatio: 100,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  {
    parallel: false,
    stopOn: 'malicious',
    timeoutMsPerScanner: 3000,
    tagSourceName: true,
  }
);

const guard = createUploadGuard({
  includeExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'svg'],
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/svg+xml'],
  maxFileSizeBytes: 10 * 1024 * 1024,
  stopOn: 'suspicious',
  failClosed: true,
  scanner,
  onScanEvent: (ev) => {
    if ((ev as any).verdict && (ev as any).verdict !== 'clean') {
      console.warn('[upload-blocked]', ev);
    }
  },
});
```

---

## SVG: The Most Dangerous "Image" Format

SVG is the most commonly mishandled image format in upload pipelines. Unlike JPEG, PNG, and GIF, SVG is executable in browsers. Serving user-uploaded SVGs with `image/svg+xml` from your own domain means an attacker can inject arbitrary JavaScript into your site's origin.

**If you accept SVG uploads:**

1. Sanitize with a dedicated SVG sanitizer (e.g., DOMPurify on the server side) rather than scanning and passing through.
2. Consider serving SVG from a different origin or as an object/embed rather than an `<img>` tag.
3. At minimum, scan for `<script` tokens — Pompelmi's heuristics flag this.

```typescript
// If SVG is not required, exclude it entirely
includeExtensions: ['jpg', 'jpeg', 'png', 'pdf'] // no 'svg'
```

---

## Validating Content After Magic Bytes

For some use cases, you want to go beyond heuristics and verify that a file *actually parses* as the claimed format. This means:

- For JPEG: try to decode image headers with a library like `sharp`.
- For PDF: run a quick PDF structure validation.
- For Office files: verify zip container integrity.

This adds latency and complexity. For most upload pipelines, magic byte checks + heuristic scanning is the right balance. Full format parsing is best-effort defense-in-depth for high-value assets.

---

## Threat Model: Who Uses Polyglot Attacks?

Polyglot attacks require understanding multiple file formats and are not usually the work of script kiddies. They appear in:

- **Bug bounty submissions**: Researchers testing upload bypass.
- **Targeted attacks on document processing pipelines**: Legal discovery tools, medical records systems, content moderation systems.
- **Supply chain exploits**: Malicious assets embedded in dependency packages (`.jpg` in `node_modules` that's actually a ZIP with a postinstall hook).

---

## Practical Defense Summary

| Attack | Defense |
|---|---|
| Extension spoofing (`evil.exe` → `image.jpg`) | Magic byte validation + content heuristics |
| JPEG with embedded ZIP | `detectPolyglot`, end-of-file scanning |
| SVG with `<script>` | `CommonHeuristicsScanner` SVG heuristic |
| PDF with `/JavaScript` | `CommonHeuristicsScanner` PDF heuristics |
| OOXML with `vbaProject.bin` | `CommonHeuristicsScanner` macro detection |
| Appended data after image | Deep polyglot detection |

---

## Summary

Polyglot files exploit the gap between "this file claims to be X" and "this file is actually only X". Magic bytes confirm the primary format. Content heuristics catch embedded payloads and dangerous format-specific features. Together they form a practical defense against the most common disguised upload attacks.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: Why extension checks are not enough](/pompelmi/blog/mime-sniffing-magic-bytes/)
- [Blog: YARA integration for Node.js upload security](/pompelmi/blog/yara-integration-guide/)
