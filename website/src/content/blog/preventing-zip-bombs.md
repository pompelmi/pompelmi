---
title: "Preventing ZIP Bombs: How Pompelmi Protects Your Application"
description: "Deep dive into ZIP bomb attacks and how Pompelmi's multi-layered defense mechanisms keep your Node.js applications safe."
pubDate: 2024-02-10
author: "Pompelmi Team"
tags: ["security", "zip-bomb", "best-practices"]
---

# Preventing ZIP Bombs: How Pompelmi Protects Your Application

ZIP bombs are a deceptively simple yet devastating attack vector. A tiny compressed file can expand to gigabytes or even terabytes of data, consuming all available memory and disk space, effectively bringing your application to a halt.

## Understanding ZIP Bombs

A ZIP bomb exploits the compression algorithm's efficiency. By creating files with highly repetitive patterns, attackers can achieve extreme compression ratios. The infamous `42.zip` is only 42 kilobytes but expands to 4.5 petabytes when fully decompressed.

### The Anatomy of an Attack

1. **Attacker uploads** a small, innocent-looking ZIP file
2. **Your server attempts** to process or extract it
3. **Memory exhaustion** occurs as the file expands
4. **Service disruption** or complete server crash

## Pompelmi's Multi-Layered Defense

Pompelmi employs several strategies to detect and prevent ZIP bomb attacks:

### 1. Entry Count Limits

Pass the `maxEntries` option to `createZipBombGuard`:

```typescript
import { createZipBombGuard } from 'pompelmi';

const zipGuard = createZipBombGuard({
  maxEntries: 1000, // Prevent archives with excessive files
});
```

### 2. Nesting Depth Control

```javascript
{
  maxZipDepth: 3 // Limit recursive archive inspection
}
```

ZIP bombs often use nested archives (ZIPs within ZIPs). Pompelmi tracks nesting depth and rejects overly complex structures.

### 2. Uncompressed Size Validation

Before extraction, Pompelmi reads ZIP central-directory headers to calculate the total declared uncompressed size and rejects the file before decompressing a single byte:

```typescript
const zipGuard = createZipBombGuard({
  maxTotalUncompressedBytes: 100 * 1024 * 1024, // 100 MB total
});
```

### 3. Compression Ratio Guard

```typescript
const zipGuard = createZipBombGuard({
  maxCompressionRatio: 100, // Block files compressed > 100x
});
```

### 4. Composing with Other Scanners

Wire the ZIP guard alongside content heuristics:

```typescript
import { composeScanners, CommonHeuristicsScanner } from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 500,
      maxTotalUncompressedBytes: 50 * 1024 * 1024,
      maxCompressionRatio: 50,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', tagSourceName: true }
);
```

## Best Practices

1. **Always set reasonable limits** based on your use case
2. **Monitor compression ratios** for anomalies
3. **Log suspicious uploads** for security auditing
4. **Educate users** about file upload policies
5. **Keep Pompelmi updated** for latest threat detection

## Conclusion

ZIP bombs remain a significant threat, but with proper defenses, they're completely preventable. Pompelmi's comprehensive approach ensures your application stays safe without sacrificing legitimate functionality.

**Related posts:**
- [MIME sniffing and magic bytes](/pompelmi/blog/mime-sniffing-magic-bytes/)
- [17 common file upload security mistakes](/pompelmi/blog/common-file-upload-mistakes-nodejs/)
- [Pompelmi vs ClamAV: choosing the right scanner](/pompelmi/blog/pompelmi-vs-clamav-comparison/)

Ready to protect your application? Check out our [Getting Started guide](/pompelmi/getting-started/).
