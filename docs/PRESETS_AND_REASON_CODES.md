# pompelmi v0.27+ New Features

This document covers new features added in v0.27: **Policy Presets** and **Reason Codes**.

## 🎛️ Policy Presets

Policy presets provide safe, production-ready defaults for common scanning scenarios. Choose a preset and override specific options as needed.

### Available Presets

| Preset | Use Case | Max Depth | Buffer Size | Heuristic Threshold | Fail Fast |
|--------|----------|-----------|-------------|---------------------|-----------|
| **`strict`** | High-risk environments, untrusted uploads | 2 levels | 5MB | 60/100 | ✅ Yes |
| **`balanced`** | General production use (recommended) | 4 levels | 10MB | 75/100 | ❌ No |
| **`fast`** | Performance-critical, lower-risk scenarios | 1 level | 20MB | 85/100 | ✅ Yes |

### Usage Examples

```typescript
import { scan } from 'pompelmi';

// Use strict preset for untrusted uploads
const result = await scan(buffer, { preset: 'strict' });

// Use balanced preset (recommended for most apps)
const result = await scan(buffer, { preset: 'balanced' });

// Use fast preset for performance-critical paths
const result = await scan(buffer, { preset: 'fast' });

// Override preset options
const result = await scan(buffer, {
  preset: 'strict',
  maxDepth: 5, // Override: allow deeper nesting
  maxBufferSize: 10 * 1024 * 1024 // Override: larger buffer
});
```

### Preset Details

#### Strict Preset
- **Max archive depth:** 2 levels (prevents deep nesting attacks)
- **Max buffer size:** 5MB (conservative memory usage)
- **Heuristic threshold:** 60/100 (aggressive detection)
- **Fail fast:** Enabled (stops at first threat)
- **Best for:** Healthcare, finance, untrusted public uploads

#### Balanced Preset (Recommended)
- **Max archive depth:** 4 levels (reasonable nesting)
- **Max buffer size:** 10MB (moderate memory usage)
- **Heuristic threshold:** 75/100 (balanced detection)
- **Fail fast:** Disabled (comprehensive scanning)
- **Best for:** Most production applications, general file uploads

#### Fast Preset
- **Max archive depth:** 1 level (minimal nesting)
- **Max buffer size:** 20MB (larger files allowed)
- **Heuristic threshold:** 85/100 (fewer false positives)
- **Fail fast:** Enabled (optimized for speed)
- **Best for:** Internal tools, trusted sources, performance-critical paths

### Why Use Presets?

- **Quick setup:** Production-ready defaults in one line
- **Consistent security:** Vetted configurations across your codebase
- **Easy tuning:** Start with a preset, override what you need
- **Clear intent:** Preset names communicate security posture
- **Backward compatible:** Explicit options always take precedence

---

## 🏷️ Reason Codes

Standardized reason codes enable automated decision-making and better observability.

### What Are Reason Codes?

Every scan result now includes structured `findingsWithReasons` alongside the traditional `findings` array. Each finding has a:
- **`message`**: Human-readable description
- **`reasonCode`**: Stable enum value for programmatic handling
- **`metadata`**: Optional additional context (e.g., matched formats for polyglots)

### Available Reason Codes

#### Malware Detection
- `MALWARE_SIGNATURE_MATCH` — Known malware signature detected
- `MALWARE_YARA_MATCH` — YARA rule matched
- `MALWARE_CLAMAV_MATCH` — ClamAV signature matched
- `MALWARE_EICAR_TEST` — EICAR test file (safe test pattern)

#### Archive-Related
- `ARCHIVE_TOO_DEEP` — Nesting exceeds max depth
- `ARCHIVE_TOO_MANY_FILES` — Too many files in archive
- `ARCHIVE_BOMB_DETECTED` — ZIP bomb characteristics detected
- `ARCHIVE_PATH_TRAVERSAL` — Path traversal attempt in archive

#### File Characteristics
- `FILE_TOO_LARGE` — File size exceeds limits
- `FILE_POLYGLOT` — Multiple format signatures (polyglot file)
- `FILE_EMBEDDED_SCRIPT` — Embedded scripts detected
- `FILE_EXECUTABLE` — Executable file format
- `FILE_MACRO_DETECTED` — Document contains macros

#### MIME & Format
- `MIME_NOT_ALLOWED` — MIME type not in allowed list
- `MIME_MISMATCH` — Declared MIME doesn't match content

#### Operational
- `SCAN_TIMEOUT` — Scan exceeded time limit
- `SCAN_ERROR` — Error during scanning
- `HEURISTIC_SUSPICIOUS` — Heuristic analysis flagged file
- `CLEAN` — No threats detected

### Usage Examples

