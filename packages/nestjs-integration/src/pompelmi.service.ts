import { Injectable, Inject } from '@nestjs/common';
import { Readable } from 'node:stream';
import { scan, isMalware, type ScanOptions, type ScanReport } from '@pompelmi/core';
import { POMPELMI_MODULE_OPTIONS, type PompelmiModuleOptions } from './interfaces.js';

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
   * @returns Promise resolving to a ScanReport
   * 
   * @example
   * ```typescript
   * const result = await pompelmiService.scan(fileBuffer);
   * if (result.verdict === 'malicious') {
   *   throw new Error('Malware detected!');
   * }
   * ```
   */
  async scan(
    input: Buffer | Readable | string,
    options?: ScanOptions,
  ): Promise<ScanReport> {
    const mergedOptions = { ...this.options, ...options };
    return scan(input, mergedOptions);
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
  async isMalware(
    input: Buffer | Readable | string,
    options?: ScanOptions,
  ): Promise<boolean> {
    const mergedOptions = { ...this.options, ...options };
    return isMalware(input, mergedOptions);
  }

  /**
   * Get the current module options.
   */
  getOptions(): PompelmiModuleOptions {
    return { ...this.options };
  }
}
