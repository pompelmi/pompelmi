---
title: Pompelmi Enterprise
description: SIEM-compatible audit logs, HMAC-signed tamper-evident records, premium YARA rules, Prometheus metrics, and an embedded Web GUI dashboard — layered on top of the open-source core. Built for compliance, security operations, and production-grade observability.
---

Pompelmi is open-source, MIT-licensed, and always will be. **Pompelmi Enterprise** is an optional commercial plugin (`@pompelmi/enterprise`) that adds the compliance evidence, live observability, and operational tooling that engineering teams in regulated industries need — without replacing a single line of your existing implementation.

`PompelmiEnterprise.create()` wraps your scanner once. Your framework adapters, YARA rules, quarantine workflows, and policy packs keep working unchanged.

---

## Who this is for

### CISOs and compliance leads

Your SOC 2, HIPAA, ISO 27001, or PCI-DSS audit requires a tamper-evident, structured log of every file your platform processed — who uploaded it, when it was scanned, what verdict was reached, and what action was taken. The Enterprise audit module produces exactly that, optionally signed with HMAC-SHA256 so tampering is detectable, in a format your SIEM can ingest on day one.

### Security engineers and detection teams

You already have Grafana. You already have Prometheus. Enterprise exposes a `/metrics` endpoint that sends blocked-file counts, YARA hit rates by threat category, scan latency (avg and p95), and error rates directly into your existing dashboards — no custom instrumentation, no third-party agents.

### Lead developers and platform teams

You want a low-friction way to give stakeholders visibility into what your upload pipeline is blocking — without building a reporting UI from scratch. Enterprise ships an embedded, zero-config web dashboard served from your existing process. Open a browser, see your scan activity in real time. Nothing to deploy.

---

## Architecture

`PompelmiEnterprise` is a thin orchestrator. Call `create()` once, then `injectInto(scanner)` — everything else is automatic.

```
PompelmiEnterprise.create()
│
├── LicenseValidator   — verifies Polar.sh key at startup, re-checks every 24h
├── AuditLogger        — HMAC-signed NDJSON → file / webhook / console
├── YaraPremium        — 5 curated YARA rules loaded into the core scanner
├── PrometheusMetrics  — in-memory counters / gauges exposed as /metrics
└── DashboardServer    — embedded HTTP server serving the live Web Dashboard
```

Every `scan:start`, `scan:threat`, `scan:complete`, and `scan:error` event emitted by the Pompelmi core is automatically captured and routed to the logger and metrics engine — no manual instrumentation required.

---

## Installation

```bash
npm install @pompelmi/enterprise
```

Requires Node.js ≥ 18 and an active [Enterprise license](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn).

---

## Quick Start

```js
import Pompelmi from 'pompelmi';
import { PompelmiEnterprise } from '@pompelmi/enterprise';

const enterprise = await PompelmiEnterprise.create({
  licenseKey: process.env.POMPELMI_LICENSE_KEY,
  dashboard:  { enabled: true, port: 3742 },
});

const scanner = new Pompelmi();
enterprise.injectInto(scanner); // loads premium YARA rules + hooks all scan events

const results = await scanner.scan('/srv/uploads');
// → threats automatically logged to ./pompelmi-audit/audit-YYYY-MM-DD.ndjson
// → metrics available at http://localhost:3742/metrics
// → live dashboard at  http://localhost:3742
```

---

## Configuration

### `PompelmiEnterprise.create(options)`

```js
const enterprise = await PompelmiEnterprise.create({
  // Required
  licenseKey: process.env.POMPELMI_LICENSE_KEY,

  // Audit Logger
  auditLogger: {
    sinks:      ['file', 'webhook', 'console'],
    logDir:     '/var/log/pompelmi',
    hmac:       true,
    hmacSecret: process.env.AUDIT_HMAC_SECRET,
    webhookUrl: process.env.SIEM_WEBHOOK_URL,
  },

  // Web Dashboard
  dashboard: {
    enabled: true,       // auto-start standalone server (default: false)
    port:    3742,       // default: 3742
    host:    '0.0.0.0', // default: '0.0.0.0'
  },
});
```

---

## Features

### 1. Advanced Audit Logger

Every scan lifecycle event is written as a structured, newline-delimited JSON (NDJSON) record. Each entry carries a full context payload — file path, SHA-256, matched rules, scan duration — and can optionally be signed with HMAC-SHA256 to detect tampering.

**Sinks:**

| Sink | Description |
|---|---|
| `'file'` (default) | Daily rolling files in `logDir` → `audit-YYYY-MM-DD.ndjson` |
| `'console'` | Formatted output to stdout (useful in development) |
| `'webhook'` | Fire-and-forget POST to a SIEM / log aggregator endpoint |

Multiple sinks can be active simultaneously.

**Log entry shape:**

```json
{
  "timestamp": "2026-03-13T14:22:01.443Z",
  "event": "threat_detected",
  "version": "1",
  "filePath": "/srv/uploads/payload.exe",
  "sha256": "e3b0c44298fc1c149afb",
  "matchedRules": ["pompelmi_wannacry", "pompelmi_cobalt_strike_beacon"],
  "severity": "critical",
  "_sig": "a3f9d2...c8b1"
}
```