```typescript
import { scan, ReasonCode } from 'pompelmi';

const result = await scan(buffer);

// Use structured findings for automation
if (result.findingsWithReasons) {
  for (const finding of result.findingsWithReasons) {
    switch (finding.reasonCode) {
      case ReasonCode.MALWARE_EICAR_TEST:
        console.log('✅ Safe test file detected');
        break;
      case ReasonCode.FILE_POLYGLOT:
        console.warn('⚠️ Polyglot file:', finding.metadata?.formats);
        // Maybe quarantine for manual review
        break;
      case ReasonCode.ARCHIVE_BOMB_DETECTED:
        console.error('🚫 ZIP bomb blocked');
        // Automatically reject
        break;
      default:
        console.log('Finding:', finding.message);
    }
  }
}

// Build metrics/alerts
const hasMalware = result.findingsWithReasons?.some(f => 
  f.reasonCode.startsWith('MALWARE_')
);

// Automated decisions based on reason codes
const shouldQuarantine = result.findingsWithReasons?.some(f =>
  [ReasonCode.FILE_POLYGLOT, ReasonCode.ARCHIVE_TOO_DEEP].includes(f.reasonCode)
);

if (shouldQuarantine) {
  await quarantineFile(fileId);
}
```

### Reason Code Metadata

Get information about any reason code:

```typescript
import { getReasonCodeInfo, ReasonCode } from 'pompelmi';

const info = getReasonCodeInfo(ReasonCode.ARCHIVE_BOMB_DETECTED);
console.log(info);
// {
//   code: 'ARCHIVE_BOMB_DETECTED',
//   description: 'Archive exhibits ZIP bomb characteristics',
//   severity: 'malicious',
//   actionable: true
// }
```

### Benefits

- **Stable API:** Reason codes won't change between versions
- **Automated workflows:** Build rules based on codes, not parsing messages
- **Better monitoring:** Track specific threat types in metrics
- **Clear documentation:** Each code has description and severity
- **Backward compatible:** Original `findings` array still available

---

## Migration Guide

### From v0.26 to v0.27

The new features are fully backward compatible. No breaking changes.

#### Optional: Adopt Policy Presets

**Before:**
```typescript
const result = await scan(buffer, {
  maxDepth: 4,
  heuristicThreshold: 75,
  maxBufferSize: 10 * 1024 * 1024,
  failFast: false
});
```

**After:**
```typescript
const result = await scan(buffer, { preset: 'balanced' });
```

#### Optional: Use Reason Codes

**Before:**
```typescript
const result = await scan(buffer);
if (result.verdict === 'malicious') {
  console.log('Findings:', result.findings);
}
```

**After:**
```typescript
const result = await scan(buffer);
if (result.findingsWithReasons) {
  for (const finding of result.findingsWithReasons) {
    console.log(`[${finding.reasonCode}] ${finding.message}`);
  }
}
// Old API still works!
console.log('Findings:', result.findings);
```

---

## Production Best Practices

### Choosing the Right Preset

```typescript
// Public file upload from untrusted users
const result = await scan(buffer, { preset: 'strict' });

// Standard business app (authenticated users)
const result = await scan(buffer, { preset: 'balanced' });

// Internal admin tool (trusted users)
const result = await scan(buffer, { preset: 'fast' });
```

### Using Reason Codes for Monitoring

```typescript
import { scan, ReasonCode } from 'pompelmi';

async function scanWithMetrics(buffer: Buffer, userId: string) {
  const result = await scan(buffer, { preset: 'balanced' });
  
  // Track metrics by reason code
  if (result.findingsWithReasons) {
    for (const finding of result.findingsWithReasons) {
      metrics.increment('file_scan.finding', {
        reason_code: finding.reasonCode,
        severity: getReasonCodeInfo(finding.reasonCode).severity,
        user_id: userId
      });
    }
  }
  
  // Alert on malware
  const malwareDetected = result.findingsWithReasons?.some(f =>
    f.reasonCode.startsWith('MALWARE_')
  );
  
  if (malwareDetected) {
    await sendAlert({
      type: 'malware_detected',
      userId,
      findings: result.findingsWithReasons
    });
  }
  
  return result;
}
```

### Building Automated Workflows

```typescript
import { scan, ReasonCode } from 'pompelmi';

async function processUpload(file: Buffer) {
  const result = await scan(file, { preset: 'strict' });
  
  if (!result.findingsWithReasons) {
    return { action: 'allow' };
  }
  
  // Auto-reject malware
  const hasMalware = result.findingsWithReasons.some(f =>
    [
      ReasonCode.MALWARE_SIGNATURE_MATCH,
      ReasonCode.MALWARE_YARA_MATCH,
      ReasonCode.ARCHIVE_BOMB_DETECTED,
      ReasonCode.ARCHIVE_PATH_TRAVERSAL
    ].includes(f.reasonCode)
  );
  
  if (hasMalware) {
    return { action: 'reject', reason: 'malware_detected' };
  }
  
  // Quarantine suspicious files for manual review
  const isSuspicious = result.findingsWithReasons.some(f =>
    [
      ReasonCode.FILE_POLYGLOT,
      ReasonCode.FILE_EMBEDDED_SCRIPT,
      ReasonCode.ARCHIVE_TOO_DEEP
    ].includes(f.reasonCode)
  );
  
  if (isSuspicious) {
    return { action: 'quarantine', reason: 'manual_review_required' };
  }
  
  return { action: 'allow' };
}
```
