# Next.js App Router + Policy Presets Example

This example demonstrates pompelmi's policy presets and reason codes in a Next.js App Router application.

## Features

- ✅ Next.js 15 App Router
- ✅ Policy presets via query parameters
- ✅ Automated decisions based on reason codes
- ✅ TypeScript with full type safety
- ✅ API route with comprehensive error handling

## Quick Start

### 1. Install dependencies

```bash
cd examples/nextjs-presets-demo
pnpm install
```

### 2. Run development server

```bash
npm run dev
```

Server starts at `http://localhost:3200`

### 3. Test the API

**Upload with default (balanced) preset:**
```bash
echo "Hello, Next.js!" > test.txt
curl -F "file=@test.txt" http://localhost:3200/api/upload
```

**Upload with strict preset:**
```bash
curl -F "file=@test.txt" "http://localhost:3200/api/upload?preset=strict"
```

**Upload with fast preset:**
```bash
curl -F "file=@test.txt" "http://localhost:3200/api/upload?preset=fast"
```

**Test with EICAR:**
```bash
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
curl -F "file=@eicar.txt" http://localhost:3200/api/upload
```

Expected response:
```json
{
  "success": false,
  "fileName": "eicar.txt",
  "preset": "balanced",
  "verdict": "malicious",
  "action": "test_detected",
  "message": "EICAR test file detected (safe test pattern)",
  "findings": [
    {
      "code": "MALWARE_EICAR_TEST",
      "message": "EICAR test signature",
      "info": {
        "code": "MALWARE_EICAR_TEST",
        "description": "EICAR test file detected (safe test pattern)",
        "severity": "malicious",
        "actionable": true
      }
    }
  ]
}
```

## API Endpoints

### POST /api/upload

Upload and scan a file.

**Query Parameters:**
- `preset` (optional): `strict` | `balanced` | `fast` (default: `balanced`)

**Request Body (multipart/form-data):**
- `file`: File to upload

**Response:**
```typescript
{
  success: boolean;
  fileName: string;
  fileSize: number;
  preset: 'strict' | 'balanced' | 'fast';
  verdict: 'clean' | 'suspicious' | 'malicious';
  action: 'allow' | 'reject' | 'quarantine' | 'test_detected';
  message: string;
  findings: Array<{
    code: string;
    message: string;
    metadata?: Record<string, unknown>;
    info: {
      code: string;
      description: string;
      severity: 'clean' | 'suspicious' | 'malicious';
      actionable: boolean;
    };
  }>;
  stats: {
    durationMs: number;
    bytes: number;
    findingCount: number;
  };
}
```

### GET /api/upload

Get API documentation.

```bash
curl http://localhost:3200/api/upload
```

## Automated Decision Logic

The example implements automated decision-making based on reason codes:

```typescript
// Auto-reject real malware
if (hasMalware && !hasEicar) {
  return { action: 'reject', status: 422 };
}

// Detect EICAR test files
if (hasEicar) {
  return { action: 'test_detected', status: 422 };
}

// Quarantine suspicious files
if (needsReview) {
  return { action: 'quarantine', status: 202 };
}

// Allow clean files
return { action: 'allow', status: 200 };
```

## Code Highlights

### Using Presets in Next.js

```typescript
import { scan } from 'pompelmi';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Scan with preset from query param
  const preset = req.nextUrl.searchParams.get('preset') || 'balanced';
  const result = await scan(buffer, { preset });

  return NextResponse.json({
    verdict: result.verdict,
    findings: result.findingsWithReasons
  });
}
```

### Reason Code Enrichment

```typescript
import { getReasonCodeInfo } from 'pompelmi';

const enrichedFindings = result.findingsWithReasons?.map(f => ({
  code: f.reasonCode,
  message: f.message,
  metadata: f.metadata,
  info: getReasonCodeInfo(f.reasonCode) // Get severity, description, etc.
}));
```

## Production Deployment

### Environment Configuration

```env
# .env.production
NODE_ENV=production
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10MB
POMPELMI_DEFAULT_PRESET=balanced
POMPELMI_FAIL_CLOSED=true
```

### Deployment Checklist

- [x] Policy preset configured
- [x] Reason codes for automation
- [x] Error handling implemented
- [x] TypeScript types enforced
- [ ] Add rate limiting
- [ ] Add authentication
- [ ] Configure file storage (S3, etc.)
- [ ] Set up monitoring/alerting
- [ ] Add request logging
- [ ] Configure CORS if needed

## Next Steps

1. **Add a frontend:** Build React upload UI
2. **Implement quarantine:** Store suspicious files for review
3. **Add webhooks:** Notify on malware detection
4. **Integrate YARA:** Add custom detection rules
5. **Add analytics:** Track upload patterns and threats

## Learn More

- [Policy Presets Documentation](../../docs/PRESETS_AND_REASON_CODES.md)
- [Next.js Adapter](../../packages/next-upload/)
- [Main README](../../README.md)
