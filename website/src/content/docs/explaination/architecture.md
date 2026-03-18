---
title: Architecture and threat model
description: Security boundaries, attacker model, and deployment assumptions for Pompelmi.
---

This document explains what Pompelmi is designed to defend against, where the boundary stops, and how to deploy it responsibly.

## System model

Pompelmi runs in your Node.js process and evaluates uploaded file bytes before your application commits them to durable storage or downstream services.

Typical request flow:

1. App receives multipart upload.
2. App passes bytes and metadata to scanner.
3. Scanner returns structured report.
4. App decides to accept, quarantine, or reject.

## Attacker model

Assume an attacker can control:

- Uploaded file content.
- Filename and extension.
- Declared MIME type.
- Upload volume and timing patterns.
- Archive structure (depth, entry count, crafted paths).

Assume the attacker cannot directly control:

- Your server runtime configuration.
- Internal scanner policy values.
- Storage ACLs unless separately misconfigured.

## Controls provided by Pompelmi

- Policy checks for size, extension, and MIME constraints.
- Magic-byte detection for content-type mismatch.
- Heuristic checks for suspicious payload structures.
- Archive-oriented controls for ZIP abuse patterns.
- Optional YARA rule evaluation.
- Structured report output for operational handling.

## Threats reduced

Pompelmi is primarily aimed at reducing risk from:

- Disguised executables and mismatched file types.
- Archive bombs and abusive nested archives.
- Common polyglot and script-bearing upload patterns.
- Policy bypass attempts using metadata spoofing.

## Out of scope

Pompelmi does not guarantee detection of:

- Novel malware with no matching heuristic or signature.
- Encrypted archives where content cannot be inspected.
- Business-logic abuse unrelated to file contents.
- Post-upload execution risk if your platform later executes stored files.

## Why in-process scanning

In-process scanning is a deliberate tradeoff:

- Keeps scan path inside your infrastructure by default.
- Removes external network dependency from upload gate decisions.
- Simplifies local development and integration.

Tradeoff:

- Scanner workload shares runtime resources with your app unless isolated by architecture.

## Application responsibilities

Your application still owns:

- Authentication and authorization around upload endpoints.
- Storage isolation and serving strategy.
- Quarantine governance and review process.
- Logging retention and access control.
- Alerting, incident response, and forensic workflow.

## Deployment guidance

- Use strict endpoint-specific policies.
- Set `failClosed: true` for production upload paths.
- Keep allowlists narrow and explicit.
- Route suspicious verdicts to quarantine, not direct acceptance.
- Keep upload storage non-executable and non-public by default.
- Track scanner errors and timeouts as security-relevant signals.

## Compliance wording and boundaries

Pompelmi can support internal control objectives in privacy-sensitive or regulated environments, but it is not itself a compliance certification.

Use it as one control in a larger program that includes legal, administrative, and operational safeguards.
