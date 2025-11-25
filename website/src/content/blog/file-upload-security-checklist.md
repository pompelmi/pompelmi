---
title: "File Upload Security Best Practices: A Developer's Checklist"
description: "Essential security best practices every developer should implement when handling file uploads, with practical examples and actionable recommendations."
pubDate: 2024-05-01
author: "Pompelmi Security Team"
tags: ["best-practices", "security", "checklist", "developers"]
---

# File Upload Security Best Practices: A Developer's Checklist

File upload functionality is essential for modern web applications, but it's also one of the most dangerous features to implement incorrectly. A single oversight can lead to remote code execution, data breaches, or complete system compromise. This comprehensive checklist provides actionable security guidelines every developer should follow.

## ✅ The Complete File Upload Security Checklist

### 1. Input Validation and Sanitization

#### File Size Limits
```typescript
// ❌ BAD: No size limits
app.post('/upload', upload.single('file'), (req, res) => {
  // Vulnerable to DoS attacks
});

// ✅ GOOD: Enforce strict size limits
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5, // Max 5 files per request
    fieldSize: 1024 // Limit form field sizes
  }
});

// ✅ BETTER: Dynamic size limits based on user role
const createUploadMiddleware = (userRole) => {
  const limits = {
    guest: 1 * 1024 * 1024,      // 1MB
    user: 5 * 1024 * 1024,       // 5MB  
    premium: 50 * 1024 * 1024,   // 50MB
    admin: 100 * 1024 * 1024     // 100MB
  };
  
  return multer({
    limits: {
      fileSize: limits[userRole] || limits.guest
    }
  });
};
```

#### MIME Type Validation
```typescript
// ❌ BAD: Trusting client-provided MIME types
if (file.mimetype === 'image/jpeg') {
  // Client can lie about MIME type
}

// ✅ GOOD: Server-side MIME type detection
import { fromBuffer } from 'file-type';

const validateFileType = async (buffer, allowedTypes) => {
  const detectedType = await fromBuffer(buffer);
  
  if (!detectedType) {
    throw new Error('Unable to determine file type');
  }
  
  if (!allowedTypes.includes(detectedType.mime)) {
    throw new Error(`File type ${detectedType.mime} not allowed`);
  }
  
  return detectedType;
};

// ✅ BETTER: Use Pompelmi's comprehensive validation
const scanner = new FileScanner({
  mimeValidation: {
    strict: true,
    allowList: ['image/jpeg', 'image/png', 'application/pdf'],
    denyList: ['text/html', 'application/javascript'],
    customValidators: {
      'image/jpeg': (buffer) => {
        // Validate JPEG header
        return buffer[0] === 0xFF && buffer[1] === 0xD8;
      }
    }
  }
});
```

#### Filename Sanitization
```typescript
// ❌ BAD: Using original filename directly
const filename = file.originalname;
fs.writeFileSync(`uploads/${filename}`, file.buffer);

// ✅ GOOD: Sanitize and restrict filenames
const sanitizeFilename = (filename) => {
  // Remove path traversal attempts
  filename = path.basename(filename);
  
  // Remove dangerous characters
  filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Limit length
  filename = filename.substring(0, 100);
  
  // Prevent hidden files
  if (filename.startsWith('.')) {
    filename = '_' + filename;
  }
  
  return filename;
};

// ✅ BETTER: Generate secure random filenames
const generateSecureFilename = (originalName) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  
  return `${timestamp}_${random}${ext}`;
};
```

### 2. Upload Location Security

#### Secure Upload Directory
```typescript
// ❌ BAD: Uploading to web-accessible directory
const uploadPath = '/var/www/html/uploads/'; // Directly accessible via web

// ✅ GOOD: Upload outside web root
const uploadPath = '/var/uploads/'; // Not web-accessible

// ✅ BETTER: Separate storage with access controls
const config = {
  uploadPath: process.env.UPLOAD_DIRECTORY || '/secure/uploads',
  permissions: 0o600, // Owner read/write only
  webPath: '/api/files/', // Serve through controlled endpoint
};

// Create upload directory with secure permissions
fs.mkdirSync(config.uploadPath, { 
  recursive: true, 
  mode: config.permissions 
});
```

#### File Serving Security
```typescript
// ❌ BAD: Direct file serving
app.get('/uploads/:filename', (req, res) => {
  res.sendFile(path.join(uploadPath, req.params.filename));
});

// ✅ GOOD: Controlled file serving with validation
app.get('/api/files/:fileId', authenticateUser, async (req, res) => {
  const { fileId } = req.params;
  
  // Validate file access permissions
  const file = await db.getFile(fileId);
  if (!file || !canUserAccessFile(req.user, file)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Sanitize headers
  res.set({
    'Content-Type': file.mimeType,
    'Content-Disposition': `attachment; filename="${file.safeName}"`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'"
  });
  
  res.sendFile(file.path);
});
```

