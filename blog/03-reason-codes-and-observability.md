# From OSS to Production: Observability & Reason Codes for Automated Decisions

**TL;DR:** Learn how to use pompelmi v0.27's standardized reason codes to build automated security workflows, monitor threats in production, and make data-driven decisions about file uploads.

---

## The Problem: Unstructured Scan Results

Traditional malware scanners return unstructured findings:

```javascript
// Before: Hard to automate
{
  verdict: "suspicious",
  findings: [
    "Polyglot file: PDF, ZIP",
    "Archive nesting exceeds 4 levels",
    "Heuristic score: 72/100"
  ]
}

// What do you do with this?
// - Parse strings? Fragile
// - Check verdict only? Too coarse
// - Build regex matchers? Maintenance nightmare
```

**Problems:**
- ❌ Can't build automation rules
- ❌ Metrics are unstructured
- ❌ Difficult to track specific threat types
- ❌ No machine-readable severity
- ❌ Message formats change between versions

---

## The Solution: Standardized Reason Codes

pompelmi v0.27 introduces **reason codes**—stable, machine-readable identifiers for every finding:

```javascript
// After: Structured and actionable
{
  verdict: "suspicious",
  findingsWithReasons: [
    {
      message: "Polyglot file: PDF, ZIP",
      reasonCode: "FILE_POLYGLOT",
      metadata: { formats: ["PDF", "ZIP"] }
    },
    {
      message: "Archive nesting exceeds 4 levels",
      reasonCode: "ARCHIVE_TOO_DEEP",
      metadata: { depth: 7, limit: 4 }
    }
  ]
}

// Now you can build rules!
```

**Benefits:**
- ✅ Stable API across versions
- ✅ Build automated workflows
- ✅ Track metrics by threat type
- ✅ Machine-readable severity levels
- ✅ Backward compatible (old `findings` array still works)

---

## Available Reason Codes

### Malware Detection
```typescript
ReasonCode.MALWARE_SIGNATURE_MATCH  // Known malware
ReasonCode.MALWARE_YARA_MATCH       // YARA rule hit
ReasonCode.MALWARE_CLAMAV_MATCH     // ClamAV signature
ReasonCode.MALWARE_EICAR_TEST       // EICAR test file
```

### Archive Threats
```typescript
ReasonCode.ARCHIVE_BOMB_DETECTED     // ZIP bomb
ReasonCode.ARCHIVE_TOO_DEEP          // Excessive nesting
ReasonCode.ARCHIVE_TOO_MANY_FILES    // File count limit
ReasonCode.ARCHIVE_PATH_TRAVERSAL    // Directory escape attempt
```

### File Characteristics
```typescript
ReasonCode.FILE_POLYGLOT            // Multiple formats
ReasonCode.FILE_EMBEDDED_SCRIPT     // Embedded code
ReasonCode.FILE_EXECUTABLE          // Executable format
ReasonCode.FILE_MACRO_DETECTED      // Document macros
```

### Operational
```typescript
ReasonCode.SCAN_TIMEOUT     // Scan exceeded time limit
ReasonCode.SCAN_ERROR       // Scanner failure
ReasonCode.CLEAN            // No threats
```

---

## Building Automated Workflows

### Pattern 1: Auto-Reject Critical Threats

```typescript
import { scan, ReasonCode } from 'pompelmi';

async function processUpload(file, userId) {
  const result = await scan(file.buffer, { preset: 'balanced' });

  // Define critical threats
  const CRITICAL_THREATS = [
    ReasonCode.MALWARE_SIGNATURE_MATCH,
    ReasonCode.MALWARE_YARA_MATCH,
    ReasonCode.ARCHIVE_BOMB_DETECTED,
    ReasonCode.ARCHIVE_PATH_TRAVERSAL
  ];

  const hasCriticalThreat = result.findingsWithReasons?.some(f =>
    CRITICAL_THREATS.includes(f.reasonCode)
  );

  if (hasCriticalThreat) {
    // Automatic rejection
    await logSecurityEvent({
      type: 'auto_reject',
      userId,
      fileName: file.name,
      findings: result.findingsWithReasons
    });

    await sendAlert({
      priority: 'critical',
      message: `Malware upload blocked: ${file.name}`,
      user: userId
    });

    return {
      action: 'reject',
      status: 422,
      message: 'File rejected due to security policy'
    };
  }

  return { action: 'allow', status: 200 };
}
```

