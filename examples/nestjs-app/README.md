# NestJS Example with Pompelmi Scanner

This example demonstrates how to integrate the Pompelmi malware scanner into a NestJS application.

## Features

- ✅ Automatic file scanning via interceptor
- ✅ Multiple file upload support
- ✅ Manual scanning via service injection
- ✅ Text content scanning
- ✅ Proper error handling with BadRequestException
- ✅ TypeScript with strict mode

## Installation

```bash
# From the examples/nestjs-app directory
npm install
```

## Running the Example

```bash
npm run start
```

Or with watch mode:

```bash
npm run start:dev
```

The server will start on `http://localhost:3000`.

## Testing

### Upload a Clean File

```bash
npm run test:upload
```

Or manually:

```bash
curl -F "file=@../../samples/sample.txt" http://localhost:3000/upload
```

### Upload a Malicious File (EICAR Test)

```bash
npm run test:malware
```

Or manually:

```bash
echo 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > /tmp/eicar.txt
curl -F "file=@/tmp/eicar.txt" http://localhost:3000/upload
```

Expected response (400 Bad Request):

```json
{
  "statusCode": 400,
  "message": "Malware detected in uploaded file",
  "error": "Bad Request",
  "details": {
    "verdict": "malicious",
    "findings": ["EICAR test signature"],
    "filename": "eicar.txt",
    "mimetype": "text/plain",
    "size": 68
  }
}
```

### Multiple Files

```bash
curl -F "files=@../../samples/sample.txt" -F "files=@../../samples/big.txt" \
  http://localhost:3000/upload/multiple
```

### Manual Scanning

```bash
curl -F "file=@../../samples/sample.txt" http://localhost:3000/upload/manual
```

### Text Content Scanning

```bash
curl -X POST http://localhost:3000/upload/text \
  -H "Content-Type: application/json" \
  -d '{"content":"This is clean text"}'
```

## Available Endpoints

### POST /upload

Single file upload with automatic scanning via `PompelmiInterceptor`.

- Field name: `file`
- Returns: File metadata if clean
- Throws: `BadRequestException` if malware detected

### POST /upload/multiple

Multiple files upload with automatic scanning.

- Field name: `files` (array)
- Max files: 10
- Returns: Array of file metadata if all clean
- Throws: `BadRequestException` if any file is malicious

### POST /upload/manual

Manual scanning without interceptor (demonstrates `PompelmiService` usage).

- Field name: `file`
- Returns: Full scan report including verdict, findings, etc.

### POST /upload/text

Scan text content without file upload.

- Body: `{ "content": "text to scan" }`
- Returns: Scan report

## Project Structure

```
src/
├── main.ts              - Application entry point
├── app.module.ts        - Root module with PompelmiModule configuration
├── upload.controller.ts - File upload endpoints
└── scan.service.ts      - Business logic for scanning
```

## Key Integration Points

### Module Registration

```typescript
// app.module.ts
PompelmiModule.forRoot({
  failFast: true,
  heuristicThreshold: 75,
  maxDepth: 3,
})
```

### Automatic Scanning with Interceptor

```typescript
// upload.controller.ts
@Post()
@UseInterceptors(FileInterceptor('file'), PompelmiInterceptor)
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // File is already scanned at this point
  return { message: 'File is clean' };
}
```

### Manual Scanning with Service

```typescript
// scan.service.ts
@Injectable()
export class ScanService {
  constructor(private readonly pompelmi: PompelmiService) {}

  async scanFile(file: Express.Multer.File) {
    return this.pompelmi.scan(file.buffer);
  }
}
```

## Error Handling

The interceptor automatically throws `BadRequestException` when malware is detected. The exception includes:

- `message`: "Malware detected in uploaded file"
- `details.verdict`: "malicious"
- `details.findings`: Array of matched rules/signatures
- `details.filename`: Original filename
- `details.mimetype`: File MIME type
- `details.size`: File size in bytes

## Next Steps

- Add custom YARA rules for domain-specific threats
- Implement async configuration with ConfigService
- Add file size/type validation
- Set up logging and monitoring
- Deploy with proper production configuration
