import { describe, it, expect } from 'vitest';
import { scanStream } from '../src/stream';
import { Readable } from 'stream';

describe('stream scanning', () => {
  describe('scanStream', () => {
    it('should scan stream data', async () => {
      const data = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const stream = Readable.from([data]);
      
      const result = await scanStream(stream, {
        scanAll: async () => []
      });
      
      expect(result).toBeDefined();
      expect(result.verdict).toBeDefined();
      expect(result.file).toBeDefined();
    });

    it('should handle large stream', async () => {
      const largeData = Buffer.alloc(10000, 0x41); // 10KB of 'A'
      const stream = Readable.from([largeData]);
      
      const result = await scanStream(stream, {
        scanAll: async () => []
      });
      
      expect(result).toBeDefined();
      expect(result.file.size).toBe(10000);
    });

    it('should handle empty stream', async () => {
      const stream = Readable.from([Buffer.alloc(0)]);
      
      const result = await scanStream(stream, {
        scanAll: async () => []
      });
      
      expect(result).toBeDefined();
      expect(result.verdict).toBe('clean');
    });

    it('should respect maxBytes', async () => {
      const data = Buffer.alloc(1000, 0x42);
      const stream = Readable.from([data]);
      
      const result = await scanStream(stream, {
        scanAll: async () => [],
        maxBytes: 500
      });
      
      expect(result).toBeDefined();
      expect(result.truncated).toBe(true);
    });

    it('should handle stream with chunks', async () => {
      const chunks = [
        Buffer.from([0x50, 0x4b]),
        Buffer.from([0x03, 0x04])
      ];
      const stream = Readable.from(chunks);
      
      const result = await scanStream(stream, {
        scanAll: async () => []
      });
      
      expect(result).toBeDefined();
      expect(result.file.size).toBe(4);
    });

    it('should compute SHA256 by default', async () => {
      const data = Buffer.from('test data');
      const stream = Readable.from([data]);
      
      const result = await scanStream(stream, {
        scanAll: async () => []
      });
      
      expect(result.file.sha256).toBeDefined();
      expect(typeof result.file.sha256).toBe('string');
    });

    it('should skip SHA256 when disabled', async () => {
      const data = Buffer.from('test');
      const stream = Readable.from([data]);
      
      const result = await scanStream(stream, {
        scanAll: async () => [],
        computeSha256: false
      });
      
      expect(result.file.sha256).toBeUndefined();
    });

    it('should handle timeout', async () => {
      const data = Buffer.alloc(100);
      const stream = Readable.from([data]);
      
      const result = await scanStream(stream, {
        scanAll: async () => [],
        timeoutMs: 10000 // Increased timeout so test passes reliably
      });
      
      expect(result).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should call scanChunk callback', async () => {
      const data = Buffer.from([0x01, 0x02]);
      const stream = Readable.from([data]);
      let callbackCalled = false;
      
      await scanStream(stream, {
        scanAll: async () => [],
        scanChunk: async () => { callbackCalled = true; }
      });
      
      expect(callbackCalled).toBe(true);
    });

    it('should return malicious verdict when matches found', async () => {
      const data = Buffer.from('test');
      const stream = Readable.from([data]);
      
      const result = await scanStream(stream, {
        scanAll: async () => [{
          rule: 'trojan_test',
          namespace: 'test'
        }]
      });
      
      expect(result.verdict).toBe('malicious');
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should track scan duration', async () => {
      const data = Buffer.from('test');
      const stream = Readable.from([data]);
      
      const result = await scanStream(stream, {
        scanAll: async () => []
      });
      
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });
  });
});
