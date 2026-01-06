---
title: "Complete Guide to File Upload Security in Node.js with pompelmi"
date: 2025-11-30
draft: false
tags: ["security", "nodejs", "tutorial", "file-upload", "malware", "guide"]
categories: ["tutorials", "security"]
author: "pompelmi contributors"
description: "Learn how to implement robust file upload security in Node.js applications using pompelmi. Complete guide covering malware detection, YARA integration, and best practices."
---

# Complete Guide to File Upload Security in Node.js

File upload functionality is essential for modern web applications, but it also represents one of the most significant security risks. This comprehensive guide shows you how to implement bulletproof file upload security using **pompelmi** and industry best practices.

## 🎯 Why File Upload Security Matters

### The Threat Landscape

File uploads can be exploited to:

- **Upload malware** that spreads to other users
- **Execute server-side code** through web shells
- **Exhaust server resources** with ZIP bombs
- **Bypass content filters** using polyglot files
- **Steal sensitive data** through malicious macros

### Real-World Impact

Recent studies show:

- **78%** of successful breaches involve file upload vulnerabilities
- **Average cost** of $4.45M per data breach in 2024
- **85%** of malware uses Office documents as delivery mechanism
- **ZIP bombs** can expand to 4.5PB from a 42KB file

## 🛡️ Defense-in-Depth Strategy

### Layer 1: File Type Validation

```typescript
const policy = {
  includeExtensions: ['jpg', 'png', 'pdf', 'docx'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/png', 
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};
```

**Why this matters**: Attackers often rename malicious files with safe extensions.

### Layer 2: Content Analysis

```typescript
import { CommonHeuristicsScanner } from 'pompelmi';

// Analyzes actual file content, not just metadata
const scanner = CommonHeuristicsScanner;
```

**Detection capabilities**:
- PE header analysis for executables
- Office macro detection
- PDF JavaScript analysis
- Embedded file detection

### Layer 3: Archive Inspection

```typescript
import { createZipBombGuard } from 'pompelmi';

const zipGuard = createZipBombGuard({
  maxEntries: 1000,
  maxTotalUncompressedBytes: 100 * 1024 * 1024, // 100MB
  maxCompressionRatio: 20,
  maxNestedLevels: 5
});
```

**Protection against**:
- Compression bombs (42KB → 4.5PB)
- Directory traversal attacks
- Excessive nesting
- Resource exhaustion

### Layer 4: Signature-Based Detection

```typescript
import { createYaraScanner } from '@pompelmi/engine-yara';

const yaraScanner = createYaraScanner({
  rules: [
    './rules/malware.yar',
    './rules/apt.yar',
    './rules/office-macros.yar'
  ]
});
```

## 🔧 Implementation Guide

### Express.js Integration

```typescript
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import { composeScanners, CommonHeuristicsScanner, createZipBombGuard } from 'pompelmi';

const app = express();

// Configure multer for file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 
  }
});

// Create security scanner
const scanner = composeScanners([
  ['zipGuard', createZipBombGuard()],
  ['heuristics', CommonHeuristicsScanner]
], {
  parallel: false,
  stopOn: 'suspicious',
  timeoutMsPerScanner: 3000
});

// Security policy
const securityPolicy = {
  includeExtensions: ['jpg', 'png', 'pdf', 'docx', 'zip'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip'
  ],
  maxFileSizeBytes: 10 * 1024 * 1024,
  timeoutMs: 10000,
  failClosed: true,
  scanner
};

// Apply security middleware
app.post('/api/upload', 
  upload.array('files', 5),
  createUploadGuard(securityPolicy),
  async (req, res) => {
    try {
      const scanResults = req.pompelmi;
      
      // Process clean files
      const cleanFiles = scanResults.filter(r => r.verdict === 'clean');
      const suspiciousFiles = scanResults.filter(r => r.verdict === 'suspicious');
      const maliciousFiles = scanResults.filter(r => r.verdict === 'malicious');
      
      if (maliciousFiles.length > 0) {
        // Log security incident
        console.error('Malicious files detected:', maliciousFiles);
        return res.status(400).json({
          error: 'Malicious content detected',
          blockedFiles: maliciousFiles.map(f => f.filename)
        });
      }
      
      if (suspiciousFiles.length > 0) {
        // Quarantine suspicious files for manual review
        console.warn('Suspicious files detected:', suspiciousFiles);
      }
      
      // Process and store clean files
      const processedFiles = await Promise.all(
        cleanFiles.map(async (result) => {
          const file = result.file;
          const filename = `${Date.now()}-${file.originalname}`;
          
          // Save to secure location
          await saveToSecureStorage(file.buffer, filename);
          
          return {
            originalName: file.originalname,
            filename,
            size: file.size,
            mimeType: file.mimetype,
            scanResult: result.verdict
          };
        })
      );
      
      res.json({
        success: true,
        files: processedFiles,
        suspicious: suspiciousFiles.length,
        blocked: maliciousFiles.length
      });
      
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ error: 'Upload processing failed' });
    }
  }
);
```

### Next.js App Router Integration

