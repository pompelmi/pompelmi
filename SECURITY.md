# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**DO NOT** open public GitHub issues for security vulnerabilities.

### Reporting Process

To report a security vulnerability, please use one of the following methods:

1. **GitHub Security Advisories** (Recommended): [Report a vulnerability](https://github.com/pompelmi/pompelmi/security/advisories/new)
2. **Email**: Send details to security@pompelmi.dev
3. **Private Disclosure**: Create a private advisory at the repository

### What to Include

When reporting a vulnerability, please provide:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)
- Your contact information for follow-up

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 3-7 days
  - Medium: 7-14 days
  - Low: 14-30 days

### What to Expect

**If Accepted:**
- We'll work with you to understand and verify the vulnerability
- A fix will be developed and tested
- A security advisory will be published
- Credit will be given unless you prefer to remain anonymous

**If Declined:**
- We'll provide a clear explanation
- Alternative solutions or mitigations may be suggested

## Security Measures

pompelmi implements the following security practices:

- 🔒 Automated dependency scanning via Dependabot
- 🛡️ CodeQL static analysis on all commits
- 📊 OpenSSF Scorecard monitoring
- 🔐 Provenance attestation for npm releases
- ⚡ Regular security audits and updates

## Security Best Practices for Users

When using pompelmi in production:

1. **Keep Updated**: Always use the latest version
2. **Validate Input**: Sanitize all user-provided files before scanning
3. **Resource Limits**: Implement timeouts and size limits
4. **Sandbox Execution**: Run in isolated environments when possible
5. **Review Policies**: Customize security policies for your threat model

## CVE List

All published security advisories can be found at:
https://github.com/pompelmi/pompelmi/security/advisories

## Contact

For general security questions or concerns:
- Email: security@pompelmi.dev
- GitHub Discussions: https://github.com/pompelmi/pompelmi/discussions

---

**PGP Key Fingerprint**: Contact us for our public key if needed for encrypted communications.

