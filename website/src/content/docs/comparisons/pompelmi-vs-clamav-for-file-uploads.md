---
title: Pompelmi vs ClamAV for file uploads
description: "Compare Pompelmi and ClamAV for Node.js upload security: what each layer catches, where each one fits, and when to combine them."
---

Pompelmi and ClamAV solve related but different problems.

## Short answer

- Use Pompelmi when you need an application-layer upload gate with no daemon and no required data egress.
- Use ClamAV when you need signature-based antivirus coverage for known malware families.
- Use both when you want structural upload controls plus local signature scanning.

## Comparison

| Question | Pompelmi | ClamAV |
| --- | --- | --- |
| Runs in-process | Yes | No, usually daemon or binary |
| Handles archive abuse at the upload gate | Yes | Partially, but not as the main design goal |
| Known-malware signatures | Optional via integrations, not the default story | Yes |
| Privacy-first local deployment | Yes | Yes, if run locally |
| Serverless-friendly | More practical | Usually not |

## Continue

- [When to use Pompelmi + YARA](./when-to-use-pompelmi-plus-yara/)
- [Do you need antivirus for file uploads?](./do-you-need-antivirus-for-file-uploads/)
- [Pompelmi vs ClamAV vs custom pipelines](/blog/pompelmi-vs-clamav-comparison/)
