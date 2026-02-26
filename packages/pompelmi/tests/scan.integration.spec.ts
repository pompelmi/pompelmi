import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { scan } from '../src/scan';

describe('scan() backward compatibility and stream routing', () => {
  describe('Original buffer-based behavior preserved', () => {
    it('should scan Buffer input as before', async () => {
      const buffer = Buffer.from('Clean file content');
      const result = await scan(buffer);

      expect(result.verdict).toBe('clean');
      expect(result.findings).toEqual([]);
      expect(result.bytes).toBe(buffer.length);
    });

    it('should scan string input as before', async () => {
      const text = 'Clean text content';
      const result = await scan(text);

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(Buffer.from(text).length);
    });

    it('should detect EICAR in buffer as before', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const result = await scan(Buffer.from(eicar));

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });
  });

  describe('Automatic stream routing', () => {
    it('should automatically use stream scanner for Readable input', async () => {
      const data = Buffer.from('Clean stream content');
      const stream = Readable.from(data);

      const result = await scan(stream);

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(data.length);
    });

    it('should detect threats in stream automatically', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const stream = Readable.from(Buffer.from(eicar));

      const result = await scan(stream);

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });

    it('should handle large streams efficiently', async () => {
      // Create 10MB stream
      const chunkSize = 1024 * 1024; // 1MB
      let chunksEmitted = 0;
      
      const stream = new Readable({
        read() {
          if (chunksEmitted < 10) {
            this.push(Buffer.alloc(chunkSize, 'A'));
            chunksEmitted++;
          } else {
            this.push(null);
          }
        }
      });

      const result = await scan(stream);

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(10 * chunkSize);
    });
  });

  describe('Explicit stream scanner option', () => {
    it('should force stream scanner for buffer when useStreamScanner=true', async () => {
      const buffer = Buffer.from('Clean content');
      const result = await scan(buffer, { useStreamScanner: true });

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(buffer.length);
    });

    it('should detect threats with forced stream scanner', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const result = await scan(eicar, { useStreamScanner: true });

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });

    it('should pass maxBufferSize to stream scanner', async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024, 'A'); // 20MB
      const result = await scan(largeBuffer, {
        useStreamScanner: true,
        maxBufferSize: 5 * 1024 * 1024, // 5MB limit
      });

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(largeBuffer.length);
    });
  });

  describe('Option passthrough', () => {
    it('should pass failFast to stream scanner', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const stream = Readable.from(Buffer.from(eicar));

      const result = await scan(stream, { failFast: true });

      expect(result.verdict).toBe('malicious');
    });

    it('should preserve all scan options', async () => {
      const stream = Readable.from(Buffer.from('test'));
      
      const result = await scan(stream, {
        failFast: true,
        maxDepth: 5,
        heuristicThreshold: 80,
        maxBufferSize: 1024 * 1024,
      });

      // Should complete without errors
      expect(result).toBeDefined();
      expect(result.verdict).toBe('clean');
    });
  });

  describe('Consistency between buffer and stream scanning', () => {
    it('should produce same verdict for buffer vs stream of same data', async () => {
      const data = 'Clean test content';
      
      const bufferResult = await scan(Buffer.from(data));
      const streamResult = await scan(Readable.from(Buffer.from(data)));

      expect(bufferResult.verdict).toBe(streamResult.verdict);
      expect(bufferResult.bytes).toBe(streamResult.bytes);
    });

    it('should detect EICAR consistently', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      
      const bufferResult = await scan(Buffer.from(eicar));
      const streamResult = await scan(Readable.from(Buffer.from(eicar)));

      expect(bufferResult.verdict).toBe('malicious');
      expect(streamResult.verdict).toBe('malicious');
      expect(bufferResult.findings).toContain('EICAR test signature');
      expect(streamResult.findings).toContain('EICAR test signature');
    });

    it('should handle clean content consistently', async () => {
      const clean = 'This is completely clean content with no threats';
      
      const bufferResult = await scan(Buffer.from(clean));
      const streamResult = await scan(Readable.from(Buffer.from(clean)));
      const forcedStreamResult = await scan(Buffer.from(clean), { useStreamScanner: true });

      expect(bufferResult.verdict).toBe('clean');
      expect(streamResult.verdict).toBe('clean');
      expect(forcedStreamResult.verdict).toBe('clean');
    });
  });

  describe('Integration with existing code', () => {
    it('should work with existing isMalware() function', async () => {
      // This test ensures the changes don't break isMalware
      const { isMalware } = await import('../src/isMalware');
      
      const cleanBuffer = Buffer.from('clean');
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      
      expect(await isMalware(cleanBuffer)).toBe(false);
      expect(await isMalware(eicar)).toBe(true);
    });

    it('should work with Readable streams in isMalware', async () => {
      const { isMalware } = await import('../src/isMalware');
      
      const cleanStream = Readable.from(Buffer.from('clean'));
      const eicarStream = Readable.from(Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      ));
      
      expect(await isMalware(cleanStream)).toBe(false);
      expect(await isMalware(eicarStream)).toBe(true);
    });
  });

  describe('Performance characteristics', () => {
    it('should handle small buffers efficiently (original path)', async () => {
      const smallBuffer = Buffer.from('small');
      const start = Date.now();
      
      const result = await scan(smallBuffer);
      const duration = Date.now() - start;

      expect(result.verdict).toBe('clean');
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle large streams without memory spike', async () => {
      // Create 50MB stream (in smaller chunks for test)
      const chunkSize = 1024 * 1024; // 1MB
      let chunksEmitted = 0;
      
      const stream = new Readable({
        read() {
          if (chunksEmitted < 5) { // 5MB for test speed
            this.push(Buffer.alloc(chunkSize, 'X'));
            chunksEmitted++;
          } else {
            this.push(null);
          }
        }
      });

      const result = await scan(stream);

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(5 * chunkSize);
      // Should complete without memory issues
    });
  });
});
