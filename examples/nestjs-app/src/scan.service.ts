import { Injectable, BadRequestException } from '@nestjs/common';
import { PompelmiService } from '@pompelmi/nestjs';
import type { ScanReport } from '@pompelmi/core';

@Injectable()
export class ScanService {
  constructor(private readonly pompelmi: PompelmiService) {}

  /**
   * Scan an uploaded file.
   */
  async scanFile(file: Express.Multer.File): Promise<ScanReport> {
    if (!file.buffer) {
      throw new BadRequestException('File buffer not available');
    }

    const result = await this.pompelmi.scan(file.buffer);

    if (result.verdict === 'malicious') {
      throw new BadRequestException({
        message: 'Malware detected',
        details: {
          verdict: result.verdict,
          findings: result.findings,
          filename: file.originalname,
        },
      });
    }

    return result;
  }

  /**
   * Scan text content.
   */
  async scanContent(content: string): Promise<ScanReport> {
    const result = await this.pompelmi.scan(content);

    if (result.verdict === 'malicious') {
      throw new BadRequestException({
        message: 'Malicious content detected',
        details: {
          verdict: result.verdict,
          findings: result.findings,
        },
      });
    }

    return result;
  }

  /**
   * Quick check if content is malware (boolean result).
   */
  async isMalware(buffer: Buffer): Promise<boolean> {
    return this.pompelmi.isMalware(buffer);
  }

  /**
   * Get current scanner configuration.
   */
  getConfiguration() {
    return this.pompelmi.getOptions();
  }
}
