---
title: "Why Extension Checks Are Not Enough: MIME Sniffing and Magic Bytes"
description: "File extension filtering is trivially bypassed. Learn how magic-byte validation and MIME sniffing work, what threats they catch, and how Pompelmi's heuristics apply them correctly."
pubDate: 2024-08-01
author: "Pompelmi Team"
tags: ["security", "mime", "magic-bytes", "heuristics", "file-upload"]
---

# Why Extension Checks Are Not Enough: MIME Sniffing and Magic Bytes

Ask most developers how they validate uploaded file types and you'll hear: "We check the extension." That approach is so common and so broken that it deserves its own explanation.

**TL;DR:** File extensions are user-supplied metadata. They can be anything. Magic bytes — the first few bytes of a file that encoding-level identify the format — cannot be faked without corrupting the file. MIME sniffing is the process of reading those bytes. Pompelmi's `CommonHeuristicsScanner` applies this at the byte level before any file reaches your storage layer.

---

## What an Extension Actually Is

A file extension (`.pdf`, `.jpg`, `.zip`) is the characters after the last dot in a filename. It is:

- Set by the person uploading the file.
- Not validated by any OS-level mechanism when files are transmitted over HTTP.
- Not stored anywhere in most file formats as metadata.

When an attacker renames `malware.exe` to `report.pdf` and uploads it, your server receives a file with `Content-Type: application/pdf` (also set by the client) and a filename ending in `.pdf`. An extension-only check passes. The executable arrives on your server.

---

## Magic Bytes: The Real Signature

Most file formats define a fixed byte sequence at their start that identifies the format. These are called **magic bytes** or **file signatures**. Some examples:

| Format | Magic Bytes (hex) | Human-readable |
|---|---|---|
| PDF | `25 50 44 46 2d` | `%PDF-` |
| ZIP / DOCX / XLSX / JAR | `50 4b 03 04` | `PK\x03\x04` |
| JPEG | `ff d8 ff` | — |
| PNG | `89 50 4e 47 0d 0a 1a 0a` | `\x89PNG\r\n\x1a\n` |
| Windows PE (EXE/DLL) | `4d 5a` | `MZ` |
| OLE2 (old .doc/.xls) | `d0 cf 11 e0 a1 b1 1a e1` | — |
| ELF (Linux binary) | `7f 45 4c 46` | `\x7fELF` |

Reading magic bytes requires opening the file at the byte level — not trusting the `Content-Type` header or the filename extension. This is **MIME sniffing** (or more precisely, format detection by magic bytes).

---

## What Pompelmi's CommonHeuristicsScanner Detects

`CommonHeuristicsScanner` from the `pompelmi` package applies a set of byte-level checks against the raw `Uint8Array` of each uploaded file. Relevant detections include:

### PE Executables
```
MZ at bytes 0–1 → isPeExecutable → severity: 'suspicious'
```

Any file whose first two bytes are `4d 5a` is a Windows Portable Executable — `.exe`, `.dll`, `.sys`, etc. Uploading one disguised as a PDF should be suspicious by default.

### Office OLE Containers
```
D0 CF 11 E0 A1 B1 1A E1 → isOleCfb → 'office_ole_container' → severity: 'suspicious'
```

Old `.doc`, `.xls`, `.ppt` files use OLE2 (Compound File Binary) format. This format is also used by many macro-enabled documents. Detection here warns you before any macro analysis.

### OOXML Macros
```
ZIP magic bytes → search for 'vbaProject.bin' → 'office_ooxml_macros' → suspicious
```

Modern Office files (`.docx`, `.xlsx`, `.pptx`) are ZIP archives. If one contains `vbaProject.bin`, it has embedded VBA macros. The scanner finds this by reading magic bytes (ZIP header) and then byte-searching the archive container.

### Risky PDF Actions
```
%PDF- magic → search /JavaScript, /OpenAction, /AA, /Launch → 'pdf_risky_actions' → suspicious
```

PDFs support JavaScript execution, automatic open actions, and form submissions. A PDF with `/JavaScript` embedded often indicates an exploited or weaponized document.

