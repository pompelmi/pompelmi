# Disclaimer

## No warranty

pompelmi is provided **"as is"**, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. See the [LICENSE](./LICENSE) for the full terms.

## Not a replacement for dedicated security software

pompelmi is a thin wrapper around [ClamAV](https://www.clamav.net/). It does not provide its own threat detection engine. Its accuracy is entirely determined by ClamAV and the freshness of the virus definition database.

**pompelmi should not be used as the sole security control** in any environment that processes untrusted files. It is intended to complement, not replace, a broader security posture (network controls, sandboxing, access controls, etc.).

## Exit code reliance

pompelmi maps ClamAV's exit codes to result strings:

| Exit code | Result | Meaning |
|-----------|--------|---------|
| 0 | `"Clean"` | No threats detected by ClamAV at the time of scanning. |
| 1 | `"Malicious"` | A known signature was matched. |
| 2 | `"ScanError"` | The scan could not complete (e.g. I/O error, encrypted archive, permission denied). **The file's safety is unknown.** |

A result of `"Clean"` means ClamAV found no known threats. It does **not** guarantee that the file is safe, only that it did not match any signature in the current database.

A result of `"ScanError"` must be treated as **untrusted**. Passing such a file through to users or downstream systems is the caller's responsibility.

## Virus definition freshness

pompelmi checks for the presence of `main.cvd` on disk before running `freshclam`. If the database is present but outdated, pompelmi will not update it automatically. Keeping the virus database current is the responsibility of the operator.

## Dependency on ClamAV

pompelmi requires ClamAV (`clamscan`) to be installed and available in PATH. If ClamAV is not installed, all calls to `pompelmi.scan()` will reject with an `ENOENT` error. pompelmi does not bundle ClamAV or any antivirus engine.

## Limitation of liability

In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of this software, including but not limited to missed detections, false positives, data loss, or security incidents.
