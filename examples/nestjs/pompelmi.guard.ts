import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { scanBuffer, Verdict } from 'pompelmi';

/**
 * Guard that scans multer-uploaded files with pompelmi before the handler runs.
 * Throws BadRequestException if any file is infected.
 *
 * Usage:
 *   @UseGuards(PompelmiGuard)
 *   @Post('upload')
 *   @UseInterceptors(FileInterceptor('file'))
 *   uploadFile(@UploadedFile() file: Express.Multer.File) { ... }
 */
@Injectable()
export class PompelmiGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const files: Express.Multer.File[] = req.file
      ? [req.file]
      : Array.isArray(req.files)
      ? req.files
      : Object.values<Express.Multer.File[]>(req.files ?? {}).flat();

    if (files.length === 0) return true;

    for (const file of files) {
      const verdict = await scanBuffer(file.buffer, {
        host: process.env.CLAMD_HOST,
        port: Number(process.env.CLAMD_PORT) || 3310,
      });

      if (verdict === Verdict.Malicious) {
        throw new BadRequestException(
          `Malicious file detected: ${file.originalname}`
        );
      }
    }

    return true;
  }
}
