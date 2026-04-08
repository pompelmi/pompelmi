---
title: Secure file uploads in NestJS
description: Add in-process upload scanning to NestJS with PompelmiModule, PompelmiInterceptor, and memory-backed file interceptors.
---

This is the shortest NestJS path when you want upload scanning to fit into modules, interceptors, and controller decorators.

For the broader upload-boundary model that this controller flow fits into, see [Secure file uploads in Node.js: Beyond Extension and MIME Checks](/blog/secure-file-uploads-nodejs/).

## Install

```bash
npm install pompelmi @pompelmi/nestjs
```

If you use `FileInterceptor()` as shown below, make sure your Nest app also has `@nestjs/platform-express` and `multer`.

## Register the module

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { PompelmiModule } from '@pompelmi/nestjs';
import {
  CommonHeuristicsScanner,
  composeScanners,
  createZipBombGuard,
} from 'pompelmi';

const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard()],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious' }
);

@Module({
  imports: [PompelmiModule.forRoot({ scanner })],
})
export class AppModule {}
```

## Protect an upload controller

```ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PompelmiInterceptor } from '@pompelmi/nestjs';
import { memoryStorage } from 'multer';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
    PompelmiInterceptor
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return { ok: true, file: file.originalname };
  }
}
```

## Important behavior

- `PompelmiInterceptor` requires `memoryStorage()` so the bytes are available before persistence.
- The current interceptor blocks `malicious` uploads and logs `suspicious` ones. If you want custom quarantine behavior for `suspicious`, inject `PompelmiService` and handle the `PompelmiScanReport` directly.
- Keep object storage or database writes outside the interceptor path until you have the verdict you want.

## Continue

- [Secure file uploads in NestJS](/blog/nestjs-secure-file-uploads/)
- [Quarantine / inspect-first-store-later workflows](../use-cases/quarantine-inspect-first-store-later/)
- [Do you need antivirus for file uploads?](../comparisons/do-you-need-antivirus-for-file-uploads/)
- [NestJS example on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples/nestjs-app)
