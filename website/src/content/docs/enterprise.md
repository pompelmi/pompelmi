---
title: Pompelmi Enterprise
description: SIEM-compatible audit logs, Prometheus metrics, and an embedded Web GUI dashboard — layered on top of the open-source core. Built for compliance, security operations, and production-grade observability.
---

Pompelmi is open-source, MIT-licensed, and always will be. **Pompelmi Enterprise** is an optional commercial plugin (`@myusername/pompelmi-enterprise`) that adds the compliance evidence, live observability, and operational tooling that engineering teams in regulated industries need — without replacing a single line of your existing implementation.

It wraps your scan function. That's it. Your framework adapters, YARA rules, quarantine workflows, and policy packs keep working unchanged.

---

## Who this is for

### CISOs and compliance leads

Your SOC 2, HIPAA, ISO 27001, or PCI-DSS audit requires a tamper-evident, structured log of every file your platform processed — who uploaded it, when it was scanned, what verdict was reached, and what action was taken. The Enterprise audit module produces exactly that, in a format your SIEM can ingest on day one.

### Security engineers and detection teams

You already have Grafana. You already have Prometheus. Enterprise exposes a `/metrics` endpoint that sends blocked-file counts, YARA hit rates, scan latency histograms, and error rates directly into your existing dashboards — no custom instrumentation, no third-party agents.

### Lead developers and platform teams

You want a low-friction way to give stakeholders visibility into what your upload pipeline is blocking — without building a reporting UI from scratch. Enterprise ships an embedded, zero-config web dashboard served from your existing process. Open a browser, see your scan activity. Nothing to deploy.

---

## Features

### SIEM-Compatible Audit Logging

Every scan event, quarantine action, and resolution decision is written as a structured JSON line to your log destination of choice. Each record includes:

- `timestamp` — ISO 8601, UTC
- `event` — `scan.complete`, `scan.error`, `quarantine.created`, `quarantine.resolved`
- `verdict` — `clean`, `suspicious`, `malicious`
- `sha256` — content hash of the scanned bytes
- `filename`, `uploadedBy`, `sizeBytes`
- `matchCount`, `durationMs`, `engineVersion`
- `reviewedBy`, `reviewNote` (quarantine resolutions)

The format is compatible with Splunk, Elastic SIEM, Microsoft Sentinel, Datadog, and any SIEM that ingests NDJSON or structured syslog.

```ts
import { withEnterprise } from '@myusername/pompelmi-enterprise';

const scan = withEnterprise(scanBytes, {
  audit: {
    dest: 'file',
    path: '/var/log/pompelmi/audit.jsonl',
    // Or stream to stdout for log forwarders:
    // dest: 'stdout',
  },
});
```

Sample log record:

```json
{
  "timestamp": "2026-03-13T14:22:01.004Z",
  "event": "scan.complete",
  "verdict": "malicious",
  "sha256": "e3b0c44298fc1c149afb...",
  "filename": "invoice_final_v3.pdf",
  "uploadedBy": "user_7f3a91",
  "sizeBytes": 204800,
  "matchCount": 2,
  "durationMs": 38,
  "engineVersion": "0.34.0"
}
```

---

### Prometheus / Grafana Metrics

Expose a standard Prometheus-scrape endpoint with zero configuration. Metrics update in real time as files are scanned.

**Available metrics:**

| Metric | Type | Description |
|---|---|---|
| `pompelmi_scans_total` | Counter | Total scans by verdict (`clean`, `suspicious`, `malicious`) |
| `pompelmi_scan_duration_ms` | Histogram | Per-scan latency in buckets (p50, p95, p99) |
| `pompelmi_blocked_files_total` | Counter | Files blocked by verdict and scanner name |
| `pompelmi_yara_hits_total` | Counter | YARA rule matches by rule name |
| `pompelmi_quarantine_queue_size` | Gauge | Current number of files awaiting review |
| `pompelmi_errors_total` | Counter | Scanner errors by type |

```ts
import { withEnterprise } from '@myusername/pompelmi-enterprise';

const scan = withEnterprise(scanBytes, {
  metrics: {
    endpoint: '/metrics',   // Registers on your HTTP server
    prefix: 'pompelmi_',    // Optional metric prefix
  },
});
```

Add the scrape target to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'pompelmi'
    static_configs:
      - targets: ['your-app:3000']
    metrics_path: /metrics
```

Import the included Grafana dashboard JSON (`grafana/pompelmi-dashboard.json`) to get scan throughput, blocked file rate, and latency panels out of the box.

---

### Embedded Web GUI Dashboard

A real-time, zero-config web dashboard served from inside your existing Node.js process. No separate service, no external SaaS, no data egress.

**What you see at a glance:**

- Live scan feed with verdict, filename, and latency for every upload
- Blocked files timeline (last 24h / 7d / 30d)
- Top triggered YARA rules and heuristic flags
- Quarantine queue with one-click approve / reject actions
- System health (error rate, p99 latency, uptime)

```ts
import { withEnterprise } from '@myusername/pompelmi-enterprise';

const scan = withEnterprise(scanBytes, {
  dashboard: {
    port: 4000,
    // Optional: restrict to localhost only (default: true in production)
    host: '127.0.0.1',
    // Optional: basic auth for non-localhost access
    auth: { username: 'admin', password: process.env.DASHBOARD_PASSWORD },
  },
});
```

Open `http://localhost:4000` and your dashboard is live. All data is in-process — nothing is sent anywhere.