### Pattern 2: Quarantine for Review

```typescript
async function processUploadWithQuarantine(file, userId) {
  const result = await scan(file.buffer, { preset: 'strict' });

  // Define suspicious patterns needing manual review
  const NEEDS_REVIEW = [
    ReasonCode.FILE_POLYGLOT,
    ReasonCode.FILE_EMBEDDED_SCRIPT,
    ReasonCode.ARCHIVE_TOO_DEEP,
    ReasonCode.HEURISTIC_SUSPICIOUS
  ];

  const needsReview = result.findingsWithReasons?.some(f =>
    NEEDS_REVIEW.includes(f.reasonCode)
  );

  if (needsReview) {
    // Store in quarantine bucket
    const quarantineId = await quarantineFile({
      buffer: file.buffer,
      fileName: file.name,
      userId,
      findings: result.findingsWithReasons,
      uploadedAt: new Date()
    });

    // Notify security team
    await notifySecurityTeam({
      type: 'quarantine',
      fileId: quarantineId,
      findings: result.findingsWithReasons,
      user: userId
    });

    return {
      action: 'quarantine',
      status: 202,
      message: 'File quarantined for security review',
      reviewId: quarantineId
    };
  }

  return { action: 'allow', status: 200 };
}
```

### Pattern 3: Risk-Based Routing

```typescript
async function smartUploadRouter(file, userContext) {
  const result = await scan(file.buffer, {
    preset: userContext.isTrusted ? 'balanced' : 'strict'
  });

  const reasonCodes = result.findingsWithReasons?.map(f => f.reasonCode) || [];

  // Route 1: Clean files → Normal processing
  if (reasonCodes.length === 0) {
    return processNormally(file);
  }

  // Route 2: EICAR test → Special handling
  if (reasonCodes.includes(ReasonCode.MALWARE_EICAR_TEST)) {
    return {
      action: 'test_detected',
      message: 'EICAR test file detected (safe test pattern)'
    };
  }

  // Route 3: Malware → Block + alert
  if (reasonCodes.some(c => c.startsWith('MALWARE_'))) {
    await alertSecurityTeam(file, result);
    return { action: 'block', status: 422 };
  }

  // Route 4: Suspicious → Quarantine
  if (reasonCodes.some(c => ['FILE_POLYGLOT', 'ARCHIVE_TOO_DEEP'].includes(c))) {
    const qId = await quarantine(file, result);
    return { action: 'quarantine', reviewId: qId };
  }

  // Route 5: Other findings → Log but allow
  await logFinding(file, result);
  return { action: 'allow_with_logging' };
}
```

---

## Production Monitoring

### Track Metrics by Reason Code

```typescript
import { scan, getReasonCodeInfo } from 'pompelmi';
import { Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();

const scanCounter = new Counter({
  name: 'file_scans_total',
  help: 'Total file scans',
  labelNames: ['verdict', 'preset'],
  registers: [registry]
});

const findingCounter = new Counter({
  name: 'scan_findings_total',
  help: 'Findings by reason code',
  labelNames: ['reason_code', 'severity'],
  registers: [registry]
});

const scanDuration = new Histogram({
  name: 'scan_duration_seconds',
  help: 'Scan duration',
  labelNames: ['preset'],
  registers: [registry]
});

export async function scanWithMetrics(file, preset = 'balanced') {
  const startTime = Date.now();
  const result = await scan(file, { preset });
  const duration = (Date.now() - startTime) / 1000;

  // Track scan
  scanCounter.inc({ verdict: result.verdict, preset });
  scanDuration.observe({ preset }, duration);

  // Track findings
  if (result.findingsWithReasons) {
    for (const finding of result.findingsWithReasons) {
      const info = getReasonCodeInfo(finding.reasonCode);
      findingCounter.inc({
        reason_code: finding.reasonCode,
        severity: info.severity
      });
    }
  }

  return result;
}

// Prometheus endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

**Example Prometheus queries:**

```promql
# Total scans by verdict
sum by (verdict) (file_scans_total)

