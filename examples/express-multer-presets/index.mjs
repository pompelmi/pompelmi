import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import { scan, ReasonCode } from 'pompelmi';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Demo scanner using pompelmi core
const demoScanner = {
  async scan(bytes) {
    const result = await scan(Buffer.from(bytes));
    return result.findingsWithReasons || [];
  }
};

// Route 1: Strict preset (high-security)
app.post('/upload/strict',
  upload.single('file'),
  createUploadGuard({
    scanner: demoScanner,
    maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
    includeExtensions: ['txt', 'pdf', 'jpg', 'png'],
    allowedMimeTypes: ['text/plain', 'application/pdf', 'image/jpeg', 'image/png'],
    failClosed: true,
    onScanEvent: (event) => console.log('[strict]', event)
  }),
  (req, res) => {
    const scanResult = req.pompelmi;
    res.json({
      success: true,
      preset: 'strict',
      fileName: req.file?.originalname,
      verdict: scanResult?.verdict || 'clean',
      findings: scanResult?.findings || [],
      message: 'File passed strict security checks'
    });
  }
);

// Route 2: Balanced preset (recommended)
app.post('/upload/balanced',
  upload.single('file'),
  createUploadGuard({
    scanner: demoScanner,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    includeExtensions: ['txt', 'pdf', 'jpg', 'png', 'zip'],
    allowedMimeTypes: ['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'application/zip'],
    failClosed: true,
    onScanEvent: (event) => console.log('[balanced]', event)
  }),
  (req, res) => {
    const scanResult = req.pompelmi;
    res.json({
      success: true,
      preset: 'balanced',
      fileName: req.file?.originalname,
      verdict: scanResult?.verdict || 'clean',
      findings: scanResult?.findings || [],
      message: 'File passed balanced security checks'
    });
  }
);

// Route 3: Fast preset (performance-optimized)
app.post('/upload/fast',
  upload.single('file'),
  createUploadGuard({
    scanner: demoScanner,
    maxFileSizeBytes: 20 * 1024 * 1024, // 20MB
    includeExtensions: ['txt', 'pdf', 'jpg', 'png', 'zip', 'doc', 'docx'],
    allowedMimeTypes: ['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'application/zip'],
    failClosed: false, // Allow uploads even if scanner has issues
    onScanEvent: (event) => console.log('[fast]', event)
  }),
  (req, res) => {
    const scanResult = req.pompelmi;
    res.json({
      success: true,
      preset: 'fast',
      fileName: req.file?.originalname,
      verdict: scanResult?.verdict || 'clean',
      findings: scanResult?.findings || [],
      message: 'File uploaded with fast security checks'
    });
  }
);

// Route 4: Using reason codes for automated decisions
app.post('/upload/automated',
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const result = await scan(req.file.buffer, { preset: 'balanced' });

      // Check for specific reason codes
      const reasonCodes = result.findingsWithReasons?.map(f => f.reasonCode) || [];
      
      // Auto-reject malware
      if (reasonCodes.some(code => code === ReasonCode.MALWARE_EICAR_TEST)) {
        return res.status(422).json({
          error: 'Malware detected',
          verdict: result.verdict,
          findings: result.findingsWithReasons
        });
      }

      // Quarantine polyglots
      if (reasonCodes.includes(ReasonCode.FILE_POLYGLOT)) {
        return res.status(202).json({
          message: 'File quarantined for review',
          verdict: result.verdict,
          findings: result.findingsWithReasons,
          action: 'quarantine'
        });
      }

      // Allow clean files
      res.json({
        success: true,
        fileName: req.file.originalname,
        verdict: result.verdict,
        findings: result.findingsWithReasons,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({ error: 'Scan failed', message: error.message });
    }
  }
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pompelmi-express-example' });
});

// Info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'pompelmi Express + Multer Example',
    endpoints: {
      'POST /upload/strict': 'Strict preset (5MB, aggressive)',
      'POST /upload/balanced': 'Balanced preset (10MB, recommended)',
      'POST /upload/fast': 'Fast preset (20MB, performant)',
      'POST /upload/automated': 'Automated decisions with reason codes',
      'GET /health': 'Health check',
    },
    usage: 'curl -F "file=@test.txt" http://localhost:3100/upload/balanced'
  });
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`);
  console.log(`\n📝 Test endpoints:`);
  console.log(`   curl -F "file=@test.txt" http://localhost:${PORT}/upload/strict`);
  console.log(`   curl -F "file=@test.txt" http://localhost:${PORT}/upload/balanced`);
  console.log(`   curl -F "file=@test.txt" http://localhost:${PORT}/upload/fast`);
  console.log(`   curl -F "file=@test.txt" http://localhost:${PORT}/upload/automated`);
  console.log(`\n🧪 Test with EICAR:`);
  console.log(`   echo 'X5O!P%@AP[4\\\\PZX54(P^)7CC)7}\\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\\$H+H*' > eicar.txt`);
  console.log(`   curl -F "file=@eicar.txt" http://localhost:${PORT}/upload/automated`);
});
