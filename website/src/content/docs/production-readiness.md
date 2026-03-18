---
title: Production readiness
description: Practical checklist for evaluating and operating Pompelmi in production.
---

This page summarizes what teams can verify before adopting Pompelmi in production.

## Design intent

Pompelmi is designed as an upload gate in your request path. It is intended to reduce risk from untrusted file input before persistence or downstream processing.

It is not positioned as a full endpoint protection platform.

## Evidence available in this repository

- Public source code for scanner logic and adapters.
- Public tests under `tests/`.
- Security disclosure policy in `SECURITY.md`.
- Example integrations under `examples/`.
- Changelog and release history.

## Security boundaries

Pompelmi validates file bytes and metadata you provide. Your application remains responsible for:

- Authentication and authorization.
- Storage ACLs and object lifecycle.
- Encryption and key management.
- Incident response and alert routing.
- Regulatory interpretation and policy governance.

## Recommended deployment pattern

1. Receive upload to memory buffer when feasible.
2. Scan with strict policy defaults and `failClosed: true`.
3. Block malicious verdicts immediately.
4. Route suspicious files to quarantine for review.
5. Persist only approved files to durable storage.
6. Emit structured scan events to your logs/metrics pipeline.

## Operational checks before rollout

- Verify endpoint-specific allowlists for MIME and extension.
- Set conservative file-size and archive-depth limits.
- Confirm timeout behavior under load.
- Decide policy for scanner errors and timeouts.
- Validate that logs do not include sensitive raw payload data.
- Exercise a quarantine review workflow.

## Ongoing operations

- Track verdict distribution and false-positive trends.
- Reassess policy after product feature changes.
- Re-test with representative file corpora after upgrades.
- Review threat model assumptions quarterly or after major architecture changes.

## Related docs

- [Threat model and architecture](./explaination/architecture/)
- [Support options](./support/)
- [Commercial and enterprise engagements](./enterprise/)
