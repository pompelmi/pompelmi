import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PompelmiInterceptor } from '@pompelmi/nestjs';
import { ScanService } from './scan.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly scanService: ScanService) {}

  /**
   * Single file upload with automatic scanning via interceptor.
   * Malicious files are automatically rejected.
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'), PompelmiInterceptor)
  async uploadSingleFile(@UploadedFile() file: Express.Multer.File) {
    return {
      message: 'File uploaded and scanned successfully',
      file: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      verdict: 'clean',
    };
  }

  /**
   * Multiple files upload with automatic scanning.
   * All files are scanned; if any is malicious, the entire request is rejected.
   */
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10), PompelmiInterceptor)
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return {
      message: `${files.length} file(s) uploaded and scanned successfully`,
      files: files.map(f => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      })),
      verdict: 'clean',
    };
  }

  /**
   * Manual scanning without interceptor.
   * Demonstrates programmatic usage of PompelmiService.
   */
  @Post('manual')
  @UseInterceptors(FileInterceptor('file'))
  async manualScan(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Manual scanning using the service
    const scanResult = await this.scanService.scanFile(file);

    return {
      message: 'Manual scan completed',
      file: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      scanResult,
    };
  }

  /**
   * Scan text content (not a file upload).
   * Demonstrates scanning arbitrary data.
   */
  @Post('text')
  async scanText(@Body('content') content: string) {
    if (!content) {
      throw new BadRequestException('No content provided');
    }

    const result = await this.scanService.scanContent(content);

    return {
      message: 'Text content scanned',
      result,
    };
  }
}
