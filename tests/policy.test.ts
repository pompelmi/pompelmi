import { describe, it, expect } from 'vitest';
import { definePolicy, DEFAULT_POLICY } from '../src/policy';

describe('security policy', () => {
  describe('definePolicy', () => {
    it('should create default policy', () => {
      const policy = definePolicy();
      
      expect(policy).toBeDefined();
      expect(policy.maxFileSizeBytes).toBeDefined();
      expect(policy.allowedMimeTypes).toBeDefined();
      expect(policy.includeExtensions).toBeDefined();
      expect(policy.timeoutMs).toBeDefined();
      expect(policy.concurrency).toBeDefined();
      expect(policy.failClosed).toBeDefined();
    });

    it('should allow custom maxFileSizeBytes', () => {
      const policy = definePolicy({ maxFileSizeBytes: 5000000 });
      
      expect(policy.maxFileSizeBytes).toBe(5000000);
    });

    it('should allow custom MIME types', () => {
      const mimeTypes = ['image/png', 'image/jpeg'];
      const policy = definePolicy({ allowedMimeTypes: mimeTypes });
      
      expect(policy.allowedMimeTypes).toEqual(mimeTypes);
    });

    it('should allow custom extensions', () => {
      const extensions = ['png', 'jpg', 'pdf'];
      const policy = definePolicy({ includeExtensions: extensions });
      
      expect(policy.includeExtensions).toEqual(extensions);
    });

    it('should allow custom timeout', () => {
      const policy = definePolicy({ timeoutMs: 10000 });
      
      expect(policy.timeoutMs).toBe(10000);
    });

    it('should allow custom concurrency', () => {
      const policy = definePolicy({ concurrency: 8 });
      
      expect(policy.concurrency).toBe(8);
    });

    it('should allow failClosed setting', () => {
      const policy = definePolicy({ failClosed: false });
      
      expect(policy.failClosed).toBe(false);
    });

    it('should throw error for invalid includeExtensions', () => {
      expect(() => {
        definePolicy({ includeExtensions: 'invalid' as any });
      }).toThrow('includeExtensions must be string[]');
    });

    it('should throw error for invalid allowedMimeTypes', () => {
      expect(() => {
        definePolicy({ allowedMimeTypes: 'invalid' as any });
      }).toThrow('allowedMimeTypes must be string[]');
    });

    it('should throw error for invalid maxFileSizeBytes', () => {
      expect(() => {
        definePolicy({ maxFileSizeBytes: -100 });
      }).toThrow('maxFileSizeBytes must be > 0');
    });

    it('should throw error for invalid timeoutMs', () => {
      expect(() => {
        definePolicy({ timeoutMs: 0 });
      }).toThrow('timeoutMs must be > 0');
    });

    it('should throw error for invalid concurrency', () => {
      expect(() => {
        definePolicy({ concurrency: 0 });
      }).toThrow('concurrency must be > 0');
    });

    it('should merge with default policy', () => {
      const policy = definePolicy({ maxFileSizeBytes: 1000000 });
      
      expect(policy.allowedMimeTypes).toEqual(DEFAULT_POLICY.allowedMimeTypes);
      expect(policy.includeExtensions).toEqual(DEFAULT_POLICY.includeExtensions);
    });
  });
});