# Top threat types
topk(10, sum by (reason_code) (scan_findings_total))

# Malware detection rate
sum(scan_findings_total{reason_code=~"MALWARE_.*"}) / sum(file_scans_total)

# Archive bomb frequency
rate(scan_findings_total{reason_code="ARCHIVE_BOMB_DETECTED"}[5m])

# 95th percentile scan duration
histogram_quantile(0.95, scan_duration_seconds_bucket)
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "pompelmi Security Monitoring",
    "panels": [
      {
        "title": "Threat Types (24h)",
        "targets": [{
          "expr": "sum by (reason_code) (increase(scan_findings_total[24h]))"
        }],
        "type": "bar"
      },
      {
        "title": "Malware Detections",
        "targets": [{
          "expr": "sum(scan_findings_total{severity=\"malicious\"})"
        }],
        "type": "graph"
      },
      {
        "title": "Quarantine Rate",
        "targets": [{
          "expr": "sum(quarantine_actions_total) / sum(file_scans_total)"
        }],
        "type": "singlestat"
      }
    ]
  }
}
```

---

## Alerting Strategies

### Critical: Immediate Response

```typescript
async function handleCriticalThreats(result, metadata) {
  const criticalFindings = result.findingsWithReasons?.filter(f => {
    const info = getReasonCodeInfo(f.reasonCode);
    return info.severity === 'malicious' && info.actionable;
  }) || [];

  if (criticalFindings.length === 0) return;

  for (const finding of criticalFindings) {
    // Send to incident response
    await sendToIncidentResponse({
      priority: 'P1',
      type: 'malware_detection',
      reasonCode: finding.reasonCode,
      message: finding.message,
      metadata: {
        ...metadata,
        ...finding.metadata
      },
      timestamp: new Date()
    });

    // Send to Slack/PagerDuty
    await sendAlert({
      channel: '#security-alerts',
      severity: 'critical',
      title: `🚨 Malware Detected: ${finding.reasonCode}`,
      details: finding.message,
      user: metadata.userId,
      file: metadata.fileName
    });

    // Log to SIEM
    await logToSIEM({
      event_type: 'security.malware.detected',
      severity: 'critical',
      reason_code: finding.reasonCode,
      user_id: metadata.userId,
      file_name: metadata.fileName,
      finding: finding
    });
  }
}
```

### Warning: Review Required

```typescript
async function handleSuspiciousFindings(result, metadata) {
  const suspiciousFindings = result.findingsWithReasons?.filter(f => {
    const info = getReasonCodeInfo(f.reasonCode);
    return info.severity === 'suspicious' && info.actionable;
  }) || [];

  if (suspiciousFindings.length === 0) return;

  // Aggregate and send daily digest
  await addToReviewQueue({
    findings: suspiciousFindings,
    metadata,
    priority: 'medium',
    dueDate: addDays(new Date(), 1)
  });

  // Track in analytics
  analytics.track('Suspicious File Upload', {
    userId: metadata.userId,
    reasonCodes: suspiciousFindings.map(f => f.reasonCode),
    fileType: metadata.fileType
  });
}
```

---

## User Communication

### Provide Clear Feedback

```typescript
function generateUserMessage(finding) {
  const messages = {
    [ReasonCode.MALWARE_EICAR_TEST]: {
      title: 'Test File Detected',
      message: 'This appears to be an EICAR test file. If you were testing the scanner, it works! For real uploads, please use a different file.',
      action: 'Upload a different file'
    },
    [ReasonCode.FILE_POLYGLOT]: {
      title: 'Unusual File Format',
      message: 'This file appears to contain multiple formats, which can be a security risk. It has been quarantined for review.',
      action: 'Our security team will review within 24 hours'
    },
    [ReasonCode.ARCHIVE_BOMB_DETECTED]: {
      title: 'Archive Rejected',
      message: 'This archive file exhibits characteristics of a compression bomb attack and cannot be processed.',
      action: 'Please verify the file and try again'
    },
    [ReasonCode.ARCHIVE_TOO_DEEP]: {
      title: 'Archive Too Complex',
      message: 'This archive has too many nested levels. Maximum allowed depth is 4 levels.',
      action: 'Please flatten the archive structure and resubmit'
    }
  };

  return messages[finding.reasonCode] || {
    title: 'Security Check Failed',
    message: finding.message,
    action: 'Contact support if you believe this is an error'
  };
}

