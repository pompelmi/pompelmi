# Disclaimer

**pompelmi** is an open-source library intended to help developers add **defense-in-depth** protections to file upload workflows (e.g., archive inspection, zip-bomb mitigation, and optional YARA-based scanning).

## No Warranty

This software is provided **"AS IS"**, without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and noninfringement.

## Limitation of Liability

In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

> For the full legal terms, see the `LICENSE` file (MIT License).

## Security & Detection Limitations

- **No security tool is perfect.** pompelmi may produce **false positives** and **false negatives**.
- pompelmi **does not guarantee** that a file is safe, malware-free, or non-malicious.
- Optional YARA scanning depends on:
  - the quality and freshness of rules you provide,
  - your configuration and threat model,
  - the runtime environment and dependencies.

## Proper Use

pompelmi should be used as **one layer** in a broader security strategy, which may include (depending on your risk):
- strict file type allowlists and size limits,
- isolating processing (containers/sandboxing),
- least-privilege storage and execution permissions,
- malware scanning in dedicated environments,
- logging/monitoring and incident response procedures.

You are responsible for evaluating whether pompelmi is suitable for your use case and for configuring it safely.

## Compliance Notice (GDPR/HIPAA/etc.)

pompelmi is designed to support privacy-friendly architectures (e.g., local/in-process scanning), but **it does not provide legal advice** and **does not guarantee compliance** with GDPR, HIPAA, or any other law/regulation. Compliance depends on your overall system design, data handling, and organizational processes.

## Third-Party Dependencies

pompelmi may rely on third-party dependencies and optional integrations. Their behavior, security posture, licensing, and availability are outside the control of pompelmi’s authors.

## Reporting Security Issues

If you believe you found a security vulnerability, please follow the instructions in `SECURITY.md`.