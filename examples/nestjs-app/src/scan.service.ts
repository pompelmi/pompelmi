import { BadRequestException, Injectable } from "@nestjs/common";
import type { PompelmiScanReport, PompelmiService } from "@pompelmi/nestjs";

@Injectable()
export class ScanService {
  constructor(private readonly pompelmi: PompelmiService) {}

  /**
   * Scan an uploaded file.
   */
  async scanFile(file: Express.Multer.File): Promise<PompelmiScanReport> {
    if (!file.buffer) {
      throw new BadRequestException("File buffer not available");
    }

    const result = await this.pompelmi.scan(file.buffer);

    if (result.verdict === "malicious") {
      throw new BadRequestException({
        message: "Malware detected",
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
  async scanContent(content: string): Promise<PompelmiScanReport> {
    const result = await this.pompelmi.scan(content);

    if (result.verdict === "malicious") {
      throw new BadRequestException({
        message: "Malicious content detected",
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
