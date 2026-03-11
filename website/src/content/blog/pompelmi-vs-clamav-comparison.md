---
title: "Pompelmi vs ClamAV vs Custom Pipelines: Choosing the Right Upload Scanner"
description: "A practical, honest comparison of Pompelmi's heuristic scanner, ClamAV integration, and custom YARA pipelines for Node.js application upload security."
pubDate: 2024-11-01
author: "Pompelmi Team"
tags: ["comparison", "clamav", "yara", "nodejs", "architecture", "security"]
---

# Pompelmi vs ClamAV vs Custom Pipelines: Choosing the Right Upload Scanner

There is no universally correct answer to "how should I scan file uploads?" The right choice depends on your threat model, infrastructure, latency budget, and whether files contain sensitive data. This post compares the three most common approaches for Node.js applications: Pompelmi's built-in heuristics, ClamAV integration, and custom YARA rule pipelines.

---

## Approach 1: Pompelmi's Heuristic Scanner (Built-In)

Pompelmi's `CommonHeuristicsScanner` and `createZipBombGuard` provide structural threat detection without any external database or service dependency.

**What it detects:**

- ZIP bombs (compression ratio, entry count, nesting depth via `createZipBombGuard`)
- PE executables (Windows `.exe`, `.dll`, `.sys`) via MZ header
- OLE2 Office containers (old-style `.doc`, `.xls`)
- OOXML files with VBA macros (`vbaProject.bin` in ZIP container)
- PDFs with risky actions (`/JavaScript`, `/OpenAction`, `/AA`, `/Launch`)
- SVG files with embedded scripts (`<script>` element)
- Obfuscated scripts

**What it does NOT detect:**

- Known malware by signature (no database)
- Novel binary payloads without structural cues
- Password-protected archives (cannot inspect encrypted content)
- EICAR test file (no AV signature check)

**Setup:**

```typescript
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({ maxEntries: 1000, maxCompressionRatio: 100 })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', tagSourceName: true }
);
```

**Pros:**
- Zero setup — no daemons, no database downloads.
- Millisecond-range latency.
- No network calls; fully private.
- Works in serverless environments.
- No operating system dependency.

**Cons:**
- No signature-based malware detection.
- Cannot catch novel threats without structural patterns.
- Coverage is limited to known structural patterns.

**Best for:** Web applications where the primary threats are ZIP bombs, macro-enabled documents, and executable disguises. Most upload security requirements at the application layer.

---

## Approach 2: ClamAV via @pompelmi/engine-clamav

ClamAV is a mature, open-source AV engine with a large, community-maintained signature database. The `@pompelmi/engine-clamav` adapter integrates ClamAV into Pompelmi's scanner interface.

**What it detects:**

- Known malware by AV signature (hundreds of thousands of signatures)
- EICAR test file
- Known ransomware patterns
- Known exploit documents
- Anything in the ClamAV database

**What it does NOT detect:**

- Zero-day threats not yet in the database
- ZIP bombs (ClamAV may extract and scan recursively, but bomb protection depends on configuration)
- Novel structural patterns not represented by signatures

**Setup:**

```bash
# Install ClamAV on the host
apt-get install clamav clamav-daemon  # Debian/Ubuntu
brew install clamav                    # macOS

# Update signatures
freshclam

# Start the daemon (for low-latency scanning)
clamd
```

```typescript
import { createUploadGuard } from '@pompelmi/express-middleware';
// @pompelmi/engine-clamav wraps clamd or clamscan
import { createClamAvScanner } from '@pompelmi/engine-clamav';

const scanner = await createClamAvScanner({
  // Connect to local clamd socket (faster than spawning clamscan per file)
  socket: '/var/run/clamav/clamd.ctl',
  timeout: 10000,
});

const guard = createUploadGuard({
  includeExtensions: ['pdf', 'docx', 'zip', 'jpg', 'png'],
  maxFileSizeBytes: 50 * 1024 * 1024,
  stopOn: 'suspicious',
  scanner,
});
```

**Pros:**
- Broad signature coverage.
- EICAR test file support.
- Community-maintained, well-known.
- ClamAV daemon mode has low per-scan latency (5–50 ms via socket).

**Cons:**
- Requires ClamAV installed on every server instance.
- Signature database requires regular updates (`freshclam`).
- Not available in edge/serverless environments (Cloudflare Workers, Lambda@Edge).
- More complex deployment.
- Signature database is community-maintained; lags commercial AV.

