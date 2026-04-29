# NestJS Integration

Integrate pompelmi into a NestJS application using a custom `PipeTransform` or `Interceptor` to scan uploaded files before they reach your controller.

---

## Setup

```bash
npm install pompelmi @nestjs/platform-express multer
npm install -D @types/multer
```

---

## Custom pipe: `FileScanPipe`

A `PipeTransform` that receives the `Express.Multer.File` object from `FileInterceptor` and rejects it if ClamAV detects malware. Throw `BadRequestException` or `UnprocessableEntityException` as appropriate.

```ts
// file-scan.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { scan, Verdict } from 'pompelmi';

@Injectable()
export class FileScanPipe implements PipeTransform {
  private readonly opts = {
    host: process.env.CLAMAV_HOST,
    port: Number(process.env.CLAMAV_PORT) || 3310,
    timeout: 30_000,
  };

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) throw new BadRequestException('No file uploaded.');

    let result: symbol;
    try {
      result = await scan(file.path, this.opts);
    } catch (err) {
      throw new BadRequestException(`Scan failed: ${(err as Error).message}`);
    }

    if (result === Verdict.Malicious) {
      throw new BadRequestException('Malicious file rejected.');
    }

    if (result === Verdict.ScanError) {
      throw new BadRequestException('Scan incomplete — file rejected.');
    }

    return file;
  }
}
```

---

## Using the pipe in a controller

```ts
// upload.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileScanPipe } from './file-scan.pipe';
import * as diskStorage from 'multer';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads',
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @UploadedFile(FileScanPipe) file: Express.Multer.File,
  ) {
    return { ok: true, filename: file.filename };
  }
}
```

`FileInterceptor` writes the file to `dest` before the pipe runs, so `file.path` is available.

---

## Memory storage with `scanBuffer()`

If you use `multer.memoryStorage()` the file is in `file.buffer`. Update the pipe:

```ts
// file-scan-buffer.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { scanBuffer, Verdict } from 'pompelmi';

@Injectable()
export class FileScanBufferPipe implements PipeTransform {
  private readonly opts = {
    host: process.env.CLAMAV_HOST,
    port: Number(process.env.CLAMAV_PORT) || 3310,
  };

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) throw new BadRequestException('No file uploaded.');

    const result = await scanBuffer(file.buffer, this.opts).catch((err) => {
      throw new BadRequestException(`Scan failed: ${err.message}`);
    });

    if (result !== Verdict.Clean) {
      throw new BadRequestException(`Upload rejected: ${result.description}`);
    }

    return file;
  }
}
```

Controller stays the same; swap `FileScanPipe` for `FileScanBufferPipe`:

```ts
@UseInterceptors(
  FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }),
)
async uploadFile(@UploadedFile(FileScanBufferPipe) file: Express.Multer.File) {
  // file.buffer is the scanned content
  return { ok: true, size: file.size };
}
```

---

## Module setup

Register the pipe as a provider if you want it injectable via DI:

```ts
// upload.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FileScanPipe } from './file-scan.pipe';

@Module({
  controllers: [UploadController],
  providers: [FileScanPipe],
})
export class UploadModule {}
```

Or use it directly inline without DI — the `new FileScanPipe()` form works equally well:

```ts
@UploadedFile(new FileScanPipe())
```

---

## Interceptor approach

An `NestInterceptor` runs around the entire handler. Use this if you want to clean up the file after the handler completes regardless of outcome.

```ts
// scan.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { scan, Verdict } from 'pompelmi';

@Injectable()
export class ScanInterceptor implements NestInterceptor {
  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = ctx.switchToHttp().getRequest();
    const file: Express.Multer.File | undefined = req.file;

    if (!file) return next.handle();

    const result = await scan(file.path, {
      host: process.env.CLAMAV_HOST,
      port: 3310,
    });

    if (result !== Verdict.Clean) {
      throw new BadRequestException(`Upload rejected: ${result.description}`);
    }

    return next.handle();
  }
}
```

Apply it at the controller or handler level:

```ts
@UseInterceptors(FileInterceptor('file', { dest: './uploads' }), ScanInterceptor)
@Post()
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  return { ok: true, filename: file.filename };
}
```

---

## Cleanup on rejection

When the file is rejected, delete it to avoid accumulating rejected uploads on disk:

```ts
import * as fs from 'fs';

if (result !== Verdict.Clean) {
  try { fs.unlinkSync(file.path); } catch {}
  throw new BadRequestException('Malicious file rejected.');
}
```