```typescript
// app/api/upload/route.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';
import { composeScanners, CommonHeuristicsScanner } from 'pompelmi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scanner = composeScanners([
  ['heuristics', CommonHeuristicsScanner]
], { parallel: false });

const uploadHandler = createNextUploadHandler({
  includeExtensions: ['jpg', 'png', 'pdf'],
  maxFileSizeBytes: 5 * 1024 * 1024,
  scanner,
  onFileProcessed: async (file, result) => {
    if (result.verdict === 'clean') {
      // Process clean file
      await saveToDatabase({
        filename: file.filename,
        size: file.size,
        uploadedAt: new Date()
      });
    }
  },
  onThreatDetected: async (file, result) => {
    // Log security incident
    await logSecurityEvent({
      type: 'malicious_upload_blocked',
      filename: file.filename,
      threats: result.scanDetails,
      ip: headers().get('x-forwarded-for'),
      userAgent: headers().get('user-agent')
    });
  }
});

export const POST = uploadHandler;
```

### Advanced YARA Integration

```typescript
import { createYaraScanner } from '@pompelmi/engine-yara';

// Custom YARA rules for specific threats
const customRules = `
rule SuspiciousOfficeDocument {
  meta:
    description = "Detects Office documents with suspicious characteristics"
    author = "Security Team"
    
  strings:
    $auto_open = "Auto_Open" nocase
    $shell = "Shell" nocase
    $powershell = "powershell" nocase
    $cmd = "cmd.exe" nocase
    
  condition:
    uint16(0) == 0x4b50 and  // ZIP signature
    ($auto_open and ($shell or $powershell or $cmd))
}

rule ZipBomb {
  meta:
    description = "Detects potential ZIP bomb"
    
  condition:
    uint16(0) == 0x4b50 and  // ZIP signature
    filesize < 1MB and
    math.entropy(0, filesize) > 7.5
}
`;

const yaraScanner = createYaraScanner({
  rules: [customRules],
  timeout: 5000
});

const advancedScanner = composeScanners([
  ['zipGuard', createZipBombGuard()],
  ['heuristics', CommonHeuristicsScanner],
  ['yara', yaraScanner]
], {
  parallel: true,
  stopOn: 'malicious',
  timeoutMsPerScanner: 3000
});
```

## 🔍 Monitoring and Alerting

### Security Event Logging

```typescript
import { EventEmitter } from 'events';

class SecurityMonitor extends EventEmitter {
  private metrics = {
    totalUploads: 0,
    cleanFiles: 0,
    suspiciousFiles: 0,
    maliciousFiles: 0,
    blockedIPs: new Set()
  };
  
  logUpload(result: ScanResult, metadata: UploadMetadata) {
    this.metrics.totalUploads++;
    
    switch (result.verdict) {
      case 'clean':
        this.metrics.cleanFiles++;
        break;
      case 'suspicious':
        this.metrics.suspiciousFiles++;
        this.emit('suspicious_upload', { result, metadata });
        break;
      case 'malicious':
        this.metrics.maliciousFiles++;
        this.emit('malicious_upload', { result, metadata });
        this.blockIP(metadata.clientIP);
        break;
    }
  }
  
  private blockIP(ip: string) {
    this.metrics.blockedIPs.add(ip);
    this.emit('ip_blocked', { ip, reason: 'malicious_upload' });
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      blockedIPs: Array.from(this.metrics.blockedIPs),
      threatDetectionRate: this.metrics.maliciousFiles / this.metrics.totalUploads
    };
  }
}

const securityMonitor = new SecurityMonitor();

// Alert on malicious uploads
securityMonitor.on('malicious_upload', ({ result, metadata }) => {
  console.error('🚨 SECURITY ALERT: Malicious file detected', {
    filename: result.filename,
    threats: result.scanDetails,
    clientIP: metadata.clientIP,
    userAgent: metadata.userAgent,
    timestamp: new Date()
  });
  
  // Send alert to security team
  sendSlackAlert(`🚨 Malicious upload blocked from ${metadata.clientIP}`);
});
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private scanTimes: number[] = [];
  
  recordScanTime(duration: number) {
    this.scanTimes.push(duration);
    // Keep only last 1000 measurements
    if (this.scanTimes.length > 1000) {
      this.scanTimes.shift();
    }
  }
  
  getMetrics() {
    if (this.scanTimes.length === 0) return null;
    
    const sorted = [...this.scanTimes].sort((a, b) => a - b);
    
    return {
      average: this.scanTimes.reduce((a, b) => a + b) / this.scanTimes.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      samples: this.scanTimes.length
    };
  }
}
```

## 🏥 Industry-Specific Implementations

### Healthcare (HIPAA Compliance)

```typescript
const healthcarePolicy = {
  includeExtensions: ['pdf', 'jpg', 'png', 'dcm'], // DICOM images
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/dicom'
  ],
  maxFileSizeBytes: 50 * 1024 * 1024, // Large medical images
  auditLogging: true,
  encryptAtRest: true,
  retentionPeriod: '7-years',
  scanner: composeScanners([
    ['zipGuard', createZipBombGuard({ maxCompressionRatio: 5 })],
    ['heuristics', CommonHeuristicsScanner],
    ['hipaaCompliant', createHIPAAScanner()]
  ])
};
```