The format is compatible with Splunk, Elastic SIEM, Microsoft Sentinel, Datadog, and any SIEM that ingests NDJSON or structured syslog.

**Audit logger options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `sinks` | `string[]` | `['file']` | Active output sinks |
| `logDir` | `string` | `'./pompelmi-audit'` | Directory for rolling log files |
| `hmac` | `boolean` | `true` | Sign each entry with HMAC-SHA256 |
| `hmacSecret` | `string` | — | Required when `hmac: true` |
| `webhookUrl` | `string` | — | Required when `'webhook'` is in sinks |

**Querying logs:**

```js
// Returns all threat entries from all on-disk log files
const threats = await enterprise.auditLogger.query(
  (entry) => entry.event === 'threat_detected' && entry.severity === 'critical'
);
```

---

### 2. Premium YARA Rules

A curated, production-hardened rule set loaded into the core scanner automatically by `injectInto()`. Rules are sourced from internal research and vetted threat-intelligence feeds.

| ID | Name | Category | Severity |
|---|---|---|---|
| `pmp-r001` | WannaCry Ransomware Family | ransomware | critical |
| `pmp-r002` | Cobalt Strike Beacon Detection | apt | critical |
| `pmp-r003` | XMRig Crypto-Miner | miner | high |
| `pmp-r004` | Mimikatz Credential Dumper | apt | critical |
| `pmp-r005` | Suspicious PowerShell LOLBAS | lolbas | medium |

**Manual access:**

```js
// All rules
const rules = enterprise.yaraPremium.getRules();

// Filtered (ransomware only)
const ransomware = enterprise.yaraPremium.getRules({ category: 'ransomware' });

// Combined YARA source string — load into any YARA-compatible tool
const yaraSource = enterprise.yaraPremium.getRuleSource();

// Specific rule by ID
const r = enterprise.yaraPremium.getRuleById('pmp-r002');
```

---

### 3. Prometheus Metrics

An in-memory metrics engine with zero external dependencies. Feed its `/metrics` output directly into Prometheus and visualize in Grafana.

**Exposed metric families:**

| Metric | Type | Description |
|---|---|---|
| `pompelmi_scans_total` | counter | Total scans initiated |
| `pompelmi_scans_clean_total` | counter | Scans with zero threats |
| `pompelmi_threats_total` | counter | Individual threats detected |
| `pompelmi_blocked_files_total` | counter | Total blocked files |
| `pompelmi_yara_hits_total{category="…"}` | counter | YARA hits labelled by threat category |
| `pompelmi_scan_latency_avg_ms` | gauge | Rolling average latency (ms) |
| `pompelmi_scan_latency_p95_ms` | gauge | P95 latency over last 1,000 scans |
| `pompelmi_uptime_seconds` | gauge | Seconds since module initialisation |

**Exposing via Express:**

```js
app.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(enterprise.metrics.export());
});
```

**JSON snapshot (for custom dashboards):**

```js
const snap = enterprise.metrics.snapshot();
// {
//   totalScans: 1024, cleanScans: 1012, threatsDetected: 12, blockedFiles: 12,
//   avgLatencyMs: 38, p95LatencyMs: 91,
//   yaraHitsByCategory: { ransomware: 3, apt: 6, miner: 3 },
//   uptimeMs: 86400000, lastScanAt: '2026-03-13T14:22:01.443Z',
//   recentThreats: [ … ]   // last 20 entries
// }
```

---

### 4. Embedded Web Dashboard

A self-contained dark-mode security dashboard served by an embedded Node.js HTTP server — no build step, no bundler, no extra process. Frontend assets are delivered via CDN (Tailwind CSS + Chart.js).

**Dashboard UI includes:**

- **Stat cards** — Total Scans, Clean, Blocked, Avg/P95 Latency
- **YARA distribution chart** — doughnut chart of hits by threat category
- **System health panel** — uptime, live threat count, last scan time
- **Blocked files table** — live feed of recent threats with severity badges, category pills, truncated SHA-256, and matched rule names
- **Auto-refresh** — polls `/api/status` every 5 seconds

**Mode 1 — Standalone server (own port):**

```js
// Auto-start via create() options
const enterprise = await PompelmiEnterprise.create({
  licenseKey: process.env.POMPELMI_LICENSE_KEY,
  dashboard:  { enabled: true, port: 3742 },
});
// → http://localhost:3742

// Or start manually
await enterprise.dashboard.start(3742);
```

