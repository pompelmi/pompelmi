import { describe, it, expect } from 'vitest';
import { validateFile } from '../src/validate';

// Node.js doesn't have the browser File API by default — shim it minimally
function makeFile(name: string, type: string, size: number): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('validateFile', () => {
  describe('valid files', () => {
    it('accepts text/plain within size limit', () => {
      const result = validateFile(makeFile('data.txt', 'text/plain', 100));
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts application/json within size limit', () => {
      const result = validateFile(makeFile('data.json', 'application/json', 1024));
      expect(result.valid).toBe(true);
    });

    it('accepts text/csv within size limit', () => {
      const result = validateFile(makeFile('report.csv', 'text/csv', 5 * 1024));
      expect(result.valid).toBe(true);
    });

    it('accepts a file exactly at 5 MB limit', () => {
      const result = validateFile(makeFile('big.txt', 'text/plain', 5 * 1024 * 1024));
      expect(result.valid).toBe(true);
    });

    it('accepts an empty file', () => {
      const result = validateFile(makeFile('empty.txt', 'text/plain', 0));
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid MIME type', () => {
    it('rejects image/jpeg', () => {
      const result = validateFile(makeFile('photo.jpg', 'image/jpeg', 100));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported file type');
    });

    it('rejects application/pdf', () => {
      const result = validateFile(makeFile('doc.pdf', 'application/pdf', 100));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported file type');
    });

    it('rejects application/octet-stream', () => {
      const result = validateFile(makeFile('binary.bin', 'application/octet-stream', 100));
      expect(result.valid).toBe(false);
    });

    it('rejects empty string MIME type', () => {
      const result = validateFile(makeFile('noext', '', 100));
      expect(result.valid).toBe(false);
    });
  });

  describe('file too large', () => {
    it('rejects file exceeding 5 MB', () => {
      const result = validateFile(makeFile('big.txt', 'text/plain', 5 * 1024 * 1024 + 1));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large (max 5 MB)');
    });

    it('rejects very large file', () => {
      const result = validateFile(makeFile('huge.txt', 'text/plain', 100 * 1024 * 1024));
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too large/i);
    });
  });

  describe('mime type checked before size', () => {
    it('reports invalid type even when file is also too large', () => {
      // validateFile checks type first, so invalid type is the returned error
      const result = validateFile(makeFile('big.pdf', 'application/pdf', 100 * 1024 * 1024));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported file type');
    });
  });
});