// Express example
app.post('/upload', async (req, res) => {
  const result = await scan(req.file.buffer);

  if (result.verdict !== 'clean' && result.findingsWithReasons) {
    const finding = result.findingsWithReasons[0];
    const userMessage = generateUserMessage(finding);

    return res.status(422).json({
      error: userMessage.title,
      message: userMessage.message,
      action: userMessage.action,
      code: finding.reasonCode
    });
  }

  res.json({ success: true });
});
```

---

## Best Practices

### 1. Define Clear Policies

```typescript
// config/security-policy.ts
export const SECURITY_POLICY = {
  // Auto-reject (no user appeal)
  autoReject: [
    ReasonCode.MALWARE_SIGNATURE_MATCH,
    ReasonCode.MALWARE_YARA_MATCH,
    ReasonCode.ARCHIVE_BOMB_DETECTED,
    ReasonCode.ARCHIVE_PATH_TRAVERSAL
  ],

  // Quarantine (manual review)
  quarantine: [
    ReasonCode.FILE_POLYGLOT,
    ReasonCode.FILE_EMBEDDED_SCRIPT,
    ReasonCode.ARCHIVE_TOO_DEEP
  ],

  // Allow with logging
  allowWithLog: [
    ReasonCode.FILE_EXECUTABLE,
    ReasonCode.HEURISTIC_SUSPICIOUS
  ],

  // EICAR test handling
  testFile: [ReasonCode.MALWARE_EICAR_TEST]
};
```

### 2. Version Your Policies

```typescript
const POLICY_V2 = {
  version: 2,
  effectiveDate: '2026-01-15',
  rules: {
    [ReasonCode.FILE_POLYGLOT]: 'quarantine',
    [ReasonCode.ARCHIVE_BOMB_DETECTED]: 'reject',
    // ...
  },
  changelog: 'Added FILE_POLYGLOT to quarantine list'
};
```

### 3. A/B Test Security Policies

```typescript
async function experimentalScan(file, userId) {
  const variant = getExperimentVariant(userId);

  const preset = variant === 'strict_test' ? 'strict' : 'balanced';
  const result = await scan(file, { preset });

  analytics.track('Scan Experiment', {
    variant,
    verdict: result.verdict,
    findingCount: result.findingsWithReasons?.length || 0
  });

  return result;
}
```

---

## Copy-Paste Checklist

```bash
# 1. Set up Prometheus metrics endpoint
curl http://localhost:3000/metrics

# 2. Test automated workflows
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
curl -F "file=@eicar.txt" http://localhost:3000/upload
# Should auto-reject and trigger alert

# 3. Query metrics
curl -s http://localhost:3000/metrics | grep scan_findings_total
# scan_findings_total{reason_code="MALWARE_EICAR_TEST",severity="malicious"} 1

# 4. Test quarantine workflow
# Upload a polyglot file and verify it goes to review queue

# 5. Monitor Grafana dashboard
# Set up alerts for:
# - Malware detection spike
# - Quarantine rate > threshold
# - Scan errors
```

---

## Conclusion

Reason codes transform pompelmi from a scanner into a **security automation platform**:

✅ **Stable API** for building workflows  
✅ **Machine-readable** threat types  
✅ **Actionable metrics** for monitoring  
✅ **Clear severities** for prioritization  
✅ **Backward compatible** with existing code  

**Next Steps:**
1. Implement automated decision logic
2. Set up metrics and alerting
3. Build quarantine workflow
4. A/B test security policies
5. Monitor and iterate

**Resources:**
- [Reason Codes Documentation](https://github.com/pompelmi/pompelmi/blob/main/docs/PRESETS_AND_REASON_CODES.md)
- [GitHub Repository](https://github.com/pompelmi/pompelmi)
- [Examples](https://github.com/pompelmi/pompelmi/tree/main/examples)

**Questions?** Join the discussion on GitHub!

---

*Published: January 2026 | Tags: Security, Observability, Automation, Node.js, Monitoring*