**Mode 2 — Middleware (share your app's port):**

```js
// Express
app.use('/security', enterprise.dashboard.middleware('/security'));
// → http://localhost:4000/security

// Fastify (via middie or @fastify/express)
fastify.use('/security', enterprise.dashboard.middleware('/security'));
```

**HTTP routes served by the dashboard:**

| Route | Content-Type | Description |
|---|---|---|
| `GET /` | `text/html` | Live Web Dashboard |
| `GET /metrics` | `text/plain; version=0.0.4` | Prometheus scrape endpoint |
| `GET /api/status` | `application/json` | Metrics snapshot (polled by dashboard) |

---

## Free vs. Enterprise

| Capability | Core (Free, MIT) | Enterprise |
|---|:---:|:---:|
| In-process file scanning | ✅ | ✅ |
| Magic-byte MIME sniffing | ✅ | ✅ |
| ZIP bomb & archive guards | ✅ | ✅ |
| Heuristic scanner | ✅ | ✅ |
| YARA engine adapter | ✅ | ✅ |
| `composeScanners` pipeline | ✅ | ✅ |
| Framework adapters | ✅ | ✅ |
| Quarantine workflow | ✅ | ✅ |
| Scan hooks & `onScanEvent` | ✅ | ✅ |
| Policy packs | ✅ | ✅ |
| React / browser scanner hook | ✅ | ✅ |
| **Advanced Audit Logging (SIEM-compatible)** | — | ✅ |
| **HMAC-signed tamper-evident log entries** | — | ✅ |
| **File / Webhook / Console log sinks** | — | ✅ |
| **On-disk audit log query API** | — | ✅ |
| **Premium YARA Rules** (Ransomware / APT / Miner / LOLBAS) | — | ✅ |
| **Prometheus Metrics endpoint** | — | ✅ |
| **Embedded Web GUI Dashboard** | — | ✅ |
| **Priority email support** | — | ✅ |
| **Response SLA** | — | ✅ |
| **License** | MIT | Commercial |

---

## Pricing

Pompelmi Enterprise is **$49.99/month** per organization — unlimited nodes, unlimited scans, unlimited seats.

No per-node fees. No per-scan metering. One subscription covers your entire deployment.

**Includes:**

- `@pompelmi/enterprise` npm package access
- All four enterprise modules (audit, YARA rules, metrics, dashboard)
- Future feature releases at no additional cost
- Priority email support with a 1 business-day response SLA
- License for use in any number of production environments within your organization

<div align="center" style="margin: 2rem 0">

[![Get Pompelmi Enterprise — $49.99/mo](https://img.shields.io/badge/Get%20Pompelmi%20Enterprise-%2449.99%2Fmo-0a7ea4?style=for-the-badge)](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn)

</div>

Subscriptions are managed through [Polar.sh](https://polar.sh). You will receive your npm token and license key immediately after checkout. Cancel anytime.

> **Volume pricing** for multi-subsidiary enterprises or MSPs is available. Email [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com) with your organization name and deployment scale.

---

## Environment Variables

| Variable | Required | Description |
|---|:---:|---|
| `POMPELMI_LICENSE_KEY` | **Yes** | Your Polar.sh license key |
| `AUDIT_HMAC_SECRET` | No | 32+ char secret for HMAC-SHA256 audit signatures |
| `SIEM_WEBHOOK_URL` | No | Endpoint for real-time threat event forwarding |

---

## Graceful Shutdown

`enterprise.close()` flushes the audit log file stream and stops the standalone dashboard server. Call it on process exit to avoid truncated log writes.

```js
process.on('SIGTERM', async () => {
  await enterprise.close();
  process.exit(0);
});
```

---

## License Errors

`PompelmiEnterprise.create()` throws typed errors that you can catch and handle:

```js
import {
  PompelmiEnterprise,
  LicenseError,
  LicenseExpiredError,
  LicenseRevokedError,
  LicenseNetworkError,
} from '@pompelmi/enterprise';

try {
  const enterprise = await PompelmiEnterprise.create({ licenseKey: '...' });
} catch (err) {
  if (err instanceof LicenseRevokedError)  { /* key was revoked */ }
  if (err instanceof LicenseExpiredError)  { /* subscription lapsed */ }
  if (err instanceof LicenseNetworkError)  { /* can't reach license server */ }
  if (err instanceof LicenseError)         { /* invalid key / other */ }
}
```

The license is silently re-validated every 24 hours in the background. The timer is `unref()`-ed so it will not keep the Node process alive.

---

## FAQ

**Does Enterprise replace or fork the open-source core?**
No. Enterprise is a wrapper package that depends on the open-source `pompelmi` core. It adds no replacement scanning logic. The MIT-licensed core continues to receive updates regardless of Enterprise adoption.

**Does the dashboard or audit logger send data anywhere?**
Never. All Enterprise modules operate entirely in-process. Audit logs are written to your configured file path, stdout, or a webhook you control. The metrics endpoint and dashboard are served from within your own process. No data leaves your infrastructure.

**Can I use Enterprise in Docker / Kubernetes?**
Yes. The audit module writes to stdout or a file path you control. The metrics endpoint integrates with any Prometheus scrape config. The dashboard binds to a configurable host and port. All standard deployment patterns work without modification.

**What happens if I cancel my subscription?**
Your existing build continues to work until you update the package. The Enterprise module will log a license warning after the grace period. The `pompelmi` core and all open-source features remain fully functional indefinitely.

**Is there a free trial?**
A 14-day trial is available. Email [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com) to request access.

**What Node.js versions are supported?**
Node.js 18 and above — matching the open-source core requirement.
