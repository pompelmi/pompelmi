---
title: Pompelmi Enterprise
description: SIEM-compatible audit logs, HMAC-signed tamper-evident records, premium YARA rules, Prometheus metrics, and an embedded Web GUI dashboard. Built for compliance-driven engineering teams in regulated industries.
---

<p align="center" style="font-size:1.3rem;font-weight:600;margin:1.5rem 0 0.5rem">
  Everything the open-source core gives you,<br/>plus the compliance evidence your auditors will actually ask for.
</p>

<div align="center" style="margin:1.5rem 0">

[![Buy Enterprise License](https://img.shields.io/badge/Buy%20Enterprise%20License-Polar.sh-0a7ea4?style=for-the-badge)](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn)

</div>

---

Pompelmi is open-source, MIT-licensed, and always will be. **Pompelmi Enterprise** (`@pompelmi/enterprise`) is an optional commercial plugin that layers the compliance evidence, live observability, and operational tooling that regulated-industry engineering teams need — on top of the core they already use.

`PompelmiEnterprise.create()` wraps your scanner once. Your framework adapters, YARA rules, quarantine workflows, and policy packs keep working unchanged.

---

## What Enterprise solves

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin:1.5rem 0">

<div style="border:1px solid var(--sl-color-hairline);border-radius:8px;padding:1.25rem">
<strong>Your SOC 2 / HIPAA auditor asks for evidence</strong><br/><br/>
You need a tamper-evident, structured log of every file scanned — who uploaded it, when, what verdict was reached, what action was taken. Not a custom logging solution you built yourself.
</div>

<div style="border:1px solid var(--sl-color-hairline);border-radius:8px;padding:1.25rem">
<strong>Your security team wants dashboards, not log-grepping</strong><br/><br/>
Blocked-file counts, YARA hit rates by threat category, P95 scan latency — already in Grafana. Not a project to instrument, just an endpoint to add to your scrape config.
</div>

<div style="border:1px solid var(--sl-color-hairline);border-radius:8px;padding:1.25rem">
<strong>Stakeholders want visibility without a custom UI</strong><br/><br/>
A live security dashboard served from your existing process with zero deployment overhead. Open a browser, see what your upload pipeline is blocking in real time.
</div>

</div>

---

## Who Enterprise is for

### CISOs and compliance leads

Your SOC 2, HIPAA, ISO 27001, or PCI-DSS audit requires a tamper-evident, structured log of every file your platform processed. The Enterprise audit module produces exactly that — every event signed with HMAC-SHA256 so tampering is detectable, in a format your SIEM can ingest on day one.

**Compatible with:** Splunk, Elastic SIEM, Microsoft Sentinel, Datadog, and any SIEM that ingests NDJSON or structured syslog.

### Security engineers and detection teams

You already have Grafana. You already have Prometheus. Enterprise exposes a `/metrics` endpoint with blocked-file counts, YARA hit rates by threat category, scan latency (avg and p95), and error rates — wired to your existing dashboards from one scrape config line.

### Lead developers and platform teams

Enterprise ships an embedded, zero-config web dashboard served from your existing process. No build step, no extra deployment, no separate service. Mount it as Express/Fastify middleware or run it on its own port.

---

## Who can stay on the free core

Enterprise is not necessary for every use case. The **free MIT-licensed core** handles:

- Heuristic scanning, ZIP bomb protection, magic-byte MIME validation
- Custom YARA rules via `composeScanners`
- Quarantine workflow and audit trail (via the built-in `pompelmi/audit` module)
- Scan hooks for custom logging and metrics
- Policy packs for common upload scenarios

If you do not need SIEM-compatible signed logs, Prometheus metrics, premium YARA rules, or a built-in dashboard, the open-source core is sufficient.

---

## Installation

```bash
npm install @pompelmi/enterprise
```

Requires Node.js >= 18 and an active [Enterprise license](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn).

---

## Quick Start

Add Enterprise to your existing Pompelmi setup in ~10 lines:

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
// → threats logged to ./pompelmi-audit/audit-YYYY-MM-DD.ndjson
// → Prometheus metrics at  http://localhost:3742/metrics
// → live dashboard at      http://localhost:3742
```

Your existing scanner configuration, framework adapters, and business logic are unchanged.

---

## Architecture

`PompelmiEnterprise` is a thin orchestrator. Call `create()` once, then `injectInto(scanner)` — everything else is automatic.

```
PompelmiEnterprise.create()
│
├── LicenseValidator   — verifies Polar.sh key at startup, re-checks every 24h
├── AuditLogger        — HMAC-signed NDJSON → file / webhook / console
├── YaraPremium        — 5+ curated YARA rules loaded into the core scanner
├── PrometheusMetrics  — in-memory counters / gauges exposed as /metrics
└── DashboardServer    — embedded HTTP server serving the live Web Dashboard
```

Every `scan:start`, `scan:threat`, `scan:complete`, and `scan:error` event emitted by the core is automatically captured and routed to the logger and metrics engine — no manual instrumentation required.

---

## Features

### Advanced Audit Logger

Every scan lifecycle event is written as a structured NDJSON record with a full context payload — file path, SHA-256, matched rules, scan duration — optionally signed with HMAC-SHA256 to detect tampering. Roll the log daily. Query it programmatically.

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

**Output sinks:**

| Sink | Description |
|---|---|
| `'file'` (default) | Daily rolling files → `audit-YYYY-MM-DD.ndjson` |
| `'console'` | Formatted stdout — useful in development |
| `'webhook'` | Fire-and-forget POST to your SIEM / log aggregator |

Multiple sinks can be active simultaneously. Ingest directly into Splunk, Elastic SIEM, Microsoft Sentinel, or Datadog.

**Audit logger configuration:**

| Option | Type | Default | Description |
|---|---|---|---|
| `sinks` | `string[]` | `['file']` | Active output sinks |
| `logDir` | `string` | `'./pompelmi-audit'` | Directory for rolling log files |
| `hmac` | `boolean` | `true` | Sign each entry with HMAC-SHA256 |
| `hmacSecret` | `string` | — | Required when `hmac: true` |
| `webhookUrl` | `string` | — | Required when `'webhook'` is in sinks |

**Programmatic log queries:**

```js
// Returns all critical threat entries from on-disk log files
const threats = await enterprise.auditLogger.query(
  (entry) => entry.event === 'threat_detected' && entry.severity === 'critical'
);
```

---

### Premium YARA Rules

A curated, production-hardened rule set covering the most impactful threat categories. Rules are loaded into the core scanner automatically by `injectInto()`.

| ID | Name | Category | Severity |
|---|---|---|---|
| `pmp-r001` | WannaCry Ransomware Family | ransomware | critical |
| `pmp-r002` | Cobalt Strike Beacon Detection | apt | critical |
| `pmp-r003` | XMRig Crypto-Miner | miner | high |
| `pmp-r004` | Mimikatz Credential Dumper | apt | critical |
| `pmp-r005` | Suspicious PowerShell LOLBAS | lolbas | medium |

```js
// Filtered by category
const ransomware = enterprise.yaraPremium.getRules({ category: 'ransomware' });

// Combined YARA source string — load into any YARA-compatible tool
const yaraSource = enterprise.yaraPremium.getRuleSource();
```

---

### Prometheus Metrics

Zero external dependencies. Feed the `/metrics` output directly into Prometheus and visualize in your existing Grafana dashboards.

| Metric | Type | Description |
|---|---|---|
| `pompelmi_scans_total` | counter | Total scans initiated |
| `pompelmi_scans_clean_total` | counter | Scans with zero threats |
| `pompelmi_threats_total` | counter | Individual threats detected |
| `pompelmi_blocked_files_total` | counter | Total blocked files |
| `pompelmi_yara_hits_total{category="…"}` | counter | YARA hits by threat category |
| `pompelmi_scan_latency_avg_ms` | gauge | Rolling average scan latency |
| `pompelmi_scan_latency_p95_ms` | gauge | P95 latency over last 1,000 scans |
| `pompelmi_uptime_seconds` | gauge | Seconds since module initialisation |

```js
// Express endpoint
app.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(enterprise.metrics.export());
});

