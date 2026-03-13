---
title: Architecture & threat model
description: How Pompelmi validates uploads, what it protects against, what it intentionally does not do, and how to think about it as one layer in a defense-in-depth strategy.
---

This page explains how Pompelmi works internally, what security properties it provides, and where its boundaries are. Read it before deploying to production.

---

## What Pompelmi is

Pompelmi is an **in-process file upload security layer** for Node.js. "In-process" means scanning runs inside your application's Node.js runtime — no external daemon, no HTTP call to a cloud API, no sidecar process required.

It sits in the upload path: after the file arrives in memory (or on a temporary buffer) and before you write it to permanent storage, pass it to a downstream service, or make it accessible. Its job is to give you a structured verdict you can act on.

---

## Scan pipeline

Every call to `scanBytes` or `scanFile` runs through a layered pipeline. Each layer can independently reject an upload. All layers that run produce structured matches that feed into the final verdict.

```
Incoming upload buffer
        │
        ▼
┌───────────────────────────────┐
│ 1. Policy guards              │  size limit · extension allowlist · declared MIME
│    (no bytes read)            │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ 2. Magic-byte validation      │  actual file signature vs. declared type
│    (reads file header)        │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ 3. CommonHeuristicsScanner    │  PE/ELF/script header detection
│    (structural patterns)      │  polyglot detection · obfuscation signals
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ 4. ZIP inspection             │  entry count · per-entry size · total
│    (archive bombs & traversal)│  uncompressed size · nesting depth
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ 5. YARA scanning (optional)   │  custom or curated rules matched against
│    (pattern matching)         │  the full file bytes
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ 6. Verdict aggregation        │  CLEAN → SUSPICIOUS → MALICIOUS
│                               │  with structured reasons and match details
└───────────────────────────────┘
```

Layers are composable. You can include or exclude any layer using `composeScanners`. The order above is the recommended default.

### Layer 1 — Policy guards

Applied before reading any bytes. Guards check:

- **Size limit** — files exceeding `maxFileSizeBytes` are rejected immediately, protecting against memory exhaustion regardless of content.
- **Extension allowlist** — the declared file extension must be in `includeExtensions`. This is a coarse signal, not a guarantee.
- **Declared MIME type** — the content-type header from the multipart upload must be in `allowedMimeTypes`.

Guards are your first, cheapest line of defense. Tighten them to your use case.

### Layer 2 — Magic-byte validation

Reads the first few hundred bytes of the file and compares the actual binary signature against the declared MIME type. This catches a common bypass: uploading a `malware.exe` renamed to `photo.jpg` with the content-type forged to `image/jpeg`.

### Layer 3 — CommonHeuristicsScanner

Inspects file structure for patterns associated with known-risky content:

- **PE/ELF headers** — Windows executables (`.exe`, `.dll`, `.sys`) and Linux ELF binaries detected by magic bytes even inside renamed files.
- **Script-in-image polyglots** — files that simultaneously parse as a valid image and as executable code in a script interpreter.
- **Obfuscated payloads** — common patterns found in obfuscated JavaScript, PHP, and shell scripts.
- **Embedded macros** — Office document markers that indicate embedded VBA macro payloads.
- **Dangerous PDF structures** — embedded JavaScript actions and auto-launch actions in PDF containers.

The heuristic scanner produces `suspicious` or `malicious` matches, not detections. A match means a policy decision is needed. It does not mean the file is definitively malware.

### Layer 4 — ZIP inspection

Archives are expanded in memory (streaming) and each entry is validated:

- **Entry count** — limits the number of files inside an archive to prevent exhaustion attacks.
- **Per-entry size** — limits each decompressed entry to prevent single-entry bombs.
- **Total uncompressed size** — limits aggregate extracted bytes across all entries.
- **Nesting depth** — limits how many archives-within-archives are traversed.

A classic ZIP bomb (e.g., 42.zip) is caught at the per-entry or total-size limit before the full decompression is attempted.

### Layer 5 — YARA scanning (optional)

Runs YARA pattern-matching rules against the full file buffer. YARA is the industry standard for malware rule authoring. Pompelmi treats YARA as one more scanner in the `composeScanners` pipeline.

YARA detection quality is directly proportional to the quality and freshness of the rules provided. The heuristic pipeline works without YARA; YARA extends it with signature-based detections.

### Layer 6 — Verdict aggregation

All matches from all scanners are combined. The verdict is the highest severity reported:

| Verdict | Meaning |
|---|---|
| `clean` | No scanner produced a match above the policy threshold. |
| `suspicious` | At least one scanner matched at a moderate severity; requires a policy decision. |
| `malicious` | At least one scanner matched at high or critical severity; the upload should be blocked. |

Each verdict is accompanied by structured `matches` (rule name, severity, metadata) and `reasons` (human-readable strings). These are logged and can drive downstream workflows like quarantine.

---

## Threat model

### What Pompelmi protects against

