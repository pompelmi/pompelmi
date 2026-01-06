---
title: Architecture & threat model
description: How Pompelmi validates uploads and surfaces malware verdicts.
---

- **Guards:** size & MIME checks before scanning  
- **Scan engine:** configurable backends (e.g., ClamAV, YARA)  
- **Verdicts:** `CLEAN | MALICIOUS | ERROR` — consistent UI/JSON shape  
- **Privacy:** outline data handling & retention  
- **Limits:** known gaps and safe defaults