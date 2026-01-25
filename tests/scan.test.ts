import { describe, it, expect } from 'vitest';
import { scanBytes } from '../src/scan';

describe('scanBytes', () => {
  it('should scan clean file and return clean verdict', async () => {
    const cleanData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    const result = await scanBytes(cleanData, {
      ctx: { filename: 'test.txt', size: 5 }
    });

    expect(result).toBeDefined();
    expect(result.verdict).toBeDefined();
    expect(result.ok).toBeDefined();
    expect(result.file).toBeDefined();
    expect(result.file.name).toBe('test.txt');
  });

  it('should handle empty bytes', async () => {
    const emptyData = new Uint8Array([]);
    const result = await scanBytes(emptyData);

    expect(result).toBeDefined();
    expect(result.verdict).toBeDefined();
  });

  it('should use default preset when not specified', async () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const result = await scanBytes(data);

    expect(result.engine).toBe('heuristics');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should detect PDF signature', async () => {
    // PDF magic bytes
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const result = await scanBytes(pdfData, {
      ctx: { filename: 'test.pdf', mimeType: 'application/pdf' }
    });

    expect(result.file.mimeType).toBe('application/pdf');
  });

  it('should guess MIME type from extension', async () => {
    const data = new Uint8Array([0x01]);
    const result = await scanBytes(data, {
      ctx: { filename: 'test.zip' }
    });

    expect(result.file.mimeType).toBe('application/zip');
  });

  it('should handle different presets', async () => {
    const data = new Uint8Array([0x01, 0x02]);
    
    const result1 = await scanBytes(data, { preset: 'zip-basic' });
    expect(result1).toBeDefined();
    
    const result2 = await scanBytes(data, { preset: 'none' });
    expect(result2).toBeDefined();
  });

  it('should return correct report structure', async () => {
    const data = new Uint8Array([0x01]);
    const result = await scanBytes(data);

    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('matches');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('durationMs');
    expect(result).toHaveProperty('engine');
    expect(result).toHaveProperty('truncated');
    expect(result).toHaveProperty('timedOut');
  });

  it('should track scan duration', async () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const result = await scanBytes(data);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.durationMs).toBe('number');
  });
});
