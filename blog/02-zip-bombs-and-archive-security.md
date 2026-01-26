# ZIP Bombs, Nested Archives, and Why Upload Scanners Need Policies

**TL;DR:** Archive files (ZIP, TAR, etc.) can be weaponized to exhaust server resources through compression bombs and deep nesting. Learn how to defend your Node.js apps with policy-based limits and pompelmi's built-in protection.

---

## The Threat: When Archives Become Weapons

A 42-kilobyte ZIP file can expand to **4.5 petabytes**. That's not a typo.

### ZIP Bombs: The Classic Attack

A ZIP bomb is a malicious archive designed to crash systems through decompression:

```
bomb.zip (42 KB)
└─ layer1.zip (1.3 GB compressed)
   └─ layer2.zip (42 GB compressed)  
      └─ layer3.zip (1.3 TB compressed)
         └─ layer4.zip (42 TB compressed)
            └─ layer5.zip (1.3 PB compressed)
               └─ data.txt (4.5 PB uncompressed)
```

**Real-world impact:**
- Server disk fills up completely
- Out-of-memory crashes
- Denial of service for all users
- Cascading failures if shared storage

### Nested Archive Attacks

Even without extreme compression, deep nesting causes problems:

```
upload.zip
└─ documents.zip
   └─ archives.zip
      └─ backups.zip
         └─ data.zip
            └─ files.zip (20+ levels deep)
```

**Why it's dangerous:**
- Recursive decompression consumes CPU
- Memory usage grows exponentially
- Timeout-resistant (each level is small)
- Bypasses simple size checks

### Path Traversal in Archives

Malicious filenames in archives can write outside intended directories:

```
evil.zip
├─ ../../etc/passwd
├─ ../../../root/.ssh/authorized_keys
└─ ....//windows/system32/config/sam
```

**Consequences:**
- Overwrite system files
- Inject backdoors
- Escalate privileges
- Exfiltrate sensitive data

---

## Defense Strategy: Policy-Based Limits

pompelmi implements **multi-layered archive protection** through configurable policies.

### Layer 1: Compression Ratio Limits

Prevent ZIP bombs by detecting excessive compression:

```typescript
import { createZipBombGuard } from 'pompelmi';

const zipGuard = createZipBombGuard({
  maxCompressionRatio: 12, // 12:1 ratio limit
  maxEntries: 512,         // Max files in archive
  maxTotalUncompressedBytes: 100 * 1024 * 1024 // 100MB total
});

// Automatically rejects:
// - Files that expand more than 12x their compressed size
// - Archives with >512 files
// - Archives expanding beyond 100MB total
```

### Layer 2: Depth Limits

Prevent recursive bomb attacks with nesting limits:

```typescript
import { scan } from 'pompelmi';

// Using policy presets
const result = await scan(buffer, {
  preset: 'strict',  // maxDepth: 2
  // or explicit:
  maxDepth: 3  // Allow max 3 levels of nesting
});
```

Depth limits by preset:

| Preset | Max Depth | Rationale |
|--------|-----------|-----------|
| `strict` | 2 levels | Prevents most nested bomb attacks |
| `balanced` | 4 levels | Reasonable for legitimate archives |
| `fast` | 1 level | No recursion—flattest structure |

### Layer 3: Path Traversal Protection

Built-in sanitization prevents directory escapes:

```typescript
import { createZipTraversalGuard } from 'pompelmi';

const traversalGuard = createZipTraversalGuard();

// Automatically detects and blocks:
// - ../ sequences
// - Absolute paths (/)
// - Windows drive letters (C:\)
// - Unicode normalization attacks
// - Null byte injections
```

---

## Real-World Attack Scenarios

### Scenario 1: The 42KB Monster

**Attack:** User uploads `42kb.zip` containing nested bombs

**Without protection:**
```javascript
// Naïve approach
const result = await extractZip(file);
// Server crashes after expanding 4.5 PB
```

**With pompelmi:**
```javascript
const result = await scan(file, { preset: 'strict' });

// Returns:
{
  verdict: 'malicious',
  findingsWithReasons: [
    {
      reasonCode: 'ARCHIVE_BOMB_DETECTED',
      message: 'Archive exhibits ZIP bomb characteristics',
      metadata: { compressionRatio: 1024000 }
    }
  ]
}
```

### Scenario 2: Death by a Thousand Levels

**Attack:** `nested.zip` with 50 levels of single-file archives