// JSON snapshot for custom dashboards
const snap = enterprise.metrics.snapshot();
// { totalScans, cleanScans, threatsDetected, blockedFiles,
//   avgLatencyMs, p95LatencyMs, yaraHitsByCategory, recentThreats }
```

---

### Embedded Web Dashboard

A self-contained dark-mode security dashboard served by an embedded Node.js HTTP server. No build step, no bundler, no separate deployment.

**Dashboard includes:**
- Stat cards: total scans, clean, blocked, avg/P95 latency
- YARA distribution chart: hits by threat category
- System health panel: uptime, live threat count, last scan time
- Blocked files table: live feed with severity badges, category pills, SHA-256, matched rule names
- Auto-refresh every 5 seconds

**Mode 1 — Standalone server (own port):**

```js
const enterprise = await PompelmiEnterprise.create({
  licenseKey: process.env.POMPELMI_LICENSE_KEY,
  dashboard:  { enabled: true, port: 3742 },
});
// → http://localhost:3742
```

**Mode 2 — Middleware (share your app's port):**

```js
// Express
app.use('/security', enterprise.dashboard.middleware('/security'));

// Fastify (via middie or @fastify/express)
fastify.use('/security', enterprise.dashboard.middleware('/security'));
```

| Route | Description |
|---|---|
| `GET /` | Live Web Dashboard |
| `GET /metrics` | Prometheus scrape endpoint |
| `GET /api/status` | JSON metrics snapshot |

---

## Free vs. Enterprise

| Capability | Open Source | Enterprise |
|---|:---:|:---:|
| YARA file scanning | ✅ | ✅ |
| Magic-bytes detection | ✅ | ✅ |
| ZIP bomb & archive guards | ✅ | ✅ |
| Heuristic scanner | ✅ | ✅ |
| `composeScanners` pipeline | ✅ | ✅ |
| Framework adapters | ✅ | ✅ |
| Quarantine workflow | ✅ | ✅ |
| Scan hooks & `onScanEvent` | ✅ | ✅ |
| Policy packs | ✅ | ✅ |
| React / browser scanner hook | ✅ | ✅ |
| Zero-cloud, fully local | ✅ | ✅ |
| **Advanced Audit Logging (SIEM-compatible)** | — | ✅ |
| **HMAC-signed tamper-evident log entries** | — | ✅ |
| **File / Webhook / Console log sinks** | — | ✅ |
| **On-disk audit log query API** | — | ✅ |
| **Premium YARA Rule Set** | — | ✅ |
| **Ransomware / APT / Miner / LOLBAS detections** | — | ✅ |
| **Prometheus `/metrics` endpoint** | — | ✅ |
| **Embedded Web Dashboard** | — | ✅ |
| **Priority support** | — | ✅ |
| **License** | MIT | Commercial |

---

## Pricing

<div style="border:2px solid #0a7ea4;border-radius:10px;padding:1.75rem;margin:1.5rem 0;max-width:520px">

### $49.99 / month per organization

**Unlimited** nodes · **Unlimited** scans · **Unlimited** seats

**What's included:**
- `@pompelmi/enterprise` npm package + all modules
- Advanced Audit Logger (file, webhook, console sinks)
- 5+ curated YARA rules (WannaCry, Cobalt Strike, XMRig, Mimikatz, LOLBAS)
- Prometheus metrics endpoint
- Embedded live security dashboard
- Priority email support — 1 business-day response SLA
- All future feature releases at no additional cost
- License for any number of production environments in your organization

<div style="margin-top:1.25rem">

[![Get Pompelmi Enterprise](https://img.shields.io/badge/Subscribe%20via%20Polar.sh-%2449.99%2Fmo-0a7ea4?style=for-the-badge)](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn)

</div>

</div>

Subscriptions are managed through [Polar.sh](https://polar.sh). Your npm token and license key are delivered immediately after checkout. Cancel anytime.

**Volume pricing** for multi-subsidiary enterprises or MSPs — email [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com?subject=Volume%20pricing).

---

## Full configuration reference

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

## Environment variables

| Variable | Required | Description |
|---|:---:|---|
| `POMPELMI_LICENSE_KEY` | **Yes** | Your Polar.sh license key |
| `AUDIT_HMAC_SECRET` | No | 32+ char secret for HMAC-SHA256 audit signatures |
| `SIEM_WEBHOOK_URL` | No | Endpoint for real-time threat event forwarding |

---

## Graceful shutdown

`enterprise.close()` flushes the audit log stream and stops the dashboard server. Call it on process exit to avoid truncated log writes.

```js
process.on('SIGTERM', async () => {
  await enterprise.close();
  process.exit(0);
});
```

---

## License error handling

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

The license is silently re-validated every 24 hours in the background. The timer is `unref()`-ed so it will not keep your Node process alive.

---

## FAQ

**Does Enterprise replace the open-source core?**
No. It is a wrapper package that depends on the open-source `pompelmi` core. The MIT-licensed core continues to receive updates regardless of Enterprise adoption.

**Does the dashboard or audit logger send data anywhere?**
Never. All Enterprise modules operate entirely in-process. Audit logs are written to your configured file path, stdout, or a webhook you control. The metrics endpoint and dashboard are served from within your own process.

**Can I use Enterprise in Docker or Kubernetes?**
Yes. The audit module writes to stdout or a configurable file path. The metrics endpoint integrates with any Prometheus scrape config. The dashboard binds to a configurable host and port. All standard deployment patterns work without modification.

**What happens if I cancel my subscription?**
Your existing build continues to work until you next update the package, at which point a license warning is logged. The `pompelmi` core and all open-source features remain fully functional indefinitely.

**What is the support SLA?**
Priority email support with a 1 business-day first-response target. All communication is private and asynchronous.

**What Node.js versions are supported?**
Node.js 18 and above — matching the open-source core requirement.

**Do you offer volume pricing?**
Yes — for multi-subsidiary enterprises or MSPs. Email [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com?subject=Volume%20pricing) with your organization name and deployment scale.