### 3. Content Analysis and Scanning

#### Magic Byte Validation
```typescript
const validateMagicBytes = (buffer, expectedType) => {
  const magicBytes = {
    'image/jpeg': [0xFF, 0xD8],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'image/gif': [0x47, 0x49, 0x46]
  };
  
  const expected = magicBytes[expectedType];
  if (!expected) return false;
  
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false;
  }
  
  return true;
};

// Usage in upload handler
app.post('/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  
  // Validate magic bytes match MIME type
  if (!validateMagicBytes(file.buffer, file.mimetype)) {
    return res.status(400).json({ 
      error: 'File content does not match declared type' 
    });
  }
  
  // Continue with processing...
});
```

#### Malware Scanning
```typescript
// ✅ Basic malware scanning with Pompelmi
const scanner = new FileScanner({
  enableHeuristics: true,
  enableYARA: true,
  quarantineThreats: true
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const scanResult = await scanner.scanFile(req.file.path);
    
    if (scanResult.verdict === 'malicious') {
      // Log security event
      logger.warn('Malicious file upload attempt', {
        filename: req.file.originalname,
        ip: req.ip,
        user: req.user?.id,
        threats: scanResult.findings
      });
      
      // Remove file immediately
      fs.unlinkSync(req.file.path);
      
      return res.status(422).json({
        error: 'File contains malicious content',
        code: 'MALWARE_DETECTED'
      });
    }
    
    // File is safe to process
    res.json({ message: 'File uploaded successfully' });
    
  } catch (error) {
    logger.error('File scan error', error);
    res.status(500).json({ error: 'File processing failed' });
  }
});
```

### 4. Archive and Compression Security

#### ZIP Bomb Prevention
```typescript
// ✅ ZIP bomb protection
const scanner = new FileScanner({
  zipLimits: {
    maxEntries: 1000,           // Max files in archive
    maxDepth: 10,               // Max nesting depth  
    maxTotalSize: 100 * 1024 * 1024, // 100MB uncompressed
    maxEntrySize: 10 * 1024 * 1024,  // 10MB per file
    maxCompressionRatio: 100,   // Max compression ratio
    scanContents: true          // Scan extracted contents
  }
});

// Custom ZIP validation
const validateArchive = async (filePath) => {
  const yauzl = require('yauzl');
  
  return new Promise((resolve, reject) => {
    let entryCount = 0;
    let totalUncompressedSize = 0;
    
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        entryCount++;
        totalUncompressedSize += entry.uncompressedSize;
        
        // Check limits
        if (entryCount > 1000) {
          return reject(new Error('Too many entries in archive'));
        }
        
        if (totalUncompressedSize > 100 * 1024 * 1024) {
          return reject(new Error('Archive too large when uncompressed'));
        }
        
        // Check compression ratio
        const ratio = entry.uncompressedSize / entry.compressedSize;
        if (ratio > 100) {
          return reject(new Error('Suspicious compression ratio detected'));
        }
        
        zipfile.readEntry();
      });
      
      zipfile.on('end', () => {
        resolve({ entryCount, totalUncompressedSize });
      });
    });
  });
};
```

### 5. User Authentication and Authorization

#### Upload Permissions
```typescript
// ✅ Role-based upload restrictions
const uploadPermissions = {
  guest: {
    allowedTypes: ['image/jpeg', 'image/png'],
    maxSize: 1024 * 1024, // 1MB
    dailyLimit: 5
  },
  user: {
    allowedTypes: ['image/*', 'application/pdf', 'text/plain'],
    maxSize: 10 * 1024 * 1024, // 10MB
    dailyLimit: 50
  },
  premium: {
    allowedTypes: ['*'], // All types allowed
    maxSize: 100 * 1024 * 1024, // 100MB
    dailyLimit: 500
  }
};

const checkUploadPermission = async (user, file) => {
  const userRole = user?.role || 'guest';
  const permissions = uploadPermissions[userRole];
  
  // Check file type
  if (!permissions.allowedTypes.includes('*') && 
      !permissions.allowedTypes.some(type => 
        type.endsWith('*') ? 
          file.mimetype.startsWith(type.slice(0, -1)) : 
          file.mimetype === type
      )) {
    throw new Error('File type not allowed for your account level');
  }
  
  // Check file size
  if (file.size > permissions.maxSize) {
    throw new Error('File exceeds size limit for your account level');
  }
  
  // Check daily limit
  const todayUploads = await getUserUploadCount(user.id, 'today');
  if (todayUploads >= permissions.dailyLimit) {
    throw new Error('Daily upload limit exceeded');
  }
  
  return true;
};
```

