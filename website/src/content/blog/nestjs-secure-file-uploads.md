---
title: "Secure File Uploads in NestJS with Interceptors and Review Paths"
description: "Use PompelmiModule, PompelmiInterceptor, and PompelmiService to add in-process upload scanning to NestJS without pushing bytes to a cloud API."
pubDate: 2024-07-01
updatedDate: 2026-03-30
author: "Pompelmi Team"
category: "Framework guide"
tags: ["nestjs", "security", "nodejs", "typescript", "tutorial"]
---

# Secure File Uploads in NestJS with Interceptors and Review Paths

NestJS is a good fit for upload security when you want the decision to live where the rest of your route policy already lives: modules, interceptors, and controller handlers.

## Two useful NestJS patterns

### 1. Interceptor-first

Use `PompelmiInterceptor` when you want the framework to reject obviously bad uploads before your controller logic runs.

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

### 2. Service-driven

Use `PompelmiService` when you want custom handling for `suspicious` uploads, quarantine, or product-specific review logic.

That is often the better path for document portals and mixed enterprise workflows where "reject everything suspicious" is too blunt.

## Important nuance

The current interceptor blocks `malicious` uploads and logs `suspicious` ones. If your route should quarantine or hard-block `suspicious`, do that explicitly in your own service layer.

## Where to go next

Use the canonical [NestJS guide](/pompelmi/how-to/nestjs/) for module setup. If your route needs a review queue, continue to [quarantine / inspect-first-store-later workflows](/pompelmi/use-cases/quarantine-inspect-first-store-later/). Runnable code lives in the [NestJS example](https://github.com/pompelmi/pompelmi/tree/main/examples/nestjs-app).
