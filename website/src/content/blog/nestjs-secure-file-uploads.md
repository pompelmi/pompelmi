---
title: "Secure File Uploads in NestJS with Pompelmi"
description: "Integrate Pompelmi's PompelmiModule, PompelmiService, and PompelmiInterceptor into your NestJS application for in-process upload scanning with zero cloud dependencies."
pubDate: 2024-07-01
author: "Pompelmi Team"
tags: ["nestjs", "nodejs", "security", "typescript", "tutorial"]
---

# Secure File Uploads in NestJS with Pompelmi

NestJS applications often serve as the backend for complex systems — document management platforms, healthcare portals, e-commerce sites — where user-uploaded files represent a real attack surface. The `@pompelmi/nestjs-integration` package provides a first-class integration that fits naturally into NestJS's module and decorator system.

**TL;DR:** Register `PompelmiModule.forRoot()` in your app module, inject `PompelmiService` or apply `PompelmiInterceptor` to your controllers, and uploaded bytes are scanned in-process before any business logic runs.

---

## Why In-Process Scanning Matters for NestJS

Cloud-based AV scanning services are convenient, but they introduce several problems for production NestJS apps:

- **Privacy risk**: Files leave your infrastructure. In regulated environments (healthcare, finance, legal), this can create compliance concerns.
- **Latency**: A roundtrip to an external API adds 200–2000 ms per upload — unacceptable for real-time experiences.
- **Vendor dependency**: API rate limits, outages, or pricing changes affect your upload reliability.
- **Missing context**: An external scanner sees raw bytes. Your own scanner knows file metadata, user context, and can apply custom rules.

Pompelmi scans files in your Node.js process — no network call, no data leaving your server.

---

## Installation

```bash
npm install @pompelmi/nestjs-integration @pompelmi/core
# Peer dependency on @nestjs/common is already in your project
```

---

## Module Registration

Register `PompelmiModule` in your root (or feature) module:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { PompelmiModule } from '@pompelmi/nestjs-integration';