---

## Integration guide

Enterprise is a pure wrapper. You do not need to change your framework adapters, scanner composition, or policy configuration.

### Step 1 — Install

```bash
npm install @myusername/pompelmi-enterprise
```

### Step 2 — Wrap your scan function

```ts
// lib/security.ts  (your existing file)
import { scanBytes, composeScanners, CommonHeuristicsScanner } from 'pompelmi';
import { withEnterprise } from '@myusername/pompelmi-enterprise';

const baseScanner = composeScanners(
  [
    ['heuristics', CommonHeuristicsScanner],
    // ['yara', YourYaraScanner],
  ],
  { stopOn: 'suspicious', timeoutMsPerScanner: 1500 }
);

// Before Enterprise:
// export const scan = (bytes, opts) => scanBytes(bytes, { ...opts, scanner: baseScanner });

// After Enterprise — same signature, same behavior, enterprise features on top:
export const scan = withEnterprise(
  (bytes, opts) => scanBytes(bytes, { ...opts, scanner: baseScanner }),
  {
    audit:     { dest: 'file', path: '/var/log/pompelmi/audit.jsonl' },
    metrics:   { endpoint: '/metrics' },
    dashboard: { port: 4000 },
  }
);
```

### Step 3 — Nothing else changes

Your Express middleware, Next.js route handler, NestJS module, or Koa middleware continues to call `scan` exactly as before. Enterprise intercepts at the function boundary — framework adapters are unaware of it.

```ts
// app/api/upload/route.ts — unchanged
import { createNextUploadHandler } from '@pompelmi/next-upload';
import { scan } from '@/lib/security';  // ← now enterprise-enabled

export const runtime = 'nodejs';
export const POST = createNextUploadHandler({ scanner: scan, failClosed: true });
```

That's the entire integration.

---

## Free vs. Enterprise

| Capability | Core (Free, MIT) | Enterprise |
|---|---|---|
| In-process file scanning | ✅ | ✅ |
| Magic-byte MIME sniffing | ✅ | ✅ |
| ZIP bomb & archive guards | ✅ | ✅ |
| Heuristic scanner | ✅ | ✅ |
| YARA engine adapter | ✅ | ✅ |
| `composeScanners` pipeline | ✅ | ✅ |
| Framework adapters | ✅ | ✅ |
| Quarantine workflow | ✅ | ✅ |
| Basic NDJSON audit trail | ✅ | ✅ |
| Scan hooks & `onScanEvent` | ✅ | ✅ |
| Policy packs | ✅ | ✅ |
| React / browser scanner hook | ✅ | ✅ |
| **SIEM-structured audit logs** | — | ✅ |
| **Prometheus metrics endpoint** | — | ✅ |
| **Pre-built Grafana dashboard** | — | ✅ |
| **Embedded Web GUI dashboard** | — | ✅ |
| **Priority email support** | — | ✅ |
| **Response SLA** | — | ✅ |
| **License** | MIT | Commercial |

---

## Pricing

Pompelmi Enterprise is **$49.99/month** per organization — unlimited nodes, unlimited scans, unlimited seats.

No per-node fees. No per-scan metering. One subscription covers your entire deployment.

**Includes:**

- `@myusername/pompelmi-enterprise` npm package access
- All three enterprise modules (audit, metrics, dashboard)
- Future feature releases at no additional cost
- Priority email support with a 1 business-day response SLA
- License for use in any number of production environments within your organization

<div align="center" style="margin: 2rem 0">

[![Get Pompelmi Enterprise — $49.99/mo](https://img.shields.io/badge/Get%20Pompelmi%20Enterprise-%2449.99%2Fmo-0a7ea4?style=for-the-badge)](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn)

</div>

Subscriptions are managed through [Polar.sh](https://polar.sh). You will receive your npm token and license key immediately after checkout. Cancel anytime.

> **Volume pricing** for multi-subsidiary enterprises or MSPs is available. Email [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com) with your organization name and deployment scale.

---

## FAQ

**Does Enterprise replace or fork the open-source core?**
No. Enterprise is a wrapper package that depends on the open-source `pompelmi` core. It adds no replacement scanning logic. The MIT-licensed core continues to receive updates regardless of Enterprise adoption.

**Does the dashboard or audit logger send data anywhere?**
Never. All Enterprise modules operate entirely in-process. Audit logs are written to your configured file path or stdout. The metrics endpoint and dashboard are served from within your own process on localhost. No data leaves your infrastructure.

**Can I use Enterprise in Docker / Kubernetes?**
Yes. The audit module writes to stdout or a file path you control. The metrics endpoint integrates with any Prometheus scrape config. The dashboard binds to a configurable host and port. All standard deployment patterns work without modification.

**What happens if I cancel my subscription?**
Your existing build continues to work until you update the package. The Enterprise module will log a license warning after the grace period. The `pompelmi` core and all open-source features remain fully functional indefinitely.

**Is there a free trial?**
A 14-day trial is available. Email [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com) to request access.

**What Node.js versions are supported?**
Node.js 18 and above — matching the open-source core requirement.
