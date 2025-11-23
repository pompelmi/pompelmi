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

```javascript
{
  maxZipEntries: 1000 // Prevent archives with excessive files
}
```

Most legitimate archives contain a reasonable number of files. By setting limits, we prevent attackers from creating deeply nested structures with thousands of tiny files.

### 2. Nesting Depth Control

```javascript
{
  maxZipDepth: 3 // Limit recursive archive inspection
}
```

ZIP bombs often use nested archives (ZIPs within ZIPs). Pompelmi tracks nesting depth and rejects overly complex structures.

### 3. Uncompressed Size Validation

```javascript
{
  maxTotalUncompressedSize: 100 * 1024 * 1024 // 100MB total
}
```

Before extraction, Pompelmi calculates the total uncompressed size by reading ZIP headers. This prevents expansion attacks without decompressing the entire file.

### 4. Compression Ratio Analysis

Pompelmi monitors the compression ratio. Unusually high ratios (e.g., 1000:1) trigger warnings:

```javascript
{
  maxCompressionRatio: 100 // Alert on suspicious compression
}
```

## Real-World Example

Here's how Pompelmi protects a Next.js application:

```typescript
import { createNextHandler } from 'pompelmi';

export const POST = createNextHandler({
  maxFileSize: 10 * 1024 * 1024,
  maxZipEntries: 500,
  maxZipDepth: 2,
  maxTotalUncompressedSize: 50 * 1024 * 1024,
  allowedMimeTypes: ['application/zip', 'image/*'],
});
```

This configuration:
- Limits uploaded files to 10MB
- Allows max 500 entries per archive
- Restricts nesting to 2 levels deep
- Caps total uncompressed size at 50MB

## Best Practices

1. **Always set reasonable limits** based on your use case
2. **Monitor compression ratios** for anomalies
3. **Log suspicious uploads** for security auditing
4. **Educate users** about file upload policies
5. **Keep Pompelmi updated** for latest threat detection

## Conclusion

ZIP bombs remain a significant threat, but with proper defenses, they're completely preventable. Pompelmi's comprehensive approach ensures your application stays safe without sacrificing legitimate functionality.

Ready to protect your application? Check out our [Getting Started guide](/pompelmi/getting-started/).
