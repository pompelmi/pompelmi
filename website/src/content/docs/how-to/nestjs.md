---
title: Use Pompelmi with NestJS
description: Add automatic file upload malware scanning to a NestJS application using PompelmiModule, PompelmiService, and PompelmiInterceptor.
---

This guide shows how to integrate Pompelmi into a **NestJS** application. You will register the `PompelmiModule`, add the `PompelmiInterceptor` to your file upload endpoints, and optionally inject `PompelmiService` for manual scanning in service-layer code.

> Works with Node **18+** and NestJS 10+. Requires `multer` memory storage — disk storage is not supported.

---

## 1) Install

```bash
pnpm add @pompelmi/nestjs-integration
pnpm add @nestjs/platform-express multer
pnpm add -D @types/multer
```

---

## 2) Register the module

Add `PompelmiModule.forRoot()` to your root module's `imports` array with your scan policy:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { PompelmiModule } from '@pompelmi/nestjs-integration';
import { UploadModule } from './upload/upload.module.js';

@Module({
  imports: [
    PompelmiModule.forRoot({
      // Optional: fail the entire scan pipeline on errors (recommended for production)
      failFast: true,
    }),
    UploadModule,
  ],
})
export class AppModule {}
```

`PompelmiModule.forRoot()` makes `PompelmiService` and `PompelmiInterceptor` available for injection across the application.

---

## 3) Scan uploaded files automatically with PompelmiInterceptor

Use `PompelmiInterceptor` alongside NestJS's built-in file interceptors. It runs after multer buffers the file and throws `BadRequestException` if a `malicious` verdict is returned.

```typescript
// upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiInterceptor } from '@pompelmi/nestjs-integration';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerMemoryStorage(), // required — disk storage is not supported
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
    PompelmiInterceptor,              // scans the buffered file; throws on malicious
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // If we reach here, the file passed the scan.
    // Proceed to storage or processing.
    return {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
```

To use multer's memory storage in a controller, pass the storage option directly:

```typescript
import { memoryStorage } from 'multer';

// Inside the decorator:
FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10_000_000 } })
```

---

## 4) Handle multiple files

`PompelmiInterceptor` handles single files, arrays of files, and field-keyed uploads:

```typescript
// Scan multiple files from one field
@UseInterceptors(FilesInterceptor('files', 5), PompelmiInterceptor)
async uploadMany(@UploadedFiles() files: Express.Multer.File[]) { ... }

// Scan files across multiple named fields
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'document', maxCount: 3 },
  ]),
  PompelmiInterceptor,
)
async uploadFields(@UploadedFiles() files: Record<string, Express.Multer.File[]>) { ... }
```

---

## 5) Manual scanning with PompelmiService

Inject `PompelmiService` directly when you need scan results in your service layer or want to make custom policy decisions:

```typescript
// upload/upload.service.ts
import { Injectable } from '@nestjs/common';
import { PompelmiService } from '@pompelmi/nestjs-integration';

@Injectable()
export class UploadService {
  constructor(private readonly pompelmi: PompelmiService) {}

  async processUpload(file: Express.Multer.File): Promise<{ verdict: string }> {
    const result = await this.pompelmi.scan(file.buffer);

    if (result.verdict === 'malicious') {
      // Log the threat details before rejecting
      console.error('Malicious upload blocked', {
        filename: file.originalname,
        verdict: result.verdict,
        matches: result.matches?.map(m => m.rule),
      });
      throw new Error(`Upload blocked: ${result.reasons?.join(', ')}`);
    }

    if (result.verdict === 'suspicious') {
      // Route suspicious files to a review queue instead of blocking
      await this.sendToReviewQueue(file, result);
      return { verdict: 'pending_review' };
    }

    return { verdict: result.verdict };
  }

  private async sendToReviewQueue(file: Express.Multer.File, result: any) {
    // Your quarantine / review queue logic here
  }
}
```

---

## 6) Async configuration (ConfigService)

Use `PompelmiModule.forRootAsync()` to load scan policy from `ConfigService` or other async providers:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PompelmiModule } from '@pompelmi/nestjs-integration';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PompelmiModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        failFast: config.get<boolean>('SCAN_FAIL_FAST', true),
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 7) Test the flow

```bash
# Clean file — expect 201 Created
curl -F "file=@package.json;type=application/json" http://localhost:3000/upload

# EICAR test string — expect 400 Bad Request with malware details
printf 'X5O!P%%@AP[4\PZX54(P^^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
curl -F "file=@eicar.txt;type=text/plain" http://localhost:3000/upload
```

A malicious file returns:

```json
{
  "statusCode": 400,
  "message": "Malware detected in uploaded file",
  "details": {
    "verdict": "malicious",
    "findings": ["eicar_test_file"],
    "filename": "eicar.txt",
    "mimetype": "text/plain",
    "size": 68
  }
}
```

---

## 8) Production hardening (checklist)

- Add an **auth guard** before `PompelmiInterceptor` to limit who can upload.
- Set `limits.fileSize` in `FileInterceptor` to a value your process can safely hold in memory.
- Enable **rate limiting** on upload endpoints with `@nestjs/throttler`.
- Log scan events to your observability stack — inject `PompelmiService` and call `scan()` manually to get full result metadata.
- Set `failFast: true` in module options to treat scan errors as malicious (fail-closed).
- Never write files to disk before scanning. Always use `memoryStorage()`.

---

## API reference

### `PompelmiModule.forRoot(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `failFast` | `boolean` | `false` | Treat scan errors and timeouts as malicious |
| `scanner` | `PompelmiScanner` | built-in | Custom scanner instance |

### `PompelmiService`

| Method | Signature | Description |
|---|---|---|
| `scan` | `(input: Buffer \| Readable \| string, options?) => Promise<ScanReport>` | Full scan returning verdict, matches, and duration |
| `isMalware` | `(input: Buffer \| Readable \| string, options?) => Promise<boolean>` | Convenience — returns `true` only for `malicious` verdict |
| `getOptions` | `() => PompelmiModuleOptions` | Returns current module configuration |

### `PompelmiInterceptor`

Compatible with all NestJS file interceptors: `FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor`, and `AnyFilesInterceptor`. Throws `BadRequestException` on malicious verdict. Logs a warning for `suspicious` verdicts without blocking.

---

## Troubleshooting

- **`File buffer not available`** → Ensure you are using `memoryStorage()`, not `diskStorage()`. Disk storage does not buffer to `file.buffer`.
- **`BadRequestException` on clean files** → Check your `failFast` setting. An error in the scan pipeline will block uploads when `failFast: true`.
- **Interceptor not running** → Ensure `PompelmiInterceptor` is listed *after* `FileInterceptor` in `@UseInterceptors`. NestJS runs interceptors in order.
- **Module not found** → Verify `@pompelmi/nestjs-integration` is in your `package.json` dependencies, not `devDependencies`.
