# Advanced Magic Bytes & Polyglot Detection

🔍 **Extensible file format detection with advanced polyglot analysis** for the pompelmi malware scanner.

## Overview

This module provides sophisticated file format detection and polyglot file analysis capabilities. It can identify over 30 common file formats, detect files that combine multiple formats (polyglots), and identify embedded executable code in seemingly innocent files.

## Features

- ✅ **30+ Built-in Signatures** - PE, ELF, Mach-O, Java, PHP, scripts, images, documents, archives
- ✅ **Extensible Engine** - Add custom signatures with patterns or detection functions
- ✅ **Polyglot Detection** - Identify files that combine multiple formats
- ✅ **Embedded Script Detection** - Find hidden PHP, JavaScript, shell scripts in images/documents
- ✅ **Security Risk Analysis** - Comprehensive analysis of executable content and obfuscation
- ✅ **Zero Dependencies** - Pure Node.js implementation

## Installation

```bash
npm install @pompelmi/core
```

## Quick Start

```typescript
import { detectFormat, detectPolyglot, analyzeSecurityRisks } from '@pompelmi/core';

// Basic format detection
const buffer = Buffer.from([0x4d, 0x5a]); // PE executable
const result = detectFormat(buffer);

console.log(result.format);     // "PE (Windows Executable)"
console.log(result.suspicious); // true

// Polyglot detection
const polyglot = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG
  Buffer.from('<?php system($_GET["cmd"]); ?>'),
]);

const analysis = analyzeSecurityRisks(polyglot);
console.log(analysis.hasEmbeddedScripts); // true
console.log(analysis.reasons);
// ["Embedded scripts found: PHP", "Image file contains embedded executable code"]
```

## API Reference

### Basic Detection Functions

#### `detectFormat(buffer: Buffer): MagicBytesResult`

Detect file format from buffer using magic bytes.

```typescript
const buffer = fs.readFileSync('file.exe');
const result = detectFormat(buffer);

console.log(result);
// {
//   detected: true,
//   format: 'PE (Windows Executable)',
//   mimeType: 'application/x-msdownload',
//   extension: '.exe',
//   suspicious: true,
//   matches: [...]  // All matching signatures
// }
```

#### `detectPolyglot(buffer: Buffer): PolyglotResult`

Detect files that combine multiple formats.

```typescript
const result = detectPolyglot(buffer);

console.log(result);
// {
//   isPolyglot: true,
//   formats: ['ZIP Archive', 'PE (Windows Executable)'],
//   mimeTypes: ['application/zip', 'application/x-msdownload'],
//   suspicious: true,
//   reason: 'Multiple file formats detected: ZIP Archive, PE (Windows Executable)'
// }
```

#### `analyzeSecurityRisks(buffer: Buffer)`

Comprehensive security analysis.

```typescript
const analysis = analyzeSecurityRisks(buffer);

console.log(analysis);
// {
//   isExecutable: true,
//   isPolyglot: true,
//   hasEmbeddedScripts: true,
//   suspicious: true,
//   reasons: [
//     'Suspicious file format: PE (Windows Executable)',
//     'Polyglot file detected: ZIP, PE',
//     'Embedded scripts found: PHP, JavaScript'
//   ]
// }
```

### MagicBytesDetector Class

Advanced detector with custom signature support.

```typescript
import { MagicBytesDetector } from '@pompelmi/core';

const detector = new MagicBytesDetector();

// Add custom signature
detector.addSignature({
  name: 'Custom Format',
  mimeType: 'application/x-custom',
  extensions: ['.custom'],
  pattern: Buffer.from('MAGIC'),
  suspicious: true,
});

// Detect with custom signatures
const result = detector.detect(buffer);

// Check for specific format
const hasPE = detector.hasFormat(buffer, 'PE (Windows Executable)');

// Get all signatures
const signatures = detector.getSignatures();
```

## Built-in Signatures

### Executables (Suspicious by default)

| Format | Magic Bytes | MIME Type | Extensions |
|--------|-------------|-----------|------------|
| PE (Windows) | `4D 5A` (MZ) | `application/x-msdownload` | `.exe`, `.dll`, `.sys` |
| ELF (Linux) | `7F 45 4C 46` | `application/x-executable` | `.elf`, `.so` |
| Mach-O (macOS) | `CF FA ED FE` | `application/x-mach-binary` | `.dylib`, `.bundle` |
| Java Class | `CA FE BA BE` | `application/java-vm` | `.class` |
| WebAssembly | `00 61 73 6D` | `application/wasm` | `.wasm` |

### Scripts (Suspicious by default)

