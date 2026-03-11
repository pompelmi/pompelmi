---
title: "Privacy-First Upload Security vs Cloud Scanning APIs: An Honest Comparison"
description: "Cloud AV APIs are convenient but ship your users' files to third parties. In-process scanning with Pompelmi keeps data where it belongs. Here's when each approach makes sense."
pubDate: 2024-10-15
author: "Pompelmi Team"
tags: ["privacy", "security", "comparison", "cloud", "architecture"]
---

# Privacy-First Upload Security vs Cloud Scanning APIs: An Honest Comparison

When you need to scan uploaded files for malware, you have a fundamental architectural choice: send files to a cloud AV API, or scan in your own process. Both work. Both have real tradeoffs. This post lays them out honestly so you can choose the right approach for your context.

---

## What Cloud Scanning APIs Do

Cloud scanning services (VirusTotal, MetaDefender, and similar) accept a file upload, run it through one or more AV engines, and return a verdict. The process:

1. Your server receives a file.
2. Your server (or your user's browser) uploads that file to the cloud API.
3. The cloud service scans with its engine pool.
4. The cloud service returns a result.
5. Your server uses the result to decide what to do.

**What this means in practice:**

- Files leave your infrastructure.
- Files are processed by a third-party service.
- That service typically retains files for analysis, research, or indexing.
- Network latency is added to every upload flow.

---

## What In-Process Scanning Does

In-process scanning (Pompelmi, ClamAV running locally, custom scanners) runs inside your application's process or on your infrastructure:

1. Your server receives a file.
2. Your server's in-process scanner inspects the bytes.
3. Your server gets a verdict immediately.
4. No file leaves your infrastructure at any point.

---

## The Privacy Question

This is not hypothetical. VirusTotal's [terms of service](https://support.google.com/transparencyreport/answer/14532072) explicitly state that files submitted to the public API may be shared with partners and used to improve detection. If a user uploads a confidential document and your system sends it to a cloud AV API, that document has left your infrastructure — potentially permanently.

For many applications, this is a non-issue. For others, it is:

- **Healthcare applications**: Patient records, diagnostic images, clinical notes. HIPAA's minimum-necessary principle applies; unnecessary disclosure to a third party creates real exposure.
- **Legal platforms**: Privileged attorney-client documents. Cloud scanning may violate privilege.
- **Financial services**: KYC documents, account statements, contracts. GLBA and similar regulations require controlling information flows.
- **HR platforms**: Resumes, ID documents, personal data. GDPR's data minimization principle applies.
- **Government or defense**: Classified or controlled unclassified information (CUI) cannot leave authorized systems.

Privacy-first scanning is not primarily a performance optimization — it's a data governance decision. Files that don't leave your infrastructure cannot be exposed, retained, or misused by third parties.

---

## Performance and Latency

| Approach | Typical scan latency (1 MB file) | Network overhead |
|---|---|---|
| Cloud API (VirusTotal, MetaDefender) | 500 ms – 5000 ms | Full file upload + result fetch |
| Cloud API with pre-hashing | 100 ms – 500 ms (hash lookup only) | ~32 bytes (SHA256) |
| In-process heuristics (Pompelmi) | 1 ms – 20 ms | Zero |
| Local ClamAV daemon | 10 ms – 200 ms | Local socket only |
| YARA engine (in-process) | 5 ms – 100 ms | Zero |

For synchronous upload flows — where the user is waiting for confirmation — in-process scanning is the only approach that doesn't introduce meaningful latency.

---

## Detection Coverage

| Approach | Signature-based detection | Heuristic detection | Zero-day coverage |
|---|---|---|---|
| Cloud multi-engine (VirusTotal) | High (70+ engines) | Varies | Better (collective intelligence) |
| Local ClamAV | Good (community sigs) | Limited | Lags cloud by days/weeks |
| Pompelmi heuristics | No database | Yes (structural) | Limited to structural patterns |
| Pompelmi + YARA | No database (unless custom rules) | Yes | Custom rules tailored to your threats |

**The honest tradeoff**: Cloud scanning has broader signature coverage because it aggregates dozens of AV engines. In-process heuristics catch structural threats (ZIP bombs, macro-enabled documents, PE executables, risky PDF actions) that don't require signature databases.

For most web application upload security, structural threats are the primary risk. A ZIP bomb, a macro-enabled Word document uploaded to bypass execution controls, or an SVG with embedded XSS — these are the realistic threats. Cloud scanning adds marginal value for commodity malware samples while adding meaningful privacy risk.

---

## Cost Model

Cloud scanning APIs charge per scan, per file, or per GB. At scale:

- VirusTotal public API: Free tier is rate-limited; commercial pricing starts at hundreds of dollars per month.
- MetaDefender: Similar pricing model.

In-process scanning has no per-scan cost. The compute cost is minimal (heuristics are fast; YARA rules scale with rule complexity and file size).

---

## Hybrid Approach

Some architectures use both:

1. **In-process heuristics as a fast gate** — run immediately on upload, block obvious threats before any persistence.
2. **Async cloud scan for deep analysis** — after saving the file (to a quarantine bucket, not live storage), submit an async job that uploads a hash to a cloud service. Only promote to live storage after async clearance.

This gives you low upload latency, privacy for the majority of content, and deeper inspection for files that pass structural checks. The tradeoff is complexity and the async promotion workflow.

---

## When Cloud APIs Make Sense

- You handle low-sensitivity files (e.g., public domain content, open datasets).
- You need maximum signature coverage and accept the latency and privacy tradeoff.
- You're building a security research tool where sharing with threat intelligence networks is desirable.
- Regulatory constraints don't prohibit third-party data processing.

## When In-Process Scanning Makes Sense

- You handle PII, health data, legal or financial documents.
- You need synchronous upload with no added latency.
- You want zero external dependencies in your upload path.
- You're in a regulated environment where third-party data processing requires explicit consent or contracting.
- You want cost predictability at scale.
- You want to run custom YARA rules tailored to your specific threat model.

---

## Pompelmi's Position

Pompelmi is explicitly in the in-process camp. It has no cloud API calls, no telemetry, and no external dependencies in its scan path. It works well for privacy-sensitive and regulated environments, not because of compliance certifications, but because of architecture: data never leaves your process.

```typescript
import { scanBytes, composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({ maxEntries: 1000, maxCompressionRatio: 100 })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious' }
);

// This function call reads bytes in your process.
// Nothing is sent anywhere.
const matches = await scanner(uploadedBytes);
```

---

## Summary

Cloud scanning APIs offer broad signature coverage at the cost of data leaving your infrastructure and network latency on every upload. In-process scanning with Pompelmi offers zero-latency structural threat detection with no data leaving your process. Hybrid architectures use both where the tradeoff is justified. Choose based on your data sensitivity, regulatory context, and latency requirements — not just detection breadth.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: When to use Pompelmi vs ClamAV vs custom pipelines](/pompelmi/blog/pompelmi-vs-clamav-comparison/)
- [Blog: Secure upload architecture for regulated industries](/pompelmi/blog/secure-upload-architecture-regulated-industries/)