**Best for:** Applications that need EICAR support, have infrastructure control, and need broad commodity malware detection. Document management systems, file hosting platforms.

---

## Approach 3: Custom YARA Rules via @pompelmi/engine-yara

YARA is a pattern-matching engine designed for malware research. It lets you write rules that match on byte patterns, strings, and conditions. The `@pompelmi/engine-yara` and the core `pompelmi` package support YARA rule evaluation.

**What it detects:**

- Anything you write a rule for.
- Custom threat patterns specific to your application.
- Organization-specific indicators of compromise (IOCs).
- Proprietary file format abuse.

**Example YARA rule:**

```yara
rule PE_Disguised_As_PDF
{
  meta:
    description = "PE executable with .pdf extension"
    severity = "high"
  strings:
    $mz = { 4D 5A }
  condition:
    $mz at 0
}

rule ZIP_Contains_Script
{
  meta:
    description = "ZIP archive containing suspicious script files"
  strings:
    $pk = { 50 4B 03 04 }
    $eval = "eval(" nocase
  condition:
    $pk at 0 and $eval
}
```

```typescript
import { createPresetScanner } from 'pompelmi';

// Using preset with custom YARA rules
const scanner = await createPresetScanner('advanced', {
  yaraRules: `
    rule TestRule {
      strings:
        $s = "malicious_pattern"
      condition:
        $s
    }
  `,
  yaraTimeout: 5000,
});
```

**Pros:**
- Fully customizable rules.
- Can match your specific threat landscape.
- Fast at runtime (pattern matching is O(n)).
- Rules are auditable and version-controllable.
- No third-party database dependency.

**Cons:**
- You must write (or source) rules — this requires security expertise.
- Rules need maintenance as threats evolve.
- YARA engine requires native compilation or WASM build.
- No coverage for unknown threats, only patterns you defined.

**Best for:** Organizations with security teams that can write and maintain rules. Applications with very specific threat models (e.g., reject any file containing a particular API key pattern, or flag files matching known internal document templates).

---

## Comparison Matrix

| Capability | Built-in Heuristics | ClamAV | Custom YARA |
|---|---|---|---|
| ZIP bomb protection | ✅ Excellent | ⚠️ Config-dependent | ✅ With custom rule |
| PE/EXE detection | ✅ By magic bytes | ✅ By signature | ✅ With custom rule |
| Macro detection | ✅ Structural hint | ✅ Signature | ✅ With custom rule |
| Known malware AV sigs | ❌ None | ✅ Extensive | ❌ Only if you write it |
| EICAR test file | ❌ | ✅ | Only with EICAR rule |
| Serverless compatible | ✅ | ❌ | ✅ (WASM) |
| Zero external deps | ✅ | ❌ Daemon required | ⚠️ Engine required |
| Custom threat rules | ❌ | ❌ | ✅ Fully customizable |
| Scan latency (1 MB) | < 10 ms | 10–100 ms | 5–50 ms |
| Privacy (no data egress) | ✅ | ✅ | ✅ |
| Maintenance burden | Low | Medium | High (rule authoring) |

---

## Combining Approaches

The recommended production setup for most regulated applications:

```typescript
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

// Layer 1: ZIP bomb protection (free, fast, critical)
// Layer 2: Structural heuristics (free, fast, catches disguised files)
// Optional Layer 3: ClamAV or YARA (add when threat model requires it)

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({ maxEntries: 1000, maxCompressionRatio: 100 })],
    ['heuristics', CommonHeuristicsScanner],
    // ['clamav', clamAvScanner],  // add when available in your infra
    // ['yara', yaraScanner],       // add when custom rules are ready
  ],
  {
    parallel: false,
    stopOn: 'malicious',
    timeoutMsPerScanner: 3000,
    tagSourceName: true,
  }
);
```

Start with heuristics. Add ClamAV when you have infrastructure control and need signature coverage. Add YARA when you have a security team writing rules.

---

## Summary

Pompelmi's built-in heuristics are the right starting point for most Node.js upload security — zero setup, zero latency, zero data egress. ClamAV adds signature coverage when your infrastructure supports it. Custom YARA rules add precision when you have specific threat requirements. Most production systems are best served by combining the first two layers, with YARA as a later addition for high-security contexts.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: Privacy-first upload security vs cloud scanning APIs](/pompelmi/blog/privacy-first-vs-cloud-scanning/)
- [Blog: YARA integration for Node.js upload security](/pompelmi/blog/yara-integration-guide/)