#### Rate Limiting
```typescript
// ✅ Upload rate limiting
const rateLimit = require('express-rate-limit');

const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Different limits based on user role
    const userRole = req.user?.role || 'guest';
    const limits = { guest: 5, user: 20, premium: 100 };
    return limits[userRole];
  },
  message: 'Upload rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/upload', uploadRateLimit, upload.single('file'), handler);
```

### 6. Error Handling and Logging

#### Secure Error Messages
```typescript
// ❌ BAD: Exposing system information
app.post('/upload', (req, res) => {
  try {
    // File processing...
  } catch (error) {
    res.status(500).json({ error: error.message }); // Leaks system info
  }
});

// ✅ GOOD: Generic error messages to users
const handleUploadError = (error, req, res, next) => {
  // Log detailed error for developers
  logger.error('Upload error', {
    error: error.message,
    stack: error.stack,
    file: req.file?.originalname,
    user: req.user?.id,
    ip: req.ip
  });
  
  // Send generic error to user
  const userErrors = {
    'LIMIT_FILE_SIZE': 'File too large',
    'LIMIT_UNEXPECTED_FILE': 'Invalid file',
    'MALWARE_DETECTED': 'Security scan failed',
    'INVALID_FILE_TYPE': 'File type not supported'
  };
  
  const userMessage = userErrors[error.code] || 'Upload failed';
  
  res.status(400).json({
    error: userMessage,
    code: 'UPLOAD_FAILED'
  });
};

app.post('/upload', upload.single('file'), handler, handleUploadError);
```

#### Comprehensive Logging
```typescript
// ✅ Security event logging
const logSecurityEvent = (event, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: event,
    level: 'security',
    ...data
  };
  
  // Log to security system
  securityLogger.warn(logEntry);
  
  // Send to SIEM if critical
  if (data.severity === 'critical') {
    siemIntegration.sendEvent(logEntry);
  }
};

// Usage in upload handler
app.post('/upload', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Log upload attempt
    logSecurityEvent('file_upload_start', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      user: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Process file...
    
    // Log successful upload
    logSecurityEvent('file_upload_success', {
      filename: req.file.originalname,
      processingTime: Date.now() - startTime,
      user: req.user?.id
    });
    
  } catch (error) {
    // Log security violations
    if (error.type === 'security') {
      logSecurityEvent('file_upload_threat', {
        filename: req.file.originalname,
        threat: error.threat,
        severity: error.severity,
        user: req.user?.id,
        ip: req.ip
      });
    }
    
    throw error;
  }
});
```

### 7. Infrastructure Security

#### Container Security
```dockerfile
# ✅ Secure Docker container for file uploads
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S pompelmi && \
    adduser -S pompelmi -u 1001 -G pompelmi

# Set secure directory permissions
RUN mkdir -p /app/uploads && \
    chown -R pompelmi:pompelmi /app && \
    chmod 700 /app/uploads

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init

# Copy application
COPY --chown=pompelmi:pompelmi . /app
WORKDIR /app

# Install dependencies
USER pompelmi
RUN npm ci --only=production

# Security: drop capabilities, read-only filesystem
USER pompelmi
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
```

#### Network Security
```yaml
# Kubernetes network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: upload-service-policy
spec:
  podSelector:
    matchLabels:
      app: upload-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: web-frontend
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to: []  # Allow DNS
    ports:
    - protocol: UDP
      port: 53
```

### 8. Monitoring and Alerting

#### Real-time Security Monitoring
```typescript
// ✅ Real-time threat monitoring
class SecurityMonitor {
  constructor() {
    this.alertThresholds = {
      malwareDetections: 5,     // 5 detections per hour
      failedUploads: 50,        // 50 failed uploads per hour
      largeDayUploads: 1000,    // 1000 uploads per day from single IP
    };
    
    this.metrics = new Map();
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    setInterval(() => {
      this.checkThresholds();
      this.resetHourlyCounters();
    }, 60 * 60 * 1000); // Every hour
  }
  
  recordEvent(type, data) {
    const key = `${type}:${data.ip || 'unknown'}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
    
    // Immediate alerting for critical events
    if (type === 'malware_detected') {
      this.sendImmediateAlert({
        type: 'MALWARE_DETECTED',
        severity: 'CRITICAL',
        data
      });
    }
  }
  
  checkThresholds() {
    for (const [key, count] of this.metrics.entries()) {
      const [type, ip] = key.split(':');
      
      if (type === 'malware_detected' && count >= this.alertThresholds.malwareDetections) {
        this.sendAlert({
          type: 'HIGH_MALWARE_RATE',
          message: `High malware detection rate from IP ${ip}`,
          count,
          ip
        });
        
        // Auto-block IP
        this.blockIP(ip);
      }
    }
  }
  
  async sendAlert(alert) {
    // Send to security team
    await fetch('https://security-alerts.company.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
    
    // Log to security system
    securityLogger.critical('Security alert triggered', alert);
  }
}
```

### 9. Testing and Validation

#### Security Test Suite
```typescript
// ✅ Comprehensive security testing
describe('File Upload Security', () => {
  test('should reject malicious files', async () => {
    const maliciousFile = Buffer.from('<%php system($_GET["cmd"]); %>');
    
    const response = await request(app)
      .post('/upload')
      .attach('file', maliciousFile, 'shell.php')
      .expect(422);
      
    expect(response.body.error).toContain('security');
  });
  
  test('should prevent path traversal', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('test'), '../../../etc/passwd')
      .expect(400);
      
    expect(response.body.error).toContain('Invalid filename');
  });
  
  test('should reject oversized files', async () => {
    const largeFile = Buffer.alloc(20 * 1024 * 1024); // 20MB
    
    const response = await request(app)
      .post('/upload')
      .attach('file', largeFile, 'large.txt')
      .expect(413);
  });
  
  test('should validate MIME types', async () => {
    // Create fake image (text with image extension)
    const fakeImage = Buffer.from('This is not an image');
    
    const response = await request(app)
      .post('/upload')
      .attach('file', fakeImage, 'fake.jpg')
      .set('Content-Type', 'image/jpeg')
      .expect(400);
  });
});

