# @pompelmi/nestjs

NestJS module for [pompelmi](https://pompelmi.app) — in-process ClamAV virus scanning with zero extra dependencies.

## Installation

```bash
npm install @pompelmi/nestjs pompelmi
```

Peer dependencies (install if not already present):

```bash
npm install @nestjs/common @nestjs/core
```

## Module Setup

Register the module globally in your root `AppModule`:

```ts
import { Module } from '@nestjs/common';
import { PompelmiModule } from '@pompelmi/nestjs';

@Module({
  imports: [
    PompelmiModule.forRoot({
      host: 'localhost',
      port: 3310,
      timeout: 5000,
    }),
  ],
})
export class AppModule {}
```

### Async configuration (`forRootAsync`)

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PompelmiModule } from '@pompelmi/nestjs';

PompelmiModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    host: config.get('CLAMAV_HOST'),
    port: config.get<number>('CLAMAV_PORT'),
  }),
  inject: [ConfigService],
})
```

## Service Usage

Inject `PompelmiService` into any provider:

```ts
import { Injectable } from '@nestjs/common';
import { PompelmiService } from '@pompelmi/nestjs';
import { Verdict } from 'pompelmi';

@Injectable()
export class UploadService {
  constructor(private readonly pompelmi: PompelmiService) {}

  async processUpload(buffer: Buffer) {
    const result = await this.pompelmi.scanBuffer(buffer);
    if (result === Verdict.Malicious) throw new Error('Malicious file');

    // Or use the convenience helper:
    const isMalware = await this.pompelmi.isMalware(buffer);
  }
}
```

### Service API

| Method | Signature | Description |
|--------|-----------|-------------|
| `scan` | `scan(filePath: string): Promise<VerdictValue>` | Scan a file by path |
| `scanBuffer` | `scanBuffer(buffer: Buffer): Promise<VerdictValue>` | Scan an in-memory Buffer |
| `scanStream` | `scanStream(stream: Readable): Promise<VerdictValue>` | Scan a Readable stream |
| `isMalware` | `isMalware(buffer: Buffer): Promise<boolean>` | Returns `true` when infected |

## Guard Usage

`PompelmiGuard` implements `CanActivate`. It reads `req.file` (or `req.files[0]`) set by Multer and blocks the request (`canActivate → false`) when the file is malicious.

```ts
import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiGuard } from '@pompelmi/nestjs';

@Controller('upload')
export class UploadController {
  @Post()
  @UseGuards(PompelmiGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { message: 'File is clean', size: file.size };
  }
}
```

Register `PompelmiGuard` as a provider in your module so NestJS can inject `PompelmiService`:

```ts
@Module({
  imports: [PompelmiModule.forRoot({ host: 'localhost', port: 3310 })],
  providers: [PompelmiGuard],
  controllers: [UploadController],
})
export class UploadModule {}
```

## Interceptor Usage

`PompelmiInterceptor` is an alternative to the guard. It throws `BadRequestException` when a malicious file is detected, which NestJS maps to an HTTP 400 response.

```ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiInterceptor } from '@pompelmi/nestjs';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file'), PompelmiInterceptor)
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { message: 'File is clean' };
  }
}
```

## Configuration Reference

All options are forwarded to pompelmi's `ScanOptions`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `string` | — | clamd hostname (enables TCP mode) |
| `port` | `number` | `3310` | clamd port |
| `socket` | `string` | — | UNIX domain socket path |
| `timeout` | `number` | `15000` | Socket idle timeout in ms |
| `retries` | `number` | `0` | Number of retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries in ms |

## License

ISC — see root [LICENSE](../../LICENSE).
