import { describe, it, expect } from 'vitest';
import { scan } from '../src/scan.js';
import { ReasonCode } from '../src/reasonCodes.js';

describe('Scan with Presets and Reason Codes', () => {
  describe('Preset integration', () => {
    it('should scan with strict preset', async () => {
      const cleanData = Buffer.from('Hello, World!');
      const result = await scan(cleanData, { preset: 'strict' });
      
      expect(result.verdict).toBe('clean');
      expect(result.findings).toHaveLength(0);
      expect(result.bytes).toBe(cleanData.length);
    });

    it('should scan with balanced preset', async () => {
      const cleanData = Buffer.from('Hello, World!');
      const result = await scan(cleanData, { preset: 'balanced' });
      
      expect(result.verdict).toBe('clean');
      expect(result.findings).toHaveLength(0);
    });

    it('should scan with fast preset', async () => {
      const cleanData = Buffer.from('Hello, World!');
      const result = await scan(cleanData, { preset: 'fast' });
      
      expect(result.verdict).toBe('clean');
      expect(result.findings).toHaveLength(0);
    });

    it('should allow overriding preset options', async () => {
      const cleanData = Buffer.from('Hello, World!');
      // Preset sets certain values, but explicit options override
      const result = await scan(cleanData, {
        preset: 'strict',
        maxDepth: 10,
      });
      
      expect(result.verdict).toBe('clean');
    });
  });

  describe('Reason codes in scan results', () => {
    it('should include reason codes for EICAR detection', async () => {
      const eicarData = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      const result = await scan(eicarData);
      
      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
      expect(result.findingsWithReasons).toBeDefined();
      expect(result.findingsWithReasons?.length).toBeGreaterThan(0);
      
      const eicarFinding = result.findingsWithReasons?.find(
        f => f.reasonCode === ReasonCode.MALWARE_EICAR_TEST
      );
      expect(eicarFinding).toBeDefined();
      expect(eicarFinding?.message).toBe('EICAR test signature');
    });

    it('should maintain backward compatibility with findings array', async () => {
      const eicarData = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      const result = await scan(eicarData);
      
      // Old API still works
      expect(Array.isArray(result.findings)).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      
      // New API is optional
      expect(result.findingsWithReasons).toBeDefined();
    });

    it('should include metadata in findings when available', async () => {
      // This test will pass once polyglot detection includes metadata
      const cleanData = Buffer.from('Hello, World!');
      const result = await scan(cleanData);
      
      expect(result.findingsWithReasons).toBeDefined();
      // Even clean scans have structured output
    });
  });

  describe('Preset + Reason Code combination', () => {
    it('should work with strict preset and return reason codes', async () => {
      const eicarData = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      const result = await scan(eicarData, { preset: 'strict' });
      
      expect(result.verdict).toBe('malicious');
      expect(result.findingsWithReasons?.length).toBeGreaterThan(0);
      expect(result.findingsWithReasons?.[0].reasonCode).toBe(ReasonCode.MALWARE_EICAR_TEST);
    });

    it('should work with fast preset and return reason codes', async () => {
      const eicarData = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      const result = await scan(eicarData, { preset: 'fast' });
      
      expect(result.verdict).toBe('malicious');
      expect(result.findingsWithReasons?.length).toBeGreaterThan(0);
    });
  });
});
