---
title: Do you need antivirus for file uploads?
description: A practical answer to whether upload routes need antivirus, structural inspection, or both, depending on the file types and risk profile.
---

Sometimes yes, but not as a substitute for the upload gate itself.

## Practical answer

- If your route accepts only low-risk, tightly controlled file types, strong validation and structural checks may be enough.
- If you accept documents, archives, mixed user content, or external partner uploads, antivirus or YARA can add useful depth.
- Even with antivirus, you still need route-level checks for MIME spoofing, archive abuse, and risky document structures.

## What antivirus does not solve alone

- It does not replace parser limits.
- It does not replace storage isolation.
- It does not tell you how your application should handle `suspicious`.

## Continue

- [Pompelmi vs ClamAV for file uploads](./pompelmi-vs-clamav-for-file-uploads/)
- [File-type validation vs malware scanning](./file-type-validation-vs-malware-scanning/)
- [Document upload security](../use-cases/document-upload-security/)
