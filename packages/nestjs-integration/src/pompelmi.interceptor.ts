import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PompelmiService } from './pompelmi.service.js';

/**
 * Interceptor that automatically scans uploaded files for malware.
 * 
 * Use with NestJS file upload decorators:
 * - @UseInterceptors(FileInterceptor('file'), PompelmiInterceptor)
 * - @UseInterceptors(FilesInterceptor('files'), PompelmiInterceptor)
 * - @UseInterceptors(FileFieldsInterceptor([...]), PompelmiInterceptor)
 * - @UseInterceptors(AnyFilesInterceptor(), PompelmiInterceptor)
 * 
 * Throws BadRequestException if malware is detected.
 * 
 * @example
 * ```typescript
 * @Controller('upload')
 * export class UploadController {
 *   @Post()
 *   @UseInterceptors(FileInterceptor('file'), PompelmiInterceptor)
 *   async uploadFile(@UploadedFile() file: Express.Multer.File) {
 *     return { message: 'File uploaded successfully' };
 *   }
 * }
 * ```
 */
@Injectable()
export class PompelmiInterceptor implements NestInterceptor {
  constructor(private readonly pompelmiService: PompelmiService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Collect all uploaded files from various sources
    const files: Array<Express.Multer.File> = [];
    
    // Single file upload (@UploadedFile)
    if (request.file) {
      files.push(request.file);
    }
    
    // Multiple files upload (@UploadedFiles)
    if (request.files) {
      if (Array.isArray(request.files)) {
        // FilesInterceptor or AnyFilesInterceptor
        files.push(...request.files);
      } else if (typeof request.files === 'object') {
        // FileFieldsInterceptor (object with fieldname keys)
        for (const fieldname of Object.keys(request.files)) {
          const fieldFiles = request.files[fieldname];
          if (Array.isArray(fieldFiles)) {
            files.push(...fieldFiles);
          }
        }
      }
    }

    // Scan each uploaded file
    for (const file of files) {
      await this.scanFile(file);
    }

    // If we reach here, all files are clean
    return next.handle();
  }

  /**
   * Scan a single file and throw BadRequestException if malware is detected.
   */
  private async scanFile(file: Express.Multer.File): Promise<void> {
    if (!file.buffer) {
      throw new BadRequestException({
        message: 'File buffer not available. Ensure memoryStorage() is configured.',
        filename: file.originalname,
      });
    }

    const result = await this.pompelmiService.scan(file.buffer);

    if (result.verdict === 'malicious') {
      throw new BadRequestException({
        message: 'Malware detected in uploaded file',
        details: {
          verdict: result.verdict,
          findings: result.findings,
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
      });
    }

    // Optionally warn about suspicious files (without blocking)
    if (result.verdict === 'suspicious') {
      // In a production system, you might want to log this
      console.warn(`Suspicious file detected: ${file.originalname}`, {
        findings: result.findings,
      });
    }
  }
}
