---
title: "Secure File Upload Architecture for Healthcare, Finance, and Enterprise Applications"
description: "Design patterns for upload security in regulated environments: quarantine flows, audit trails, role-based policies, and how Pompelmi fits privacy-sensitive data processing."
pubDate: 2024-11-15
author: "Pompelmi Team"
tags: ["architecture", "enterprise", "healthcare", "finance", "security", "privacy"]
---

# Secure File Upload Architecture for Healthcare, Finance, and Enterprise Applications

Applications in healthcare, finance, and regulated enterprise contexts have stricter requirements than typical consumer apps. They handle PII, health records, financial documents, and legal materials — data where a security incident has regulatory, legal, and reputational consequences far beyond "user experience degraded."

This post covers design patterns for upload security in these environments. We'll focus on architecture, not regulatory interpretation (consult qualified counsel for compliance guidance). Pompelmi's in-process, zero-egress scanning model fits naturally into these patterns.

---

## Core Principles for Regulated Upload Pipelines

### No Data Leaves Without Authorization

Every file upload that passes through a third-party service (cloud AV API, CDN without proper DPA, object storage in a non-approved region) represents a potential data handling event that may require consent, contracting, or notification obligations.

**Pattern**: Scan in-process. Use storage services with appropriate data processing agreements. Do not send files to external AV APIs without evaluating the data governance implications.

### Minimum Necessary Processing

Process files only to the extent required for the stated purpose. Scanning for malware is required. Passing file content to analytics pipelines, logging systems, or training datasets is not.

**Pattern**: `onScanEvent` callbacks should log metadata (filename, size, verdict, matched rules) — never raw file content.

### Audit Everything

Regulated environments require audit trails: who uploaded what, when, what the verdict was, and what action was taken.

**Pattern**: Every scan event becomes a structured, tamper-evident log entry.

### Fail Closed

When the scanner encounters an error, the default behavior should be to block, not to pass. A broken scanner is not a reason to skip security checks.

**Pattern**: `failClosed: true` in all Pompelmi adapter options.

---

## Reference Architecture

```
┌───────────────────────────────────────────────────────┐
│                      Client Layer                     │
│   Browser / Mobile / API Client                       │
└──────────────────────┬────────────────────────────────┘
                       │ multipart/form-data
┌──────────────────────▼────────────────────────────────┐
│                 Upload Gateway Service                │
│  - TLS termination                                    │
│  - Authentication / authorization checks             │
│  - File size limit enforcement                        │
│  - Rate limiting per user/IP                         │
└──────────────────────┬────────────────────────────────┘
                       │ Buffer in memory (no disk)
┌──────────────────────▼────────────────────────────────┐
│              In-Process Pompelmi Scanner              │
│  - Extension allowlist                                │
│  - Size check                                         │
│  - ZIP bomb detection (createZipBombGuard)           │
│  - Content heuristics (CommonHeuristicsScanner)       │
│  - Optional YARA rules                                │
│  - Emits structured audit events via onScanEvent      │
└──────────────────────┬────────────────────────────────┘
                       │ verdict: clean / suspicious / malicious
              ┌────────┴──────────┐
        'clean'                 'suspicious' or 'malicious'
              │                         │
┌─────────────▼──────────┐  ┌──────────▼──────────────┐
│  Staging Storage       │  │  Quarantine Storage      │
│  (temp, short TTL)     │  │  (isolated, audited)     │
└─────────────┬──────────┘  └──────────────────────────┘
              │
     [Async deep scan, optional]
     ClamAV / YARA / Manual review
              │
    ┌─────────▼──────────┐
    │  Permanent Storage │
    │  (authorized path) │
    └────────────────────┘
```

---

## Implementation: Multi-Stage Upload Pipeline

### Stage 1: Synchronous In-Process Scan (Express example)

```typescript
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const auditLogger = buildAuditLogger(); // your structured logger

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 500,
      maxTotalUncompressedBytes: 100 * 1024 * 1024,
      maxCompressionRatio: 50,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', timeoutMsPerScanner: 5000, tagSourceName: true }
);

const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'],
  maxFileSizeBytes: 25 * 1024 * 1024,
  stopOn: 'suspicious',
  failClosed: true,
  scanner,
  onScanEvent: (ev: unknown) => {
    const event = ev as Record<string, unknown>;

    // Log metadata only — never file content
    auditLogger.info({
      source: 'pompelmi',
      type: event.type,
      filename: event.filename ? hashFilename(event.filename as string) : undefined, // optionally pseudonymize
      verdict: event.verdict,
      matches: event.matches,
      durationMs: event.ms,
      timestamp: new Date().toISOString(),
    });
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.post('/api/upload',
  authenticate,   // verify user identity first
  authorize,      // check upload permission
  upload.single('file'),
  guard,
  handleCleanUpload,
);
```

### Stage 2: Quarantine for Suspicious Files

When `stopOn: 'suspicious'` would block too many benign files (e.g., during rollout), use a quarantine workflow instead:

```typescript
// Instead of blocking suspicious files immediately, quarantine them
const guard = createUploadGuard({
  stopOn: 'malicious', // only hard-block confirmed malicious
  failClosed: true,
  scanner,
  onScanEvent: (ev: unknown) => {
    const event = ev as Record<string, unknown>;
    if (event.type === 'end' && event.verdict === 'suspicious') {
      quarantineQueue.enqueue({
        filename: event.filename,
        userId: req.user.id,
        uploadId: req.uploadId,
        reason: event.matches,
        timestamp: new Date().toISOString(),
      });
    }
  },
});

// Quarantined files go to an isolated bucket
// A separate review process (automated or manual) promotes or rejects them
async function handleUpload(req: AuthenticatedRequest, res: Response) {
  const { verdict } = (req as any).pompelmi;

  if (verdict === 'suspicious') {
    // File is quarantined, user gets a "pending review" response
    await quarantineStorage.moveToQuarantine(req.file, req.user.id);
    return res.status(202).json({
      status: 'pending_review',
      message: 'Your file is being reviewed. You will be notified when processing is complete.',
    });
  }

  // Clean: move to permanent storage
  await permanentStorage.store(req.file, req.user.id);
  res.json({ ok: true, fileId: generateFileId() });
}
```

### Stage 3: Async Deep Scan (Optional)

For files that pass heuristics but warrant deeper analysis, enqueue an async job:

```typescript
// After Stage 1 passes and file is in staging storage
await jobQueue.push({
  type: 'deep_scan',
  fileId,
  storageKey: stagingKey,
  userId: req.user.id,
  uploadedAt: new Date().toISOString(),
});

// Worker (runs on your infrastructure, not cloud API)
async function deepScanWorker(job: DeepScanJob) {
  const fileBytes = await stagingStorage.read(job.storageKey);

  // Run ClamAV if available
  if (clamAvScanner) {
    const clamResult = await clamAvScanner.scan(fileBytes);
    if (clamResult.verdict !== 'clean') {
      await quarantine(job, clamResult);
      return;
    }
  }

  // Run YARA with organization-specific rules
  if (yaraScanner) {
    const yaraResult = await yaraScanner.scan(fileBytes);
    if (yaraResult.matches.length > 0) {
      await quarantine(job, yaraResult);
      return;
    }
  }

  // Promote to permanent storage
  await permanentStorage.move(job.storageKey);
  await notifyUser(job.userId, 'file_ready', job.fileId);
}
```

---

## Role-Based Upload Policies

Different users may have different upload permissions. Wire policies before the scanner:

```typescript
function getGuardForRole(role: 'patient' | 'provider' | 'admin') {
  const base = {
    maxFileSizeBytes: role === 'admin' ? 100 * 1024 * 1024 : 10 * 1024 * 1024,
    stopOn: 'suspicious' as const,
    failClosed: true,
    scanner,
  };

  switch (role) {
    case 'patient':
      return createUploadGuard({
        ...base,
        includeExtensions: ['pdf', 'jpg', 'jpeg', 'png'], // limited set
      });

    case 'provider':
      return createUploadGuard({
        ...base,
        includeExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'csv'],
      });

    case 'admin':
      return createUploadGuard({
        ...base,
        includeExtensions: ['pdf', 'jpg', 'png', 'docx', 'xlsx', 'csv', 'zip'],
      });
  }
}
```

---

## Audit Log Requirements

A compliant audit log entry should include:

```typescript
interface UploadAuditEntry {
  // Who
  userId: string;         // user or service account identifier
  sessionId?: string;     // session for correlation

  // What
  filename: string;       // hashed or pseudonymized in high-privacy contexts
  fileSize: number;       // bytes
  mimeType: string;       // declared MIME

  // When
  timestamp: string;      // ISO 8601

  // Result
  verdict: 'clean' | 'suspicious' | 'malicious';
  rules: string[];        // which rules fired
  action: 'accepted' | 'quarantined' | 'rejected';

  // Context
  ip?: string;            // hashed or omitted depending on jurisdiction
  userAgent?: string;
}
```

**Important**: Audit log entries should not contain file content. If your logging pipeline is compromised, you do not want uploaded files accessible via logs.

---

## Summary

Regulated environments demand that upload security is auditable, predictable, and private. Pompelmi's in-process scanning, structured `onScanEvent` callbacks, and `failClosed` semantics align with these requirements. The architecture pattern — synchronous heuristic scan → clean files to permanent storage, suspicious files to quarantine, rejected files blocked — provides a defensible, auditable pipeline.

**Important note**: This post describes technical architecture patterns, not legal or regulatory advice. Consult qualified privacy counsel and compliance professionals for HIPAA, GDPR, GLBA, and similar regulatory requirements specific to your jurisdiction and use case.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: Privacy-first upload security vs cloud scanning APIs](/pompelmi/blog/privacy-first-vs-cloud-scanning/)
- [Blog: Upload quarantine and review flows for suspicious files](/pompelmi/blog/upload-quarantine-review-flows/)