// ✅ Penetration testing automation
const penetrationTests = [
  {
    name: 'PHP Web Shell Upload',
    file: '<?php system($_GET["cmd"]); ?>',
    filename: 'shell.php',
    expectedResult: 'blocked'
  },
  {
    name: 'ZIP Bomb',
    file: fs.readFileSync('test/fixtures/zipbomb.zip'),
    filename: 'bomb.zip',
    expectedResult: 'blocked'
  },
  {
    name: 'SVG with XSS',
    file: '<svg onload="alert(1)">',
    filename: 'xss.svg',
    expectedResult: 'blocked'
  }
];

penetrationTests.forEach(test => {
  it(`should block ${test.name}`, async () => {
    const response = await uploadFile(test.file, test.filename);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
```

## 🚨 Common Security Anti-Patterns to Avoid

### 1. Client-Side Validation Only
```typescript
// ❌ NEVER rely on client-side validation alone
// Client-side code can be bypassed easily
```

### 2. Trusting File Extensions
```typescript
// ❌ BAD: Extension-based validation
if (filename.endsWith('.jpg')) { /* DANGEROUS */ }

// ✅ GOOD: Content-based validation  
const fileType = await detectMimeType(buffer);
```

### 3. Storing in Web-Accessible Locations
```typescript
// ❌ BAD: Files directly accessible
app.use('/uploads', express.static('uploads'));

// ✅ GOOD: Controlled access through API
app.get('/api/files/:id', authenticate, serveFile);
```

### 4. Insufficient Logging
```typescript
// ❌ BAD: No security logging
try {
  processFile(file);
} catch (error) {
  // Silent failure - security blind spot
}

// ✅ GOOD: Comprehensive security logging
logSecurityEvent('file_processing_failed', { 
  error, file: file.name, user: req.user.id 
});
```

## 📋 Pre-Deployment Security Checklist

Before deploying file upload functionality:

- [ ] **Input Validation**: File size, type, and content validation implemented
- [ ] **Malware Scanning**: Real-time threat detection enabled
- [ ] **Access Controls**: Authentication and authorization in place  
- [ ] **Rate Limiting**: Upload frequency limits implemented
- [ ] **Error Handling**: Secure error messages, no information leakage
- [ ] **Logging**: Comprehensive security event logging
- [ ] **Storage Security**: Files stored outside web root with proper permissions
- [ ] **Network Security**: Proper firewall and network policies
- [ ] **Monitoring**: Real-time security monitoring and alerting
- [ ] **Testing**: Security test suite passing
- [ ] **Documentation**: Security procedures documented
- [ ] **Incident Response**: Plan for handling security events

## Conclusion

File upload security requires a defense-in-depth approach combining multiple layers of protection. No single security measure is sufficient—you need comprehensive validation, real-time scanning, proper access controls, and continuous monitoring.

Remember:
- **Validate everything** on the server side
- **Never trust user input**, including file metadata
- **Implement multiple layers** of security
- **Monitor and log** all security events
- **Test your security** regularly with realistic attack scenarios
- **Keep your defenses updated** as new threats emerge

By following this checklist and implementing these best practices, you'll significantly reduce the risk of file upload-based attacks while providing a secure and reliable service to your users.

---

*Need help implementing these security measures? Check out our [Express Security Guide](/blog/express-file-upload-security) and [Next.js Security Guide](/blog/nextjs-file-upload-security) for framework-specific implementations.*