| Attack | Layer that catches it |
|---|---|
| Executable disguised as image (renamed `.exe`) | Magic-byte validation + heuristics |
| ZIP bomb (compressed bomb that expands to GBs) | ZIP inspection |
| Deeply nested archive (recursive ZIP) | ZIP inspection (nesting depth) |
| Polyglot file (valid image + valid script) | CommonHeuristicsScanner |
| PDF with embedded JavaScript or auto-launch | CommonHeuristicsScanner |
| Office document with macro payload | CommonHeuristicsScanner |
| MIME type spoofing (content-type forgery) | Magic-byte validation |
| Known malware signatures (with YARA rules) | YARA scanner |
| Files that exceed configured size limits | Policy guards |
| File type entirely outside the allowed set | Policy guards (extension + MIME) |

### What Pompelmi does not protect against

Pompelmi is an upload gate. It is not a full antivirus platform. The following are outside its scope:

- **Encrypted or password-protected archives** — content cannot be inspected without a key.
- **Zero-day malware with no matching heuristic or YARA rule** — novel threats with no prior signature are not caught by any static scanner.
- **Post-upload exploitation** — if a malicious file is approved (false negative) and then executed or served directly, Pompelmi has no further role.
- **Server-side code injection via file content fields** — Pompelmi scans file bytes, not form fields. Input validation of non-file fields is the application's responsibility.
- **Semantic content** that is legal technically but violates your use case (e.g., a valid JPEG containing objectionable imagery). Content moderation is a separate concern.

---

## Privacy model

Pompelmi scans entirely in-process. Uploaded file bytes are never sent to any external service as part of scanning:

- **No cloud API calls** — `scanBytes` runs synchronously in your Node.js process.
- **No data egress** — file content stays in the memory space of your application.
- **No persistent storage of scanned content** — bytes are processed and released; Pompelmi does not write files on your behalf unless you explicitly use the quarantine module.
- **YARA rules run locally** — rule matching via `@litko/yara-x` is also fully in-process when used.

For regulated environments (healthcare, legal, finance, government), in-process scanning is often the only viable option for user-uploaded data. Pompelmi is designed to stay within your data perimeter.

---

## Operational model

### At startup

No warmup or background process is needed. `scanBytes` and `scanFile` are available as soon as the module is imported. YARA rules are compiled at initialization time if used.

### Per request

A typical heuristic scan on a file under 10 MB completes in single-digit milliseconds. ZIP scanning time scales with archive size. YARA matching speed depends on rule count and file size.

### On errors

By default, Pompelmi propagates scan errors to the caller. Setting `failClosed: true` causes scan errors and timeouts to result in a `malicious` verdict rather than allowing the upload to proceed. **For production, always set `failClosed: true`.**

---

## Production guidance

- **Set `failClosed: true`** on all adapters. An error in the scan pipeline should default-deny, not default-allow.
- **Narrow the extension and MIME allowlists** to exactly what your application needs. Do not allow `application/octet-stream` or `*/*` in production.
- **Set file size limits below what your infrastructure can handle comfortably.** The size limit guard runs before any byte is read.
- **Review ZIP limits** based on your expected archive use. For most apps, an entry count below 1,000 and a total uncompressed limit below 500 MB are appropriate starting points.
- **Wire up scan hooks** to capture verdicts and durations in your observability stack. Anomaly spikes in threat detections are a meaningful signal.
- **Use the quarantine workflow** for `suspicious` files rather than silently dropping or silently accepting them. Manual review of borderline cases improves your understanding of real-world traffic.
- **Write an audit trail** for compliance. Every upload decision — clean or blocked — should be logged with enough context for incident response.

---

## Limitations

The following are known constraints, not bugs:

- Heuristic detection produces **false positives** on legitimate but unusual files (e.g., a valid PDF with embedded JavaScript for interactive forms). Tune policy packs and thresholds for your content types.
- YARA rule quality is **maintained by you**, not Pompelmi. Stale or overly broad rules reduce accuracy.
- Files larger than available process memory can cause issues. The size guard should be set well below the operating memory budget.
- Scanning is single-threaded within a Node.js request. For very high concurrency, consider running scans in a worker pool or a separate process.

---

## Pompelmi as one layer of many

Pompelmi is most effective when combined with:

1. **Input validation** — reject uploads that fail business rules before they reach the scanner.
2. **Storage isolation** — store uploaded files in a bucket or directory that is not served directly, never executed, and is separate from application code.
3. **Access controls** — only authenticated and authorized users should be able to upload.
4. **Rate limiting** — prevent abuse of the upload endpoint by volume.
5. **Downstream scanning** — consider a second scan pass for high-risk content after storage, especially if new YARA rules are deployed.
6. **Monitoring and alerting** — treat an unusual spike in `malicious` or `suspicious` verdicts as a security event worth investigating.

No single control is sufficient. Pompelmi provides a well-defined, testable gate at one specific point in the upload pipeline.
