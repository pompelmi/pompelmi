---
title: "Reason Codes, Metrics, and Security Observability for File Uploads"
description: "Turn Pompelmi's onScanEvent callbacks into structured metrics, alerts, and dashboards. Learn how reason codes make security incidents actionable instead of opaque."
pubDate: 2024-09-15
author: "Pompelmi Team"
tags: ["observability", "metrics", "security", "logging", "nodejs"]
---

# Reason Codes, Metrics, and Security Observability for File Uploads

Blocking a malicious upload is step one. Understanding *why* it was blocked, *how often* it happens, *which users* trigger it, and *whether your thresholds are calibrated correctly* — that's security observability. Without it, you're flying blind.

**TL;DR:** Every Pompelmi guard accepts an `onScanEvent` callback that emits structured events throughout the scan lifecycle. Use these to build per-scanner metrics, fire alerts on severity thresholds, and populate dashboards that make your upload security posture visible.

---

## The ScanEvent Shape

All Pompelmi framework adapters (`@pompelmi/express-middleware`, `@pompelmi/koa-middleware`, `@pompelmi/fastify-plugin`) surface the same event structure through `onScanEvent`:

```typescript
type ScanEvent =
  | { type: 'start'; filename?: string; size?: number }
  | { type: 'end'; filename?: string; verdict: Verdict; matches: number; ms: number }
  | { type: 'blocked'; filename?: string; verdict: Verdict }
  | { type: 'error'; filename?: string; error: unknown }
  | { type: 'archive_start'; filename?: string }
  | { type: 'archive_entry'; archive?: string; entry: string; size?: number }
  | { type: 'archive_blocked'; archive?: string; entry: string; verdict: Verdict }
  | { type: 'archive_limit'; archive?: string; reason: 'max_entries' | 'max_total' | 'max_entry' | 'nested_zip' }
  | { type: 'archive_end'; filename?: string; entries: number; totalUncompressed: number };
```

Note: the exact event shape is exported from `@pompelmi/next-upload` (the most complete type definition). The express, koa, and fastify adapters use `onScanEvent: (ev: unknown) => void` — cast to your needs.

---

## Logging to Structured JSON

Start with structured logging. A JSON log entry per scan event gives you log aggregation, full-text search, and alerting for free in any log management system (Datadog, Loki, Elastic, CloudWatch).

```typescript
import { createUploadGuard } from '@pompelmi/express-middleware';
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const logger = console; // Replace with your pino/winston/bunyan logger

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({ maxEntries: 1000, maxCompressionRatio: 100 })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', timeoutMsPerScanner: 3000, tagSourceName: true }
);

const guard = createUploadGuard({
  includeExtensions: ['pdf', 'jpg', 'png', 'docx'],
  maxFileSizeBytes: 10 * 1024 * 1024,
  stopOn: 'suspicious',
  scanner,
  onScanEvent: (ev) => {
    const event = ev as Record<string, unknown>;

    switch (event.type) {
      case 'start':
        logger.info({
          event: 'scan_start',
          filename: event.filename,
          size: event.size,
        });
        break;

      case 'end':
        logger.info({
          event: 'scan_end',
          filename: event.filename,
          verdict: event.verdict,
          matches: event.matches,
          durationMs: event.ms,
        });
        break;

      case 'blocked':
        logger.warn({
          event: 'upload_blocked',
          filename: event.filename,
          verdict: event.verdict,
        });
        break;

      case 'error':
        logger.error({
          event: 'scan_error',
          filename: event.filename,
          error: String(event.error),
        });
        break;

      case 'archive_limit':
        logger.warn({
          event: 'archive_limit_hit',
          archive: event.archive,
          reason: event.reason,
        });
        break;
    }
  },
});
```

---

## Emitting Prometheus Metrics

If you're running a Node.js service with Prometheus, wire scan events into your metrics client directly:

