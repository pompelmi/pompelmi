# NestJS + pompelmi

A NestJS guard (`PompelmiGuard`) that scans multer-uploaded files before the route handler runs.

## Setup

```bash
npm install pompelmi
```

Run a ClamAV daemon:

```bash
docker run -d -p 3310:3310 clamav/clamav:stable
```

## Use

```typescript
import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiGuard } from './pompelmi.guard';

@Controller('files')
export class FilesController {
  @Post('upload')
  @UseGuards(PompelmiGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return { ok: true, name: file.originalname };
  }
}
```

Set environment variables:

```
CLAMD_HOST=127.0.0.1
CLAMD_PORT=3310
```

## Behaviour

- Infected file → `400 Bad Request` with message `"Malicious file detected: <filename>"`
- Clean file → guard passes, handler executes normally
- No file on request → guard passes (no-op)

## Notes

- Multer must be configured with `memoryStorage()` so `file.buffer` is available.
- For disk storage, use `scan(file.path)` instead of `scanBuffer(file.buffer)`.
