---
title: Enterprise
outline: deep
---

# Pompelmi Enterprise

`@pompelmi/enterprise` is an optional commercial plugin that layers compliance, observability, and incident-response tooling on top of the open-source core — without touching your existing adapters, scanners, or policy configuration.

The MIT-licensed `pompelmi` core is always free. Enterprise is for teams that need production-grade audit trails, Prometheus metrics, and a live security dashboard.

[![Get Pompelmi Enterprise](https://img.shields.io/badge/Get%20Pompelmi%20Enterprise-%2449.99%2Fmo-0a7ea4?style=for-the-badge)](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn)

---

## What Enterprise adds

| Feature | Core (Free, MIT) | Enterprise |
|---|:---:|:---:|
| File scanning, heuristics, YARA | ✅ | ✅ |
| Framework adapters | ✅ | ✅ |
| Quarantine workflow & policy packs | ✅ | ✅ |
| **Advanced Audit Logging (SIEM-compatible)** | — | ✅ |
| **HMAC-signed tamper-evident log entries** | — | ✅ |
| **File / Webhook / Console log sinks** | — | ✅ |
| **On-disk audit log query API** | — | ✅ |
| **Premium YARA Rules** (Ransomware / APT / Miner / LOLBAS) | — | ✅ |
| **Prometheus Metrics endpoint** | — | ✅ |
| **Embedded Web GUI Dashboard** | — | ✅ |
| **Priority support & response SLA** | — | ✅ |

---

## Architecture

`PompelmiEnterprise` is a thin orchestrator. Call `create()` once, then `injectInto(scanner)`.

```
PompelmiEnterprise.create()
│
├── LicenseValidator   — verifies key at startup, re-checks every 24h
├── AuditLogger        — HMAC-signed NDJSON → file / webhook / console
├── YaraPremium        — 5 curated YARA rules loaded into the core scanner
├── PrometheusMetrics  — in-memory counters / gauges at /metrics
└── DashboardServer    — embedded HTTP server for the live Web Dashboard
```

Every `scan:start`, `scan:threat`, `scan:complete`, and `scan:error` event is automatically captured — no manual instrumentation required.

---

## Quick Start

```bash
npm install @pompelmi/enterprise
```

```js
import Pompelmi from 'pompelmi';
import { PompelmiEnterprise } from '@pompelmi/enterprise';

const enterprise = await PompelmiEnterprise.create({
  licenseKey: process.env.POMPELMI_LICENSE_KEY,
  auditLogger: { sinks: ['file'], hmac: true, hmacSecret: process.env.AUDIT_HMAC_SECRET },
  dashboard:   { enabled: true, port: 3742 },
});

const scanner = new Pompelmi();
enterprise.injectInto(scanner); // loads premium YARA rules + hooks all scan events

const results = await scanner.scan('/srv/uploads');
// → ./pompelmi-audit/audit-YYYY-MM-DD.ndjson
// → http://localhost:3742/metrics
// → http://localhost:3742  (dashboard)
```

---

## Configuration reference

```js
await PompelmiEnterprise.create({
  licenseKey: process.env.POMPELMI_LICENSE_KEY, // required

  auditLogger: {
    sinks:      ['file', 'webhook', 'console'], // one or more
    logDir:     '/var/log/pompelmi',            // for 'file' sink
    hmac:       true,                           // HMAC-SHA256 signing
    hmacSecret: process.env.AUDIT_HMAC_SECRET,  // required when hmac: true
    webhookUrl: process.env.SIEM_WEBHOOK_URL,   // required for 'webhook' sink
  },

  dashboard: {
    enabled: true,       // auto-start on its own port
    port:    3742,
    host:    '0.0.0.0',
  },
});
```

---

## Features

### Advanced Audit Logger

NDJSON records written on every scan lifecycle event. Each entry includes the file path, SHA-256, matched rules, scan duration, and an optional HMAC-SHA256 signature.

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

Compatible with Splunk, Elastic SIEM, Microsoft Sentinel, and Datadog.

**Querying logs:**

```js
const threats = await enterprise.auditLogger.query(
  (entry) => entry.event === 'threat_detected' && entry.severity === 'critical'
);
```

### Premium YARA Rules

Five curated, production-hardened rules loaded into the scanner automatically by `injectInto()`:

| ID | Name | Category | Severity |
|---|---|---|---|
| `pmp-r001` | WannaCry Ransomware Family | ransomware | critical |
| `pmp-r002` | Cobalt Strike Beacon Detection | apt | critical |
| `pmp-r003` | XMRig Crypto-Miner | miner | high |
| `pmp-r004` | Mimikatz Credential Dumper | apt | critical |
| `pmp-r005` | Suspicious PowerShell LOLBAS | lolbas | medium |

```js
enterprise.yaraPremium.getRules();                          // all rules
enterprise.yaraPremium.getRules({ category: 'ransomware' }); // filtered
enterprise.yaraPremium.getRuleById('pmp-r002');              // by ID
enterprise.yaraPremium.getRuleSource();                      // raw YARA source
```

### Prometheus Metrics

Zero external dependencies. Feed `/metrics` directly into Prometheus.

| Metric | Type | Description |
|---|---|---|
| `pompelmi_scans_total` | counter | Total scans initiated |
| `pompelmi_threats_total` | counter | Individual threats detected |
| `pompelmi_blocked_files_total` | counter | Total blocked files |
| `pompelmi_yara_hits_total{category}` | counter | YARA hits by threat category |
| `pompelmi_scan_latency_avg_ms` | gauge | Rolling average latency |
| `pompelmi_scan_latency_p95_ms` | gauge | P95 latency over last 1,000 scans |
| `pompelmi_uptime_seconds` | gauge | Uptime since initialisation |

```js
// Express
app.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(enterprise.metrics.export());
});
```

### Embedded Web Dashboard

Dark-mode dashboard served from inside your existing Node.js process. Stat cards, YARA distribution chart, blocked files table, and auto-refresh every 5 seconds.

**Standalone (own port):**

```js
// via create() options — dashboard: { enabled: true, port: 3742 }
// or manually:
await enterprise.dashboard.start(3742);
```

**As middleware (share your app's port):**

```js
app.use('/security', enterprise.dashboard.middleware('/security'));
```

Routes served: `GET /` (HTML), `GET /metrics` (Prometheus), `GET /api/status` (JSON snapshot).

---

## Graceful shutdown

```js
process.on('SIGTERM', async () => {
  await enterprise.close();
  process.exit(0);
});
```

---

## License errors

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

---

## Pricing

**$49.99/month** per organization — unlimited nodes, unlimited scans, unlimited seats.

Includes all four enterprise modules, future feature releases, and priority email support with a 1 business-day response SLA.

> Volume pricing for multi-subsidiary enterprises or MSPs is available. Email [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com).