| Format | Pattern | Extensions |
|--------|---------|------------|
| Shell Script | `#!/bin/sh` | `.sh`, `.bash` |
| Bash Script | `#!/bin/bash` | `.sh`, `.bash` |
| Python Script | `#!/usr/bin/env python` | `.py` |
| Node.js Script | `#!/usr/bin/env node` | `.js`, `.mjs` |
| PHP Script | `<?php` | `.php` |

### Archives

| Format | Magic Bytes | Extensions |
|--------|-------------|------------|
| ZIP | `50 4B 03 04` | `.zip` |
| RAR | `52 61 72 21 1A 07` | `.rar` |
| 7-Zip | `37 7A BC AF 27 1C` | `.7z` |
| Gzip | `1F 8B` | `.gz` |

### Images

| Format | Magic Bytes | Extensions |
|--------|-------------|------------|
| JPEG | `FF D8 FF` | `.jpg`, `.jpeg` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | `.png` |
| GIF | `GIF8` | `.gif` |
| BMP | `42 4D` | `.bmp` |
| WebP | `RIFF` + `WEBP` | `.webp` |

### Documents

| Format | Pattern | Extensions |
|--------|---------|------------|
| PDF | `%PDF` | `.pdf` |
| Office 2007+ | ZIP + Office XML | `.docx`, `.xlsx`, `.pptx` |
| RTF | `{\rtf` | `.rtf` |

## Custom Signatures

### Simple Pattern Matching

```typescript
detector.addSignature({
  name: 'Custom Binary',
  mimeType: 'application/x-custom',
  extensions: ['.bin'],
  pattern: Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]),
  offset: 0, // Optional: start position (default: 0)
  suspicious: true,
});
```

### Advanced Detection Function

```typescript
detector.addSignature({
  name: 'Complex Format',
  mimeType: 'application/x-complex',
  extensions: ['.complex'],
  pattern: Buffer.from('DUMMY'), // Not used when detect() provided
  detect: (buffer: Buffer) => {
    // Custom detection logic
    if (buffer.length < 100) return false;
    
    const header = buffer.slice(0, 4);
    const footer = buffer.slice(-4);
    
    return (
      header.equals(Buffer.from('HEAD')) &&
      footer.equals(Buffer.from('FOOT'))
    );
  },
  suspicious: true,
});
```

### Offset-based Patterns

```typescript
// Detect pattern at specific offset
detector.addSignature({
  name: 'Offset Format',
  mimeType: 'application/x-offset',
  extensions: ['.off'],
  pattern: Buffer.from('MAGIC'),
  offset: 512, // Look at byte 512
});
```

## Polyglot Detection Examples

### Example 1: Image with PHP Backdoor

```typescript
const maliciousJpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // Valid JPEG header
  Buffer.from('JFIF'),
  Buffer.alloc(100), // Image data
  Buffer.from('<?php system($_GET["cmd"]); ?>'), // Hidden PHP
]);

const analysis = analyzeSecurityRisks(maliciousJpeg);
console.log(analysis);
// {
//   isExecutable: false,
//   isPolyglot: false,
//   hasEmbeddedScripts: true,
//   suspicious: true,
//   reasons: [
//     'Embedded scripts found: PHP',
//     'Image file contains embedded executable code'
//   ]
// }
```

### Example 2: ZIP/JAR Polyglot

```typescript
const zipJarPolyglot = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP header
  Buffer.from('PK'),
  Buffer.alloc(50),
  Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Java class header
]);

const result = detectPolyglot(zipJarPolyglot);
console.log(result);
// {
//   isPolyglot: true,
//   formats: ['ZIP Archive', 'Java Class'],
//   suspicious: true
// }
```

### Example 3: PDF with Embedded Executable

```typescript
const maliciousPdf = Buffer.concat([
  Buffer.from('%PDF-1.4'),
  Buffer.alloc(100),
  Buffer.from([0x4d, 0x5a]), // MZ header
]);

const analysis = analyzeSecurityRisks(maliciousPdf);
console.log(analysis.reasons);
// [
//   'Polyglot file detected: PDF Document, PE (Windows Executable)',
//   'Document contains embedded executable content'
// ]
```

## Integration with scan()

The polyglot detection is automatically integrated with the `scan()` function:

```typescript
import { scan } from '@pompelmi/core';

// Scan automatically uses polyglot detection
const result = await scan(buffer);

console.log(result.verdict);  // 'clean' | 'suspicious' | 'malicious'
console.log(result.findings); // Includes polyglot detections
```

**Verdict Priority:**
1. **`malicious`** - EICAR or known malware signatures
2. **`suspicious`** - Executables, polyglots, embedded scripts
3. **`clean`** - No threats detected

## Security Best Practices

### 1. Validate All Uploads

