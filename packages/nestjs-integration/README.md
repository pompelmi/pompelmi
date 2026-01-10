# @pompelmi/nestjs

NestJS integration module for the Pompelmi malware scanner.

## Installation

```bash
npm install @pompelmi/nestjs @pompelmi/core
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { PompelmiModule } from '@pompelmi/nestjs';

@Module({
  imports: [
    PompelmiModule.forRoot({
      failFast: true,
      heuristicThreshold: 75,
    }),
  ],
})
export class AppModule {}
```

### 2. Use the Interceptor

```typescript
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiInterceptor } from '@pompelmi/nestjs';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file'), PompelmiInterceptor)
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { message: 'File is clean', filename: file.originalname };
  }
}
```

### 3. Use the Service Directly

```typescript
import { Injectable } from '@nestjs/common';
import { PompelmiService } from '@pompelmi/nestjs';

@Injectable()
export class MyService {
  constructor(private readonly pompelmi: PompelmiService) {}

  async scanBuffer(data: Buffer) {
    const result = await this.pompelmi.scan(data);
    
    if (result.verdict === 'malicious') {
      throw new Error('Malware detected!');
    }
    
    return result;
  }
}
```

## Advanced Configuration

### Async Configuration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PompelmiModule } from '@pompelmi/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PompelmiModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        failFast: config.get('SCAN_FAIL_FAST', true),
        heuristicThreshold: config.get('SCAN_THRESHOLD', 75),
        maxDepth: config.get('SCAN_MAX_DEPTH', 3),
      }),
    }),
  ],
})
export class AppModule {}
```

### Custom Scanner

```typescript
PompelmiModule.forRoot({
  scanner: customScannerInstance,
  failFast: true,
})
```

## API

### PompelmiModule

Dynamic module with the following static methods:

- `forRoot(options?: PompelmiModuleOptions): DynamicModule` - Synchronous configuration
- `forRootAsync(options: PompelmiModuleAsyncOptions): DynamicModule` - Asynchronous configuration

### PompelmiService

Injectable service providing:

- `scan(input: Buffer | Readable | string, options?: ScanOptions): Promise<ScanReport>`
- `isMalware(input: Buffer | Readable | string, options?: ScanOptions): Promise<boolean>`

### PompelmiInterceptor

NestJS interceptor that automatically scans uploaded files. Throws `BadRequestException` if malware is detected.

## Options

### PompelmiModuleOptions

```typescript
interface PompelmiModuleOptions {
  scanner?: PompelmiScanner;       // Custom scanner instance
  failFast?: boolean;               // Stop at first threat
  maxDepth?: number;                // Archive recursion depth
  heuristicThreshold?: number;      // Score threshold (0-100)
}
```

## Error Handling

The interceptor throws a `BadRequestException` with the following structure:

```json
{
  "statusCode": 400,
  "message": "Malware detected in uploaded file",
  "error": "Bad Request",
  "details": {
    "verdict": "malicious",
    "findings": ["EICAR test signature"],
    "filename": "suspicious.exe"
  }
}
```

## License

MIT