### SVG Scripts
```
<svg → search <script → 'svg_xss_risk' → suspicious
```

SVG files are XML and support `<script>` elements. An SVG uploaded to a user-content path and served with `image/svg+xml` can execute arbitrary JavaScript in browsers.

---

## How to Wire This in Your Application

### With @pompelmi/express-middleware

```typescript
import { createUploadGuard } from '@pompelmi/express-middleware';
import { CommonHeuristicsScanner } from 'pompelmi';

const guard = createUploadGuard({
  // Extension allowlist — first line of defense
  includeExtensions: ['pdf', 'jpg', 'png', 'docx'],

  // MIME allowlist — second line (client-provided, still useful for logging)
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ],

  // Content inspection — third line (reads actual bytes, cannot be faked)
  scanner: CommonHeuristicsScanner,

  stopOn: 'suspicious',
  failClosed: true,
});

app.post('/upload', multer({ storage: multer.memoryStorage() }).single('file'), guard, handler);
```

### Using composeScanners for Defense in Depth

```typescript
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 1000,
      maxCompressionRatio: 100,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', timeoutMsPerScanner: 3000, tagSourceName: true }
);
```

This runs ZIP bomb detection first, then content heuristics. Early termination on `stopOn: 'malicious'` means a confirmed malicious file skips the heuristics pass entirely.

---

## Content-Type Header: Useful but Not Authoritative

The `Content-Type` request header is set by the client's browser or HTTP client. It is easily overridden:

```bash
# Legitimate upload — browser sets correct MIME
curl -F "file=@malware.exe" https://example.com/upload

# Attacker spoofs MIME type
curl -F "file=@malware.exe;type=image/jpeg" https://example.com/upload
```

`allowedMimeTypes` in the upload guard checks against this header. It is still useful as a first filter — it rejects clients that don't even bother faking the MIME — but it should never be your only check.

The authoritative check is magic bytes.

---

## The Double Extension Problem

Some attack payloads use filenames like `evil.jpg.exe` or `innocent.pdf.php`. On Windows, hiding file extensions is a default setting, so users see `innocent.pdf` and trust it. On Linux web servers, the `.php` extension may be the one that matters for execution.

Pompelmi's extension check uses the rightmost extension (after the last dot). Pair this with explicit allowlists (not denylists) to avoid bypasspaths:

```typescript
// ✅ Allowlist — only these extensions pass
includeExtensions: ['pdf', 'jpg', 'png']

// ❌ Denylist approaches are fragile
// if (!['exe', 'bat', 'sh', 'php'].includes(ext)) // ...easily bypassed with .PhP, .pHp7, etc.
```

---

## Null Byte Injection

Some older frameworks treated `evil.php\x00.jpg` as a JPEG filename (because `\x00` terminates C strings) but stored it as `evil.php`. Modern Node.js frameworks are not vulnerable to this, but it illustrates the depth of the extension-spoofing problem.

---

## Practical Takeaways

1. **Never rely on extension alone.** Extensions are user-supplied metadata.
2. **Check magic bytes for all file types you accept.** It takes microseconds and cannot be faked without corrupting the file.
3. **Use allowlists, not denylists.** You can enumerate safe types; you cannot enumerate all dangerous ones.
4. **Layer defenses**: extension check → MIME header check → magic byte check → content heuristics → storage.
5. **Log what gets blocked.** Seeing which rules fire tells you what attackers are trying.

---

## Summary

Magic bytes are the ground truth of file type detection. Extension checks and `Content-Type` headers are convenience metadata — accurate when correct, but trivially bypassed when malicious. `CommonHeuristicsScanner` reads the actual bytes of each file and flags executables, macro-enabled Office documents, weaponized PDFs, and SVG XSS payloads before they reach your storage layer.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: Polyglot files and disguised payloads](/pompelmi/blog/polyglot-files-disguised-payloads/)
- [Blog: Common file upload security mistakes in Node.js](/pompelmi/blog/common-file-upload-mistakes-nodejs/)