**Without protection:**
```javascript
// Recursive extraction
function extractNested(zip) {
  const files = extract(zip);
  files.forEach(f => {
    if (f.isZip) extractNested(f); // Infinite recursion
  });
}
```

**With pompelmi:**
```javascript
const result = await scan(file, { maxDepth: 4 });

// Returns:
{
  verdict: 'suspicious',
  findingsWithReasons: [
    {
      reasonCode: 'ARCHIVE_TOO_DEEP',
      message: 'Archive nesting exceeds maximum depth limit',
      metadata: { depth: 50, limit: 4 }
    }
  ]
}
```

### Scenario 3: Path Traversal Payload

**Attack:** Archive with filenames like `../../etc/passwd`

**Without protection:**
```javascript
// Unsafe extraction
archive.forEach(entry => {
  fs.writeFileSync(entry.name, entry.data);
  // Oops: just wrote to /etc/passwd
});
```

**With pompelmi:**
```javascript
const result = await scan(archiveBuffer);

// Returns:
{
  verdict: 'malicious',
  findingsWithReasons: [
    {
      reasonCode: 'ARCHIVE_PATH_TRAVERSAL',
      message: 'Archive contains path traversal attempts',
      metadata: { paths: ['../../etc/passwd'] }
    }
  ]
}
```

---

## Choosing the Right Preset

pompelmi v0.27 makes archive protection simple with **policy presets**:

### Strict Preset (Recommended for Public Uploads)

```typescript
const result = await scan(upload, { preset: 'strict' });

// Protection:
// ✅ Max depth: 2 levels
// ✅ Max buffer: 5MB
// ✅ Compression ratio: 12:1
// ✅ Fail-fast enabled

// Best for:
// - Healthcare document uploads (HIPAA)
// - Financial services (PCI DSS)
// - Public-facing forms
// - User-generated content
```

### Balanced Preset (General Production)

```typescript
const result = await scan(upload, { preset: 'balanced' });

// Protection:
// ✅ Max depth: 4 levels
// ✅ Max buffer: 10MB
// ✅ Compression ratio: 12:1
// ✅ Comprehensive scanning

// Best for:
// - Business applications
// - Authenticated users
// - Document management systems
// - Collaboration tools
```

### Fast Preset (Trusted Sources)

```typescript
const result = await scan(upload, { preset: 'fast' });

// Protection:
// ✅ Max depth: 1 level (no recursion)
// ✅ Max buffer: 20MB
// ✅ Compression ratio: 12:1
// ✅ Optimized for speed

// Best for:
// - Internal admin tools
// - Trusted employee uploads
// - Migration scripts
// - Backup processing
```

---

## Custom Policies for Special Cases

### Case 1: Accepting Backup Archives

Some legitimate use cases need deeper nesting:

```typescript
import { scan } from 'pompelmi';

async function scanBackupArchive(file) {
  const result = await scan(file, {
    preset: 'balanced',  // Start with good defaults
    maxDepth: 8,         // Override for backups
    maxTotalUncompressedBytes: 500 * 1024 * 1024, // 500MB
    onScanEvent: (event) => {
      if (event.type === 'depth_warning') {
        console.warn('Deep nesting detected:', event);
      }
    }
  });

  return result;
}
```

### Case 2: Software Distribution (ISOs, Containers)

Large archives with many files:

```typescript
const result = await scan(iso, {
  preset: 'fast',
  maxEntries: 10000,   // Allow 10k files
  maxBufferSize: 100 * 1024 * 1024, // 100MB
  maxDepth: 2  // But limit nesting
});
```

### Case 3: Untrusted Email Attachments

Maximum paranoia mode:

```typescript
const result = await scan(attachment, {
  preset: 'strict',
  maxDepth: 1,  // Even stricter: no nesting
  maxFileSizeBytes: 2 * 1024 * 1024, // 2MB limit
  failClosed: true,  // Reject on any error
  timeoutMs: 3000  // 3 second timeout
});
```

---

## Monitoring and Alerting

Track archive-related threats in production:

```typescript
import { scan, ReasonCode, getReasonCodeInfo } from 'pompelmi';

async function scanWithArchiveMetrics(file, userId) {
  const result = await scan(file, { preset: 'balanced' });

  // Track archive-specific threats
  const archiveThreats = result.findingsWithReasons?.filter(f =>
    f.reasonCode.startsWith('ARCHIVE_')
  ) || [];

  if (archiveThreats.length > 0) {
    for (const threat of archiveThreats) {
      const info = getReasonCodeInfo(threat.reasonCode);
      
      // Log to security system
      await securityLogger.log({
        type: 'archive_threat',
        reasonCode: threat.reasonCode,
        severity: info.severity,
        userId,
        metadata: threat.metadata,
        timestamp: new Date()
      });

      // Alert on bombs and traversal
      if ([
        ReasonCode.ARCHIVE_BOMB_DETECTED,
        ReasonCode.ARCHIVE_PATH_TRAVERSAL
      ].includes(threat.reasonCode)) {
        await sendSecurityAlert({
          priority: 'high',
          message: `Archive attack detected: ${threat.message}`,
          user: userId
        });
      }
    }
  }

  return result;
}
```

### Dashboard Metrics

Track these metrics for archive security:

```typescript
// Prometheus/Grafana example
metrics.counter('archive_scans_total', { preset: 'strict' });
metrics.counter('archive_threats_detected', { reason_code: 'ARCHIVE_BOMB_DETECTED' });
metrics.histogram('archive_depth_observed', depth);
metrics.histogram('archive_compression_ratio', ratio);
```

---

## Production Deployment Guide

### Step 1: Choose Your Default Preset

```typescript
// config/security.ts
export const UPLOAD_SECURITY = {
  defaultPreset: process.env.SECURITY_PRESET || 'balanced',
  customLimits: {
    publicUploads: 'strict',
    authenticatedUsers: 'balanced',
    adminTools: 'fast'
  }
};
```

### Step 2: Implement Route-Specific Policies

```typescript
// routes/public-upload.ts
app.post('/public/upload', async (req, res) => {
  const result = await scan(req.file.buffer, {
    preset: 'strict'  // Public = strict
  });
  // ...
});

// routes/admin-upload.ts
app.post('/admin/upload', async (req, res) => {
  const result = await scan(req.file.buffer, {
    preset: 'fast'  // Admin = fast
  });
  // ...
});
```

### Step 3: Add Monitoring

```typescript
// middleware/scan-metrics.ts
export function trackScanMetrics(result, metadata) {
  const archiveFindings = result.findingsWithReasons?.filter(f =>
    f.reasonCode.startsWith('ARCHIVE_')
  ) || [];

  metrics.gauge('active_scans', -1);
  metrics.histogram('scan_duration_ms', result.durationMs);
  
  if (archiveFindings.length > 0) {
    metrics.counter('archive_threats', {
      endpoint: metadata.endpoint,
      preset: metadata.preset
    });
  }
}
```

---

## Copy-Paste Checklist

```bash
# 1. Create test ZIP bomb (safe, small)
dd if=/dev/zero bs=1M count=10 | gzip -9 > layer1.gz
dd if=/dev/zero bs=1M count=10 | gzip -9 > layer2.gz
zip bomb.zip layer1.gz layer2.gz

# 2. Test your scanner
curl -F "file=@bomb.zip" http://localhost:3000/upload
# Should reject with ARCHIVE_BOMB_DETECTED

# 3. Test nested archives
zip level1.zip test.txt
zip level2.zip level1.zip
zip level3.zip level2.zip
curl -F "file=@level3.zip" http://localhost:3000/upload
# Should reject if depth > preset limit

# 4. Monitor metrics
curl http://localhost:9090/metrics | grep archive
# archive_scans_total{preset="strict"} 127
# archive_threats_detected{reason_code="ARCHIVE_BOMB_DETECTED"} 3
```

---

## Conclusion

Archive files are powerful but dangerous. Without proper controls, they can:
- Exhaust server resources (ZIP bombs)
- Bypass size limits (nested archives)
- Compromise system integrity (path traversal)

**pompelmi's defense strategy:**
✅ Compression ratio limits prevent ZIP bombs  
✅ Depth limits prevent recursive attacks  
✅ Path sanitization prevents traversal  
✅ Policy presets make configuration easy  
✅ Reason codes enable automation  

**Get Protected:**
- [GitHub Repository](https://github.com/pompelmi/pompelmi)
- [Policy Presets Documentation](https://github.com/pompelmi/pompelmi/blob/main/docs/PRESETS_AND_REASON_CODES.md)
- [Examples](https://github.com/pompelmi/pompelmi/tree/main/examples)

**Questions?** Open an issue or start a discussion on GitHub!

---

*Published: January 2026 | Tags: Security, ZIP Bombs, Archive Security, Node.js, File Upload*