```typescript
import { Counter, Histogram, register } from 'prom-client';

const scanCounter = new Counter({
  name: 'pompelmi_scans_total',
  help: 'Total file scans by verdict',
  labelNames: ['verdict'],
});

const scanDuration = new Histogram({
  name: 'pompelmi_scan_duration_ms',
  help: 'Time taken per file scan in ms',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000],
});

const blockedCounter = new Counter({
  name: 'pompelmi_uploads_blocked_total',
  help: 'Upload blocks by reason category',
  labelNames: ['reason'],
});

function onScanEvent(ev: unknown) {
  const event = ev as Record<string, unknown>;

  if (event.type === 'end') {
    scanCounter.labels(String(event.verdict)).inc();
    if (typeof event.ms === 'number') {
      scanDuration.observe(event.ms);
    }
  }

  if (event.type === 'blocked') {
    const verdict = String(event.verdict);
    blockedCounter.labels(verdict).inc();
  }

  if (event.type === 'archive_limit') {
    blockedCounter.labels(`archive_${event.reason}`).inc();
  }
}
```

Expose metrics at `/metrics`:

```typescript
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Understanding Reason Codes

When `composeScanners` is called with `tagSourceName: true`, each match includes `meta._sourceName` identifying which scanner in the chain produced it. Combined with the `rule` field, you get full traceability:

```typescript
// Example scan result match
{
  rule: 'pdf_risky_actions',
  severity: 'suspicious',
  meta: {
    tokens: ['/JavaScript', '/OpenAction'],
    _sourceName: 'heuristics',
  }
}
```

This tells you: the *heuristics* scanner fired the *pdf_risky_actions* rule, triggered by tokens `/JavaScript` and `/OpenAction`.

Use these reason codes to:
- **Alert on high-severity rules**: If `pe_executable` fires more than 5 times in an hour, that's worth a PagerDuty alert.
- **Tune thresholds**: If `office_ole_container` fires on every `.doc` upload from a known-safe user segment, consider increasing `stopOn` to `'malicious'` for that segment.
- **Build dashboards**: Track which rules fire most frequently over time to understand your threat landscape.

---

## Dashboard Design

A useful upload security dashboard includes:

**Scan volume**
- Scans per minute / hour
- Clean vs. suspicious vs. malicious breakdown (stacked bar)
- P95 scan duration (latency impact)

**Block reasons**
- Top 5 rules triggering blocks (table)
- Archive limit hits by reason (max_entries, max_total, nested_zip)

**Error rate**
- Scanner errors per minute (watchdog — spikes indicate misconfiguration or scanner load issues)

**Trend**
- 7-day rolling window of block rate (is it increasing? That may indicate active testing by attackers)

---

## Alerting Recommendations

| Signal | Alert threshold | Severity |
|---|---|---|
| `malicious` verdict | Any occurrence | P1 |
| `suspicious` verdict rate | > 5% of total scans | P2 |
| `scan_error` rate | > 1% of total scans | P2 |
| `archive_limit` hits | > 10/hour | P3 |
| Scan duration P95 | > 1000 ms | P3 |

These are starting points — adjust based on your upload volume and user base.

---

## Context Enrichment

The `onScanEvent` callback runs synchronously within your request handler. You have access to request context (user ID, IP, session) — add it to your events:

```typescript
// In your middleware wrapper:
const guard = createUploadGuard({
  // ...
  onScanEvent: (ev) => {
    // Enrich with request context via closure
    const enriched = {
      ...ev as object,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    auditLogger.info(enriched);
  },
});
```

This produces audit logs you can correlate with your application's access logs — useful for incident investigation.

---

## Report-Only Mode for Rollouts

During a gradual rollout, set `stopOn: 'malicious'` (block only confirmed threats) and use `onScanEvent` to log all `suspicious` hits. After a week of data, review the logs to calibrate whether `stopOn: 'suspicious'` is appropriate for your traffic:

```typescript
const guard = createUploadGuard({
  stopOn: 'malicious',    // Only hard-block malicious in report-only phase
  failClosed: false,       // Log scanner errors, don't block
  onScanEvent: (ev) => {
    const event = ev as Record<string, unknown>;
    if (event.type === 'end' && event.verdict === 'suspicious') {
      // Log for review but don't block
      auditQueue.push({ verdict: 'suspicious', filename: event.filename, matches: event.matches });
    }
  },
});
```

---

## Summary

`onScanEvent` transforms Pompelmi from a black-box blocker into an observable security component. Structured logging gives you searchable audit trails. Prometheus metrics give you alerting and dashboards. Reason codes with scanner names give you traceability back to the exact trigger. Together these make your upload security posture measurable and improvable — not just "on or off".

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: EICAR testing — verify your scanner works](/pompelmi/blog/eicar-testing-upload-scanners/)
- [Blog: Using Pompelmi in CI/CD](/pompelmi/blog/cicd-scan-build-artifacts/)
