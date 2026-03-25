# Content Angles

## 10 post angles

1. Why file upload endpoints deserve the same threat modeling as auth and payments.
2. Why filenames, extensions, and client-provided MIME types are not enough.
3. How to add a local-first upload gate to an Express or Next.js route.
4. What archive bombs and archive traversal look like in real upload flows.
5. When to use in-process scanning instead of sending files to a cloud API.
6. How to add YARA without turning the whole stack into a daemon-heavy pipeline.
7. How to move from "reject only" to a quarantine and review workflow.
8. What a trustworthy Node.js upload-security library should and should not claim.
9. How to evaluate secure upload tooling in privacy-sensitive environments.
10. Common mistakes teams make when they harden uploads too late.

## 10 title ideas

1. Secure file uploads for Node.js without a cloud scanning API
2. Stop trusting MIME types: a safer upload flow for Express and Next.js
3. I built an open-source upload gate for Node.js
4. Scan uploads before storage: local-first file security for Node.js
5. Archive bombs, spoofed files, and risky PDFs: hardening one upload route
6. Why secure file uploads need more than extension checks
7. A practical upload-security layer for Node.js apps
8. What should happen between `multipart/form-data` and object storage
9. Local-first upload scanning for privacy-sensitive Node.js systems
10. Pompelmi: open-source file upload security for Node.js

## 10 short one-liners

1. Secure file uploads for Node.js.
2. Scan untrusted files before storage.
3. Local-first upload security with no required cloud API.
4. Inspect bytes, MIME claims, archives, and risky structures in-process.
5. A typed upload gate for Express, Next.js, NestJS, Fastify, and Koa.
6. Better than trusting filenames and client-provided MIME types.
7. Defense-in-depth for upload endpoints.
8. Practical file-upload hardening without daemon-first complexity.
9. Structured verdicts for allow, quarantine, or reject decisions.
10. Open-source upload security built for real Node.js routes.

## Comparison angles

- MIME and extension checks are still useful, but they only validate what the client claims or what the filename suggests.
- DIY upload validation gives control, but consistency, archive handling, and structured verdicts are easy to underbuild.
- Cloud scanning APIs can be a valid fit, but they introduce data egress, latency, and vendor dependency.
- ClamAV and other daemon-based tools remain useful, but they solve a different layer from the application-level upload gate.

## Pain-driven hooks

- "The dangerous part of your upload flow often starts after the file is accepted."
- "Most upload endpoints still trust metadata that attackers control."
- "If you parse or serve uploads later, the gate belongs before storage."
- "Privacy-sensitive teams should not have to choose between secure uploads and sending files off-platform."
- "Security tooling earns trust when it says exactly what it checks, and exactly what it does not."
