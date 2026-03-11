---
title: "Upload Quarantine and Review Flows for Suspicious Files"
description: "Build a quarantine-and-promote upload workflow: staging storage, async review queues, human-in-the-loop flows, and how to use Pompelmi's verdict system without overblocking."
pubDate: 2024-12-15
author: "Pompelmi Team"
tags: ["security", "quarantine", "workflows", "architecture", "nodejs"]
---

# Upload Quarantine and Review Flows for Suspicious Files

Hard-blocking on `suspicious` is the safest option for some applications. For others — file sharing platforms, content moderation queues, regulated document workflows — a file that might be suspicious is worth reviewing rather than silently discarding. A false positive on a clean business document is its own kind of failure.

This post covers the quarantine-and-promote pattern: accept the upload, route suspicious files to an isolated holding area, and provide a path to either promote them to permanent storage or reject them after review.

---

## The Verdict Spectrum

Pompelmi's scanner returns one of three verdicts:

| Verdict | Meaning | Recommended action |
|---------|---------|-------------------|
| `clean` | No malicious indicators found | Accept and store |
| `suspicious` | Anomalous indicators, not confirmed malicious | Quarantine and review |
| `malicious` | Confirmed malicious indicators | Block immediately |

For most applications, `malicious` should always be hard-blocked. The decision point is what to do with `suspicious`.

---

## Architecture: Staging → Quarantine → Permanent

```
Upload Request
     │
     ▼
┌──────────────────┐
│  Pompelmi Guard  │
│  (heuristics +   │
│   zip guard)     │
└────────┬─────────┘
         │
    ┌────┴─────────────┐
    │                  │
verdict='clean'  verdict='suspicious'   verdict='malicious'
    │                  │                       │
    ▼                  ▼                       ▼
┌────────┐      ┌────────────┐          ┌──────────┐
│Staging │      │ Quarantine │          │ Rejected │
│Storage │      │  Storage   │          │  (drop)  │
└───┬────┘      └────┬───────┘          └──────────┘
    │                │
    ▼                ▼
┌──────────┐   ┌───────────────────┐
│ Optional │   │  Review Queue     │
│Deep Scan │   │  (async job)      │
└───┬──────┘   └────────┬──────────┘
    │                   │
    ▼                   ▼
┌─────────────┐    ┌──────────────────┐
│  Permanent  │◄───│  Promote / Reject │
│   Storage   │    │  (auto or manual) │
└─────────────┘    └──────────────────┘
```

---

## Basic Implementation: Express

```typescript
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import {
  composeScanners,
  CommonHeuristicsScanner,
  createZipBombGuard,
} from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 500,
      maxTotalUncompressedBytes: 50 * 1024 * 1024,
      maxCompressionRatio: 50,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', tagSourceName: true }
);

const guard = createUploadGuard({
  includeExtensions: ['pdf', 'docx', 'xlsx', 'jpg', 'png'],
  maxFileSizeBytes: 20 * 1024 * 1024,
  stopOn: 'malicious', // only hard-block malicious — suspicious continues
  failClosed: true,
  scanner,
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload',
  authenticate,
  upload.single('file'),
  guard,
  async (req, res) => {
    const { verdict, matches } = (req as any).pompelmi;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    switch (verdict) {
      case 'clean': {
        const fileId = await stageAndPromote(req.file, req.user.id);
        return res.json({ ok: true, fileId, status: 'accepted' });
      }

      case 'suspicious': {
        const quarantineId = await quarantineFile(req.file, req.user.id, matches);
        return res.status(202).json({
          ok: false,
          status: 'pending_review',
          quarantineId,
          message: 'Your file is being reviewed. You will receive a notification when it is processed.',
        });
      }

      default:
        // malicious is blocked by the guard before reaching here
        return res.status(400).json({ error: 'File rejected' });
    }
  }
);
```

---

## Quarantine Storage Implementation

Quarantined files should be isolated from clean files:

