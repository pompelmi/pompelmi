---
title: When to use Pompelmi + YARA
description: Learn when Pompelmi's built-in heuristics are enough and when adding YARA rules gives you better control over environment-specific upload threats.
---

Start with the built-in upload gate. Add YARA when your threat model needs pattern matching beyond the default heuristics.

## Good reasons to add YARA

- You have environment-specific indicators of compromise.
- You need to flag organization-specific file patterns.
- You want to add signatures for known bad samples in a private workflow.
- You want deeper scanning in CI/CD or review pipelines without moving files to a cloud API.

## When the built-ins are often enough

- Public web uploads where the main risks are spoofed file types, archive abuse, risky PDF actions, and basic document heuristics.
- Early product stages where you want low operational overhead.

## Continue

- [Pompelmi vs ClamAV for file uploads](./pompelmi-vs-clamav-for-file-uploads/)
- [CI/CD artifact scanning](../use-cases/cicd-artifact-scanning/)
- [Advanced malware detection with YARA integration](/blog/yara-integration-guide/)
