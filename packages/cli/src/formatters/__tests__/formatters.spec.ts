import { describe, it, expect } from 'vitest';
import { formatTable, formatJson, formatSummary } from '../index.js';

describe('formatters', () => {
  const sampleResults = [
    {
      filePath: '/path/to/clean.txt',
      clean: true,
      fileSize: 1024,
      scanTime: 10,
      reason: undefined,
    },
    {
      filePath: '/path/to/malware.exe',
      clean: false,
      fileSize: 2048,
      scanTime: 15,
      reason: 'EICAR test file detected',
    },
    {
      filePath: '/path/to/suspicious.js',
      clean: false,
      fileSize: 512,
      scanTime: 8,
      reason: 'Suspicious pattern detected',
    },
  ];

  describe('formatTable', () => {
    const summary = {
      total: 3,
      clean: 1,
      suspicious: 1,
      malicious: 1,
      errors: 0,
      totalDurationMs: 33,
    };

    it('should format results as a table', () => {
      const output = formatTable(sampleResults, summary, '/path/to');
      
      expect(output).toContain('File');
      expect(output).toContain('Verdict');
      expect(output).toContain('Size');
      expect(output).toContain('clean.txt');
      expect(output).toContain('malware.exe');
      expect(output).toContain('suspicious.js');
    });

    it('should show summary at the bottom', () => {
      const output = formatTable(sampleResults, summary, '/path/to');
      
      expect(output).toContain('Total Files: 3');
      expect(output).toContain('Clean: 1');
      expect(output).toContain('Threats: 2');
    });

    it('should handle empty results', () => {
      const emptySummary = { total: 0, clean: 0, suspicious: 0, malicious: 0, errors: 0, totalDurationMs: 0 };
      const output = formatTable([], emptySummary, '/path/to');
      
      expect(output).toContain('No files scanned');
    });
  });

  describe('formatJson', () => {
    it('should format results as JSON', () => {
      const output = formatJson(sampleResults);
      const parsed = JSON.parse(output);
      
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('results');
      expect(parsed.summary.totalFiles).toBe(3);
      expect(parsed.summary.cleanFiles).toBe(1);
      expect(parsed.summary.threatsFound).toBe(2);
      expect(parsed.results).toHaveLength(3);
    });

    it('should include all result fields', () => {
      const output = formatJson(sampleResults);
      const parsed = JSON.parse(output);
      
      const malwareResult = parsed.results.find((r: any) => r.filePath === '/path/to/malware.exe');
      expect(malwareResult).toBeDefined();
      expect(malwareResult.clean).toBe(false);
      expect(malwareResult.fileSize).toBe(2048);
      expect(malwareResult.scanTime).toBe(15);
      expect(malwareResult.reason).toBe('EICAR test file detected');
    });

    it('should handle empty results', () => {
      const output = formatJson([]);
      const parsed = JSON.parse(output);
      
      expect(parsed.summary.totalFiles).toBe(0);
      expect(parsed.summary.cleanFiles).toBe(0);
      expect(parsed.summary.threatsFound).toBe(0);
      expect(parsed.results).toHaveLength(0);
    });
  });

  describe('formatSummary', () => {
    it('should format results as key=value pairs', () => {
      const output = formatSummary(sampleResults);
      
      expect(output).toContain('TOTAL_FILES=3');
      expect(output).toContain('CLEAN_FILES=1');
      expect(output).toContain('THREATS_FOUND=2');
      expect(output).toContain('HAS_THREATS=true');
    });

    it('should list threat files', () => {
      const output = formatSummary(sampleResults);
      
      expect(output).toContain('THREAT_FILES=/path/to/malware.exe,/path/to/suspicious.js');
    });

    it('should show no threats when all clean', () => {
      const cleanResults = [
        {
          filePath: '/path/to/clean1.txt',
          clean: true,
          fileSize: 1024,
          scanTime: 10,
          reason: undefined,
        },
      ];
      
      const output = formatSummary(cleanResults);
      
      expect(output).toContain('HAS_THREATS=false');
      expect(output).toContain('THREAT_FILES=');
      expect(output).not.toContain('THREAT_FILES=/');
    });

    it('should handle empty results', () => {
      const output = formatSummary([]);
      
      expect(output).toContain('TOTAL_FILES=0');
      expect(output).toContain('CLEAN_FILES=0');
      expect(output).toContain('THREATS_FOUND=0');
      expect(output).toContain('HAS_THREATS=false');
    });
  });
});