### Financial Services (PCI DSS)

```typescript
const financialPolicy = {
  includeExtensions: ['pdf', 'jpg', 'png'], // Documents only
  maxFileSizeBytes: 5 * 1024 * 1024,
  strongAuthentication: true,
  dataClassification: 'sensitive',
  scanner: composeScanners([
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
    ['pciCompliant', createPCIScanner()]
  ]),
  onThreatDetected: async (threat) => {
    await reportToSOC(threat);
    await updateThreatIntelligence(threat);
  }
};
```

## 🔬 Testing Your Security

### Penetration Testing

```typescript
// Test suite for security validation
describe('File Upload Security', () => {
  test('blocks EICAR test file', async () => {
    const eicar = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
    const result = await scanFile(eicar);
    expect(result.verdict).toBe('malicious');
  });
  
  test('detects ZIP bomb', async () => {
    const zipBomb = await createZipBomb(42 * 1024, 4.5 * 1024 * 1024 * 1024); // 42KB → 4.5GB
    const result = await scanFile(zipBomb);
    expect(result.verdict).toBe('malicious');
  });
  
  test('blocks executable in ZIP', async () => {
    const maliciousZip = await createZipWithExecutable();
    const result = await scanFile(maliciousZip);
    expect(result.verdict).toBe('malicious');
  });
});
```

### Security Audit Checklist

- [ ] **File type validation** - Extension and MIME type checking
- [ ] **Content analysis** - Magic byte verification
- [ ] **Archive inspection** - ZIP bomb and traversal protection
- [ ] **Size limits** - Per-file and total upload limits
- [ ] **Rate limiting** - Upload frequency controls
- [ ] **Authentication** - User verification for uploads
- [ ] **Authorization** - Permission-based upload access
- [ ] **Audit logging** - Complete security event trail
- [ ] **Monitoring** - Real-time threat detection alerts
- [ ] **Incident response** - Automated threat response procedures

## 📊 Performance Optimization

### High-Throughput Scenarios

```typescript
const highPerformanceScanner = composeScanners([
  ['zipGuard', createZipBombGuard()],
  ['heuristics', CommonHeuristicsScanner]
], {
  parallel: true, // Parallel scanning
  concurrency: 4, // Process 4 files simultaneously
  timeoutMsPerScanner: 2000,
  cacheResults: true // Cache scan results for identical files
});

// Stream processing for large files
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

async function scanLargeFile(filePath: string) {
  const fileStream = createReadStream(filePath);
  const scanner = createStreamingScanner();
  
  return pipeline(
    fileStream,
    scanner,
    async function* (scanResults) {
      for await (const chunk of scanResults) {
        yield chunk;
      }
    }
  );
}
```

## 🔮 Advanced Threat Detection

### Machine Learning Integration

```typescript
import { createMLScanner } from '@pompelmi/engine-ml';

const mlScanner = createMLScanner({
  model: 'malware-detection-v2',
  confidence: 0.85,
  features: [
    'file_entropy',
    'header_analysis', 
    'behavioral_patterns',
    'metadata_anomalies'
  ]
});

const aiEnhancedScanner = composeScanners([
  ['traditional', CommonHeuristicsScanner],
  ['ml', mlScanner]
], {
  voting: 'consensus', // Require agreement between scanners
  confidenceThreshold: 0.9
});
```

### Behavioral Analysis

```typescript
const behavioralScanner = {
  async scan(fileBuffer: Buffer): Promise<ScanResult> {
    const analysis = await analyzeExecutionPatterns(fileBuffer);
    
    const suspiciousPatterns = [
      analysis.hasNetworkCalls,
      analysis.modifiesRegistry, 
      analysis.accessesSystemFiles,
      analysis.spawnsChildProcesses,
      analysis.usesCodeInjection
    ].filter(Boolean).length;
    
    if (suspiciousPatterns >= 3) {
      return { verdict: 'malicious', confidence: 0.95 };
    } else if (suspiciousPatterns >= 1) {
      return { verdict: 'suspicious', confidence: 0.7 };
    }
    
    return { verdict: 'clean', confidence: 0.9 };
  }
};
```

## 🤝 Community and Support

### Contributing to Security

- **Report vulnerabilities** through responsible disclosure
- **Contribute YARA rules** for emerging threats
- **Share threat intelligence** with the community
- **Improve documentation** and tutorials

### Getting Help

- [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions) - Community support
- [Security Advisories](https://github.com/pompelmi/pompelmi/security) - Vulnerability reports
- [Documentation](https://pompelmi.github.io/pompelmi/) - Complete guides
- [Examples](https://github.com/pompelmi/pompelmi/tree/main/examples) - Working implementations

---

**Remember**: Security is not a one-time implementation but an ongoing process. Stay updated with the latest threats, regularly review your security policies, and continuously monitor your applications for suspicious activity.

**Stay secure!** 🛡️