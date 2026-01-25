import { describe, it, expect } from 'vitest';
import { sniff, hasSuspiciousJpegTrailer } from '../src/magic';

describe('magic bytes detection', () => {
  describe('sniff', () => {
    it('should detect PNG signature', () => {
      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = sniff(pngData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('image/png');
      expect(result?.extHint).toBe('png');
      expect(result?.confidence).toBeGreaterThan(0.9);
    });

    it('should detect JPEG signature', () => {
      const jpegData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const result = sniff(jpegData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('image/jpeg');
    });

    it('should detect PDF signature', () => {
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
      const result = sniff(pdfData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('application/pdf');
      expect(result?.extHint).toBe('pdf');
    });

    it('should detect ZIP signature', () => {
      const zipData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const result = sniff(zipData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('application/zip');
      expect(result?.extHint).toBe('zip');
    });

    it('should detect RAR signature', () => {
      const rarData = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
      const result = sniff(rarData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('application/x-rar-compressed');
    });

    it('should detect 7z signature', () => {
      const data7z = new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
      const result = sniff(data7z);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('application/x-7z-compressed');
    });

    it('should detect GIF signature', () => {
      const gifData = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
      const result = sniff(gifData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('image/gif');
    });

    it('should detect PE executable', () => {
      const peData = new Uint8Array([0x4d, 0x5a]); // MZ
      const result = sniff(peData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('application/vnd.microsoft.portable-executable');
    });

    it('should detect ELF executable', () => {
      const elfData = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
      const result = sniff(elfData);
      
      expect(result).toBeDefined();
      expect(result?.mime).toBe('application/x-elf');
    });

    it('should return null for unknown signature', () => {
      const unknownData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const result = sniff(unknownData);
      
      expect(result).toBeNull();
    });

    it('should handle empty data', () => {
      const emptyData = new Uint8Array([]);
      const result = sniff(emptyData);
      
      expect(result).toBeNull();
    });
  });

  describe('hasSuspiciousJpegTrailer', () => {
    it('should detect normal JPEG without suspicious trailer', () => {
      // JPEG with normal ending
      const data = new Uint8Array([0xff, 0xd8, 0xff, ...new Array(100).fill(0), 0xff, 0xd9]);
      const result = hasSuspiciousJpegTrailer(data);
      
      expect(result).toBe(false);
    });

    it('should detect JPEG with suspicious large trailer', () => {
      // JPEG with large trailing data
      const largeTrailer = new Array(2000000).fill(0);
      const data = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xd9, ...largeTrailer]);
      const result = hasSuspiciousJpegTrailer(data);
      
      expect(result).toBe(true);
    });

    it('should respect custom maxTrailer parameter', () => {
      const trailer = new Array(500).fill(0);
      const data = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xd9, ...trailer]);
      
      const result1 = hasSuspiciousJpegTrailer(data, 1000);
      expect(result1).toBe(false);
      
      const result2 = hasSuspiciousJpegTrailer(data, 100);
      expect(result2).toBe(true);
    });
  });
});