```typescript
import { randomUUID } from 'crypto';
import path from 'path';

interface QuarantineRecord {
  id: string;
  storageKey: string;
  userId: string;
  originalName: string;
  fileSize: number;
  verdictReasons: string[];
  status: 'pending' | 'approved' | 'rejected';
  quarantinedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

async function quarantineFile(
  file: Express.Multer.File,
  userId: string,
  matches: unknown[],
): Promise<string> {
  const id = randomUUID();
  const storageKey = `quarantine/${id}`;

  // Store to isolated bucket/directory, separate from clean uploads
  await quarantineStorage.put(storageKey, file.buffer);

  const record: QuarantineRecord = {
    id,
    storageKey,
    userId,
    originalName: file.originalname,
    fileSize: file.size,
    verdictReasons: extractReasonCodes(matches),
    status: 'pending',
    quarantinedAt: new Date().toISOString(),
  };

  await db.quarantine.create(record);

  // Notify review team asynchronously
  await reviewQueue.enqueue({ quarantineId: id, urgency: 'normal' });

  return id;
}

function extractReasonCodes(matches: unknown[]): string[] {
  // Extract human-readable reason codes from scan matches
  return (matches as Array<{ rule?: string; reason?: string }>)
    .map(m => m.rule ?? m.reason ?? 'unknown')
    .filter(Boolean);
}
```

---

## Using `reportOnly` Mode in Next.js

The `@pompelmi/next-upload` adapter supports a `reportOnly` mode that lets the file through while recording what would have been blocked. This is useful for:

- Shadow-testing a stricter policy before enabling it
- Measuring false positive rates before tightening `stopOn`
- Rolling out quarantine logic without hard-blocking

```typescript
// app/api/upload/route.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({})],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious' }
);

export const POST = createNextUploadHandler({
  scanner,
  maxFileSizeBytes: 10 * 1024 * 1024,
  includeExtensions: ['pdf', 'jpg', 'png'],
  reportOnly: true, // scan and emit events but don't block
  onScanEvent: async (ev) => {
    // Record what WOULD have been blocked
    if (ev.type === 'end' && ev.verdict !== 'clean') {
      await shadowLog({
        filename: ev.filename,
        verdict: ev.verdict,
        matches: ev.matches,
        timestamp: new Date().toISOString(),
        wouldHaveBlocked: ev.verdict === 'malicious' || ev.verdict === 'suspicious',
      });
    }
  },
  async handler(req) {
    // In reportOnly mode, file always reaches here
    // You still have access to the scan result
    return Response.json({ ok: true, status: 'accepted' });
  },
});
```

After a week of shadow-mode data, switch `reportOnly: false` with confidence about your false positive rate.

---

## Review Queue Worker

The review queue processes quarantined files asynchronously:

```typescript
interface ReviewJob {
  quarantineId: string;
  urgency: 'normal' | 'high';
}

async function processReviewJob(job: ReviewJob) {
  const record = await db.quarantine.find(job.quarantineId);
  if (!record || record.status !== 'pending') return;

  const fileBytes = await quarantineStorage.get(record.storageKey);

  // Automated second-pass with more thorough scanners
  let autoDecision: 'approved' | 'rejected' | 'needs_human' = 'needs_human';

  if (clamAvEngine) {
    const clamResult = await clamAvEngine.scan(fileBytes);
    if (clamResult.verdict === 'malicious') autoDecision = 'rejected';
    else if (clamResult.verdict === 'clean') autoDecision = 'approved';
  }

  if (autoDecision === 'approved') {
    await promoteToPermanent(record);
    await notifyUser(record.userId, 'file_approved', record.id);
    return;
  }

  if (autoDecision === 'rejected') {
    await rejectQuarantined(record);
    await notifyUser(record.userId, 'file_rejected', record.id, record.verdictReasons);
    return;
  }

  // Needs human review — route to review dashboard
  await reviewDashboard.createTask({
    quarantineId: record.id,
    filename: record.originalName,
    size: record.fileSize,
    reasons: record.verdictReasons,
    uploadedAt: record.quarantinedAt,
    userId: record.userId,
  });
}
```

