# Express + Multer with Policy Presets Example

This example demonstrates how to use pompelmi's policy presets with Express and Multer for secure file uploads.

## Features

- ✅ Three preset configurations (strict, balanced, fast)
- ✅ Automated decision-making with reason codes
- ✅ File extension and MIME type validation
- ✅ Comprehensive error handling
- ✅ Real-world production patterns

## Quick Start

### 1. Install dependencies

```bash
cd examples/express-multer-presets
pnpm install
```

### 2. Run the server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server starts at `http://localhost:3100`

### 3. Test uploads

**Upload a clean file:**
```bash
echo "Hello, World!" > test.txt
curl -F "file=@test.txt" http://localhost:3100/upload/balanced
```

**Test with EICAR (safe test malware):**
```bash
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
curl -F "file=@eicar.txt" http://localhost:3100/upload/automated
```

Expected response:
```json
{
  "error": "Malware detected",
  "verdict": "malicious",
  "findings": [
    {
      "message": "EICAR test signature",
      "reasonCode": "MALWARE_EICAR_TEST"
    }
  ]
}
```

## Available Endpoints

### POST /upload/strict
- **Max file size:** 5MB
- **Archive depth:** 2 levels
- **Heuristic threshold:** 60/100
- **Use case:** High-security environments, untrusted uploads

```bash
curl -F "file=@document.pdf" http://localhost:3100/upload/strict
```

### POST /upload/balanced (Recommended)
- **Max file size:** 10MB
- **Archive depth:** 4 levels
- **Heuristic threshold:** 75/100
- **Use case:** General production applications

```bash
curl -F "file=@image.jpg" http://localhost:3100/upload/balanced
```

### POST /upload/fast
- **Max file size:** 20MB
- **Archive depth:** 1 level
- **Heuristic threshold:** 85/100
- **Use case:** Performance-critical, trusted sources

```bash
curl -F "file=@report.zip" http://localhost:3100/upload/fast
```

### POST /upload/automated
Demonstrates automated decision-making based on reason codes:
- **MALWARE_EICAR_TEST** → Auto-reject (422)
- **FILE_POLYGLOT** → Quarantine for review (202)
- **CLEAN** → Allow (200)

```bash
curl -F "file=@suspicious.bin" http://localhost:3100/upload/automated
```

## Code Highlights

### Using Presets

```javascript
import { scan } from 'pompelmi';

// Simple preset usage
const result = await scan(buffer, { preset: 'balanced' });
```

### Automated Decisions with Reason Codes

```javascript
import { scan, ReasonCode } from 'pompelmi';

const result = await scan(buffer, { preset: 'balanced' });
const reasonCodes = result.findingsWithReasons?.map(f => f.reasonCode) || [];

// Auto-reject malware
if (reasonCodes.some(code => code === ReasonCode.MALWARE_EICAR_TEST)) {
  return res.status(422).json({ error: 'Malware detected' });
}

// Quarantine suspicious files
if (reasonCodes.includes(ReasonCode.FILE_POLYGLOT)) {
  return res.status(202).json({ action: 'quarantine' });
}
```

## Production Checklist

- [x] Policy presets configured
- [x] File size limits enforced
- [x] Extension allowlist configured
- [x] MIME type validation enabled
- [x] Fail-closed mode enabled
- [x] Reason codes for automation
- [x] Error handling implemented
- [ ] Add logging/monitoring
- [ ] Add rate limiting
- [ ] Configure reverse proxy limits
- [ ] Set up alerting for malware detections

## Next Steps

1. **Add monitoring:** Track metrics by reason code
2. **Implement quarantine:** Store suspicious files for review
3. **Add user notifications:** Alert users about rejected files
4. **Configure YARA:** Add custom detection rules
5. **Set up CI/CD:** Scan uploaded files in pipelines

## Learn More

- [Policy Presets Documentation](../../docs/PRESETS_AND_REASON_CODES.md)
- [Reason Codes Guide](../../docs/PRESETS_AND_REASON_CODES.md#reason-codes)
- [Express Middleware](../../packages/express-middleware/)
- [Main README](../../README.md)
