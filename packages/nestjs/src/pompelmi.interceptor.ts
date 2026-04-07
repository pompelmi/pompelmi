import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { PompelmiService } from "./pompelmi.service.js";

const invalidFilenameCharacters = new RegExp("[\\u0000-\\u001F\\u007F]", "g");
const invalidLogFilenameCharacters = new RegExp("[\\u0000-\\u001F\\u007F%]", "g");

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
  constructor(@Inject(PompelmiService) private readonly pompelmiService: PompelmiService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
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
      } else if (
        typeof request.files === "object" &&
        request.files !== null &&
        !Array.isArray(request.files)
      ) {
        // FileFieldsInterceptor (object with fieldname keys)
        // Use Object.prototype.hasOwnProperty to safely check for own properties
        for (const fieldname in request.files) {
          if (Object.hasOwn(request.files, fieldname)) {
            const fieldFiles = request.files[fieldname];
            if (Array.isArray(fieldFiles)) {
              files.push(...fieldFiles);
            }
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
        message: "File buffer not available. Ensure memoryStorage() is configured.",
        filename: file.originalname,
      });
    }

    const result = await this.pompelmiService.scan(file.buffer);

    if (result.verdict === "malicious") {
      // Sanitize filename to prevent injection attacks
      const sanitizedFilename = String(file.originalname || "unknown").replace(
        invalidFilenameCharacters,
        "",
      );
      throw new BadRequestException({
        message: "Malware detected in uploaded file",
        details: {
          verdict: result.verdict,
          findings: result.findings,
          filename: sanitizedFilename,
          mimetype: file.mimetype,
          size: file.size,
        },
      });
    }

    // Optionally warn about suspicious files (without blocking)
    if (result.verdict === "suspicious") {
      // Sanitize filename for logging to prevent format string attacks
      const sanitizedFilename = String(file.originalname || "unknown").replace(
        invalidLogFilenameCharacters,
        "",
      );
      // In a production system, you might want to log this
      console.warn("Suspicious file detected", {
        filename: sanitizedFilename,
        findings: result.findings,
      });
    }
  }
}