---

## Human Review Dashboard API

For quarantined files that require manual review, provide a secure internal API:

```typescript
// Internal review API — requires admin role
app.post('/internal/quarantine/:id/approve',
  requireAdminRole,
  async (req, res) => {
    const record = await db.quarantine.find(req.params.id);
    if (!record || record.status !== 'pending') {
      return res.status(404).json({ error: 'Not found or already processed' });
    }

    await promoteToPermanent(record);
    await db.quarantine.update(record.id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.id,
    });

    await notifyUser(record.userId, 'file_approved', record.id);
    await auditLog.write({ action: 'quarantine_approve', by: req.user.id, recordId: record.id });

    res.json({ ok: true });
  }
);

app.post('/internal/quarantine/:id/reject',
  requireAdminRole,
  async (req, res) => {
    const record = await db.quarantine.find(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });

    await quarantineStorage.delete(record.storageKey);
    await db.quarantine.update(record.id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.id,
    });

    await notifyUser(record.userId, 'file_rejected', record.id);
    await auditLog.write({ action: 'quarantine_reject', by: req.user.id, recordId: record.id });

    res.json({ ok: true });
  }
);
```

---

## Promoting Quarantined Files to Permanent Storage

When a file is approved — automatically or after human review — promote it securely:

```typescript
async function promoteToPermanent(record: QuarantineRecord) {
  const fileBytes = await quarantineStorage.get(record.storageKey);

  // Optional: do one final clean scan before promotion
  const { default: { scan } } = await import('@pompelmi/core');
  const result = await scan(fileBytes);
  if (result.verdict === 'malicious') {
    // Something changed between quarantine and promotion — reject
    await db.quarantine.update(record.id, { status: 'rejected' });
    throw new Error(`File ${record.id} failed final scan before promotion`);
  }

  const permanentKey = `uploads/${record.userId}/${randomUUID()}`;
  await permanentStorage.put(permanentKey, fileBytes);

  await db.files.create({
    id: randomUUID(),
    permanentKey,
    originalName: record.originalName,
    userId: record.userId,
    quarantineId: record.id,
    createdAt: new Date().toISOString(),
  });

  // Clean up quarantine storage
  await quarantineStorage.delete(record.storageKey);
}
```

---

## TTL and Retention for Quarantine Storage

Quarantined files should not stay forever. Set an expiry policy:

```typescript
// Cron job: expire old pending items
async function expireOldQuarantineEntries() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

  const expired = await db.quarantine.findMany({
    where: { status: 'pending', quarantinedAt: { lt: cutoff.toISOString() } },
  });

  for (const record of expired) {
    await quarantineStorage.delete(record.storageKey);
    await db.quarantine.update(record.id, { status: 'rejected' });
    await notifyUser(record.userId, 'file_expired', record.id);
    await auditLog.write({ action: 'quarantine_expire', recordId: record.id });
  }
}
```

---

## Key Decisions Summary

| Decision | Recommendation |
|----------|---------------|
| Block `malicious`? | Always. No exceptions. |
| Block `suspicious`? | Depends on risk appetite; quarantine is a good middle ground |
| Use `reportOnly` first? | Yes, during rollout to measure false positives |
| Automated second-pass? | Yes, with ClamAV or YARA if available |
| Human review needed? | For regulated contexts, or when auto-pass confidence is low |
| Quarantine TTL | 7 days default; shorter for high-volume, longer for critical decisions |
| Notify users? | Always — pending/approved/rejected status keeps trust high |

---

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [Blog: Reason codes and security observability](/pompelmi/blog/reason-codes-security-observability/)
- [Blog: Secure upload architecture for regulated industries](/pompelmi/blog/secure-upload-architecture-regulated-industries/)
- [Blog: Privacy-first scanning vs cloud APIs](/pompelmi/blog/privacy-first-vs-cloud-scanning/)