@Module({
  imports: [
    PompelmiModule.forRoot({
      // PompelmiModuleOptions extends ScanOptions from @pompelmi/core
      // Add a custom scanner if needed; omit to use the built-in heuristics
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

When scanner options depend on `ConfigService` or other async providers:

```typescript
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
        // Options loaded from environment/config
        scanner: config.get('ENABLE_YARA_SCANNER') ? myYaraScanner : undefined,
      }),
    }),
  ],
})
export class AppModule {}
```

---

## Using PompelmiService Directly

The `PompelmiService` exposes a `scan()` method that accepts a `Buffer`, `Readable` stream, or file path string (inherited from `@pompelmi/core`).

```typescript
// upload.controller.ts
import {
  Controller, Post, UploadedFile, UseInterceptors,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiService } from '@pompelmi/nestjs-integration';
import { memoryStorage } from 'multer';

@Controller('upload')
export class UploadController {
  constructor(private readonly pompelmi: PompelmiService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    const report = await this.pompelmi.scan(file.buffer);

    if (!report.ok) {
      throw new ForbiddenException({
        verdict: report.verdict,
        matches: report.matches.map((m) => m.rule),
        reason: 'File failed security scan',
      });
    }

    // Proceed with storage / processing
    return {
      filename: file.originalname,
      size: file.size,
      verdict: report.verdict,
    };
  }
}
```

`report` is a `ScanReport` from `@pompelmi/core`:

```typescript
interface ScanReport {
  ok: boolean;        // true when verdict === 'clean'
  verdict: 'clean' | 'suspicious' | 'malicious';
  matches: YaraMatch[];
  durationMs?: number;
  error?: string;
}
```

---

## Using PompelmiInterceptor

`PompelmiInterceptor` is a NestJS `NestInterceptor` that scans uploaded files and throws a `ForbiddenException` automatically if the verdict is not clean. Use it when you want declarative security without manual service calls in every handler.

```typescript
import {
  Controller, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiInterceptor } from '@pompelmi/nestjs-integration';
import { memoryStorage } from 'multer';

@Controller('documents')
export class DocumentsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('document', { storage: memoryStorage() }),
    PompelmiInterceptor,
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    // If execution reaches here, the file passed the security scan
    return { ok: true, filename: file.originalname };
  }
}
```

Apply `PompelmiInterceptor` at the controller level to protect all upload routes in that controller:

```typescript
@UseInterceptors(PompelmiInterceptor)
@Controller('uploads')
export class UploadsController { /* ... */ }
```

---

## Custom Scanner Integration

Pass any scanner that implements `PompelmiScanner` (the shared contract across adapters) to `PompelmiModule`:

```typescript
import { PompelmiModule } from '@pompelmi/nestjs-integration';
import {
  composeScanners,
  CommonHeuristicsScanner,
  createZipBombGuard,
} from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({
      maxEntries: 1000,
      maxTotalUncompressedBytes: 200 * 1024 * 1024,
      maxCompressionRatio: 100,
    })],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { parallel: false, stopOn: 'malicious', timeoutMsPerScanner: 3000, tagSourceName: true }
);

@Module({
  imports: [
    PompelmiModule.forRoot({ scanner }),
  ],
})
export class AppModule {}
```

---

## Handling Multiple Files

For `@UploadedFiles()` with `FilesInterceptor`, iterate and scan each file:

```typescript
import {
  Controller, Post, UploadedFiles, UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PompelmiService } from '@pompelmi/nestjs-integration';
import { memoryStorage } from 'multer';

@Controller('batch-upload')
export class BatchUploadController {
  constructor(private readonly pompelmi: PompelmiService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, { storage: memoryStorage() })
  )
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    for (const file of files) {
      const report = await this.pompelmi.scan(file.buffer);
      if (!report.ok) {
        throw new ForbiddenException({
          filename: file.originalname,
          verdict: report.verdict,
        });
      }
    }
    return { ok: true, count: files.length };
  }
}
```

---

## Exception Mapping

Map Pompelmi verdicts to NestJS HTTP exceptions consistently:

```typescript
import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import type { ScanReport } from '@pompelmi/core';

function assertClean(report: ScanReport, filename: string): void {
  if (report.ok) return;

  const status = report.verdict === 'malicious'
    ? HttpStatus.FORBIDDEN
    : HttpStatus.UNPROCESSABLE_ENTITY; // 422 for suspicious

  throw new HttpException(
    {
      ok: false,
      verdict: report.verdict,
      filename,
      rules: report.matches.map((m) => m.rule),
    },
    status
  );
}
```

---

## Production Checklist

- [ ] `memoryStorage()` is used — disk storage lets files hit disk before scanning.
- [ ] `limits.fileSize` is set in the `FileInterceptor` options.
- [ ] `PompelmiModule` is registered globally or in all modules that handle uploads.
- [ ] Scanner errors are logged; consider `failClosed` semantics in your error handler.
- [ ] Test with EICAR test file and known-clean files in your CI pipeline.
- [ ] Pair with `ThrottlerModule` to rate-limit upload endpoints.

---

## Summary

`@pompelmi/nestjs-integration` integrates cleanly with NestJS's DI container and interceptor model. You get `PompelmiService` for manual control and `PompelmiInterceptor` for declarative protection — both building on the same in-process scanner.

**Resources:**

- [Docs: getting started](/pompelmi/getting-started/)
- [GitHub: pompelmi/pompelmi](https://github.com/pompelmi/pompelmi)
- [Blog: Common file upload security mistakes in Node.js](/pompelmi/blog/common-file-upload-mistakes-nodejs/)
- [Blog: Secure upload architecture for regulated industries](/pompelmi/blog/secure-upload-architecture-regulated-industries/)
