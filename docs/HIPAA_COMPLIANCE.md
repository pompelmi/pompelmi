# HIPAA-Oriented Deployment Guidance

## Scope

This document describes technical patterns in Pompelmi that can help teams operating in privacy-sensitive environments, including healthcare.

It does not constitute legal advice or a compliance certification.

## What Pompelmi can help with

Pompelmi can support internal control objectives for file-upload risk reduction by providing:

- In-process scanning with no required cloud transfer in the scan path.
- Deterministic upload verdicts (`clean`, `suspicious`, `malicious`).
- Structured event data that can be logged by the application.
- Policy-driven rejection and quarantine patterns.

These capabilities can assist compliance programs, but they are only one part of a broader governance and security model.

## Important boundaries

Pompelmi does not by itself provide:

- HIPAA certification.
- Organization-wide access controls.
- Full audit governance and retention policy.
- Business associate agreement handling.
- Legal interpretation of regulatory obligations.

Those responsibilities remain with the adopting organization.

## Recommended controls around Pompelmi

For healthcare or other regulated contexts, combine Pompelmi with:

1. Strict endpoint-level file policy (size, type, and fail-closed behavior).
2. Quarantine workflow for non-clean verdicts.
3. Centralized logging with retention and access controls.
4. Encryption at rest and in transit for upload and storage systems.
5. Least-privilege access to upload and quarantine stores.
6. Incident response workflow tied to suspicious/malicious scan events.

## Operational checklist

- Set `failClosed: true` for production endpoints.
- Keep uploaded bytes out of logs.
- Sanitize metadata included in audit events.
- Review policy exceptions with security stakeholders.
- Re-test scanner behavior after dependency upgrades.

## Documentation links

- [Threat model and architecture](https://pompelmi.github.io/pompelmi/explaination/architecture/)
- [Production-readiness notes](https://pompelmi.github.io/pompelmi/production-readiness/)
- [Security policy](https://github.com/pompelmi/pompelmi/blob/main/SECURITY.md)

## Disclaimer

Pompelmi is a technical control for upload risk reduction. Compliance outcomes depend on your full organizational program, including legal, administrative, and operational controls.