```typescript
import { analyzeSecurityRisks } from '@pompelmi/core';

async function validateUpload(file: Buffer) {
  const analysis = analyzeSecurityRisks(file);
  
  if (analysis.suspicious) {
    throw new Error(`Upload rejected: ${analysis.reasons.join(', ')}`);
  }
  
  return true;
}
```

### 2. Block Polyglot Files

```typescript
import { detectPolyglot } from '@pompelmi/core';

function isPolyglotThreat(buffer: Buffer): boolean {
  const result = detectPolyglot(buffer);
  return result.isPolyglot && result.suspicious;
}
```

### 3. Scan Image Uploads for Scripts

```typescript
import { detectFormat, MagicBytesDetector } from '@pompelmi/core';

function validateImageUpload(buffer: Buffer) {
  const format = detectFormat(buffer);
  
  // Ensure it's actually an image
  if (!format.mimeType?.startsWith('image/')) {
    throw new Error('Not an image file');
  }
  
  // Check for embedded scripts
  const detector = new MagicBytesDetector();
  const scriptResult = detector.detectEmbeddedScripts(buffer);
  
  if (scriptResult.hasScripts) {
    throw new Error(`Image contains embedded ${scriptResult.scriptTypes.join(', ')}`);
  }
}
```

## Performance

- **Small files** (<1KB): ~0.1ms per scan
- **Medium files** (1MB): ~5-10ms per scan
- **Large files** (100MB): ~50-100ms per scan (constant memory)

The detector only reads the beginning of files (typically first 1-2KB) for signature matching, making it very fast even for large files.

## Advanced Use Cases

### Custom Malware Scanner

```typescript
import { MagicBytesDetector, DEFAULT_SIGNATURES } from '@pompelmi/core';

class CustomMalwareScanner {
  private detector = new MagicBytesDetector(DEFAULT_SIGNATURES);
  
  constructor() {
    // Add organization-specific signatures
    this.detector.addSignature({
      name: 'Internal Malware v1',
      mimeType: 'application/x-malware',
      extensions: ['.mal'],
      pattern: Buffer.from('INTERNAL_MAL_SIG'),
      suspicious: true,
    });
  }
  
  scan(buffer: Buffer) {
    const format = this.detector.detect(buffer);
    const security = this.detector.analyzeSecurityRisks(buffer);
    
    return {
      isMalicious: format.suspicious || security.suspicious,
      details: {
        format: format.format,
        isPolyglot: security.isPolyglot,
        hasScripts: security.hasEmbeddedScripts,
        risks: security.reasons,
      },
    };
  }
}
```

### CI/CD Integration

```typescript
import { analyzeSecurityRisks } from '@pompelmi/core';
import { readFileSync } from 'fs';
import { glob } from 'glob';

async function scanRepository() {
  const files = await glob('**/*', {
    ignore: ['node_modules/**', '.git/**'],
  });
  
  const threats: string[] = [];
  
  for (const file of files) {
    const buffer = readFileSync(file);
    const analysis = analyzeSecurityRisks(buffer);
    
    if (analysis.suspicious) {
      threats.push(`${file}: ${analysis.reasons.join(', ')}`);
    }
  }
  
  if (threats.length > 0) {
    console.error('Threats detected:');
    threats.forEach(t => console.error(`  - ${t}`));
    process.exit(1);
  }
  
  console.log('✓ Repository scan complete - no threats found');
}
```

## TypeScript Types

```typescript
interface MagicBytesSignature {
  name: string;
  mimeType: string;
  extensions: string[];
  pattern: Buffer | string;
  offset?: number;
  suspicious?: boolean;
  detect?: (buffer: Buffer) => boolean;
}

interface MagicBytesResult {
  detected: boolean;
  format?: string;
  mimeType?: string;
  extension?: string;
  suspicious?: boolean;
  matches?: MagicBytesSignature[];
}

interface PolyglotResult {
  isPolyglot: boolean;
  formats: string[];
  mimeTypes: string[];
  suspicious: boolean;
  reason?: string;
}
```

## Related Documentation

- [Core Scanning API](./scan.md) - Main scan() function
- [Stream-Based Scanning](./stream-scanning.md) - Memory-efficient scanning
- [CLI Usage](../packages/cli/README.md) - Command-line interface
- [Examples](../examples/) - More code examples

## Contributing

To add new signatures to the default set:

1. Add signature to `src/magicBytes/signatures.ts`
2. Add test case to `src/magicBytes/__tests__/detector.spec.ts`
3. Update this documentation
4. Submit PR

## License

MIT - see [LICENSE](../../LICENSE)

---

**Part of the [pompelmi](https://github.com/pompelmi/pompelmi) security toolkit** 🛡️
