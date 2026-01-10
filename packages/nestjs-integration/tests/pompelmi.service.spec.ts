import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PompelmiService } from '../src/pompelmi.service';
import { POMPELMI_MODULE_OPTIONS } from '../src/interfaces';
import type { PompelmiModuleOptions } from '../src/interfaces';

describe('PompelmiService', () => {
  let service: PompelmiService;

  beforeEach(async () => {
    const options: PompelmiModuleOptions = {
      failFast: true,
      heuristicThreshold: 75,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PompelmiService,
        {
          provide: POMPELMI_MODULE_OPTIONS,
          useValue: options,
        },
      ],
    }).compile();

    service = module.get<PompelmiService>(PompelmiService);
  });

  describe('scan', () => {
    it('should scan a clean buffer', async () => {
      const cleanBuffer = Buffer.from('This is a clean file');
      const result = await service.scan(cleanBuffer);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('clean');
      expect(result.findings).toEqual([]);
      expect(result.bytes).toBe(cleanBuffer.length);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect EICAR test signature', async () => {
      const eicarBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      const result = await service.scan(eicarBuffer);

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
      expect(result.bytes).toBe(eicarBuffer.length);
    });

    it('should scan a string input', async () => {
      const result = await service.scan('Clean text content');

      expect(result.verdict).toBe('clean');
      expect(result.findings).toEqual([]);
    });

    it('should merge custom options with module options', async () => {
      const buffer = Buffer.from('test content');
      
      // Service should use module options by default
      const result1 = await service.scan(buffer);
      expect(result1).toBeDefined();

      // Should allow overriding with scan-specific options
      const result2 = await service.scan(buffer, { failFast: false });
      expect(result2).toBeDefined();
    });
  });

  describe('isMalware', () => {
    it('should return false for clean content', async () => {
      const cleanBuffer = Buffer.from('Clean file content');
      const result = await service.isMalware(cleanBuffer);

      expect(result).toBe(false);
    });

    it('should return true for EICAR signature', async () => {
      const eicarBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      const result = await service.isMalware(eicarBuffer);

      expect(result).toBe(true);
    });

    it('should work with string input', async () => {
      const cleanResult = await service.isMalware('clean text');
      expect(cleanResult).toBe(false);

      const maliciousResult = await service.isMalware(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      expect(maliciousResult).toBe(true);
    });
  });

  describe('getOptions', () => {
    it('should return current module options', () => {
      const options = service.getOptions();

      expect(options).toBeDefined();
      expect(options.failFast).toBe(true);
      expect(options.heuristicThreshold).toBe(75);
    });

    it('should return a copy of options (not reference)', () => {
      const options1 = service.getOptions();
      const options2 = service.getOptions();

      expect(options1).toEqual(options2);
      expect(options1).not.toBe(options2); // Different object references
    });
  });
});
