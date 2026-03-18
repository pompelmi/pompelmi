---
title: '@pompelmi/enterprise'
description: Enterprise options for teams that need advanced auditability, premium rules, or rollout support alongside the open-source core.
---

The open-source Pompelmi core remains the primary path. `@pompelmi/enterprise` is the licensed add-on for teams that need stronger operational visibility, incident-response tooling, or commercial rollout support.

The MIT-licensed core remains public. The enterprise package adds higher-assurance features without changing the local-first model: scanning still runs inside your infrastructure.

## What it adds

- Advanced audit logging with structured events and tamper-evident signing.
- Premium YARA rule packs for higher-signal detections.
- Prometheus metrics for monitoring and alerting.
- Embedded dashboard for local visibility and review.
- Priority enterprise support for rollout and production blockers.

## Open source vs enterprise

| Feature | Open source core | `@pompelmi/enterprise` |
| --- | --- | --- |
| In-process scanning | Yes | Yes |
| Magic-byte validation and heuristics | Yes | Yes |
| Local-first, no required cloud API | Yes | Yes |
| Advanced audit logging | No | Yes |
| Tamper-evident signed logs | No | Yes |
| Premium YARA rules | No | Yes |
| Prometheus metrics | No | Yes |
| Embedded dashboard | No | Yes |
| Priority support | No | Yes |

## Open source core

- In-process scanning APIs and policy packs.
- Framework adapters.
- Quarantine and audit utilities.
- Public docs, examples, issues, and discussions.

## Installation

```bash
npm install @pompelmi/enterprise
```

Requires Node.js 18+ and an active enterprise license.

## Best fit

- Teams handling sensitive document workflows.
- Platform teams standardizing upload controls across services.
- Security teams that need stronger observability and response tooling.
- Organizations that want a licensed add-on plus priority support.

## Evaluation and licensing

- License options: [Purchase or evaluate a license](https://buy.polar.sh/polar_cl_sTQdCkfdsz6D0lyLRIKKB7MJCnmBm6mfsOmTr2l2fqn)
- Email: [pompelmideveloper@yahoo.com](mailto:pompelmideveloper@yahoo.com)
- Include: stack, version, expected traffic profile, and timeline.

## Rollout support

Licensed teams can also use the enterprise path for:

- Private rollout guidance.
- Architecture and threat-model review.
- Policy tuning for real traffic patterns.
- Troubleshooting for production blockers.

If your request can be public, prefer GitHub Discussions first so the answer helps others.
