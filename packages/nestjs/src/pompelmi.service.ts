import type { Readable } from "node:stream";
import { Inject, Injectable } from "@nestjs/common";
import { type ScanReport as CoreScanReport, type ScanOptions, scan } from "@pompelmi/core";
import { POMPELMI_MODULE_OPTIONS, type PompelmiModuleOptions } from "./interfaces.js";

export type PompelmiScanInput = Buffer | Readable | string;

export type PompelmiScanReport = CoreScanReport & {
  bytes: number;
  findings: string[];
};

/**
 * Service that wraps the Pompelmi core scanner functionality.
 * Can be injected into any NestJS provider.
 */
@Injectable()
export class PompelmiService {
  constructor(
    @Inject(POMPELMI_MODULE_OPTIONS)
    private readonly options: PompelmiModuleOptions,
  ) {}

  /**
   * Scan input for malware.
   *
   * @param input - Buffer, Readable stream, or string to scan
   * @param options - Optional scan options to override module defaults
   * @returns Promise resolving to a PompelmiScanReport
   *
   * @example
   * ```typescript
   * const result = await pompelmiService.scan(fileBuffer);
   * if (result.verdict === 'malicious') {
   *   throw new Error('Malware detected!');
   * }
   * ```
   */
  async scan(input: PompelmiScanInput, options?: ScanOptions): Promise<PompelmiScanReport> {
    const mergedOptions = { ...this.options, ...options };
    const normalizedInput = typeof input === "string" ? Buffer.from(input) : input;
    const result = await scan(normalizedInput, mergedOptions);

    return {
      ...result,
      bytes: this.getProcessedBytes(normalizedInput, result),
      findings: this.getFindings(result),
    };
  }

  /**
   * Check if input contains malware (convenience method).
   * Returns true only if verdict is 'malicious'.
   *
   * @param input - Buffer, Readable stream, or string to scan
   * @param options - Optional scan options to override module defaults
   * @returns Promise resolving to boolean (true = malware detected)
   *
   * @example
   * ```typescript
   * if (await pompelmiService.isMalware(fileBuffer)) {
   *   throw new BadRequestException('Malware detected');
   * }
   * ```
   */
  async isMalware(input: PompelmiScanInput, options?: ScanOptions): Promise<boolean> {
    const result = await this.scan(input, options);
    return result.verdict === "malicious";
  }

  /**
   * Get the current module options.
   */
  getOptions(): PompelmiModuleOptions {
    return { ...this.options };
  }

  private getProcessedBytes(
    input: Exclude<PompelmiScanInput, string> | Buffer,
    result: CoreScanReport,
  ) {
    if (Buffer.isBuffer(input)) {
      return input.byteLength;
    }

    return result.file?.size ?? 0;
  }

  private getFindings(result: CoreScanReport): string[] {
    return (result.matches ?? []).map((match) => this.describeMatch(match.rule));
  }

  private describeMatch(rule: string): string {
    switch (rule) {
      case "eicar_test_file":
        return "EICAR test signature";
      default:
        return rule;
    }
  }
}
