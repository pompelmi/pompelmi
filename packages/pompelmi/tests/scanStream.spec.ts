import { describe, it, expect } from 'vitest';
import { Readable, PassThrough } from 'node:stream';
import { scanStream, scanStreamFromBuffer } from '../src/scanStream';

describe('scanStream', () => {
  describe('Basic stream scanning', () => {
    it('should scan a clean stream', async () => {
      const data = Buffer.from('This is a clean file with no threats');
      const stream = Readable.from(data);

      const result = await scanStream(stream);

      expect(result.verdict).toBe('clean');
      expect(result.findings).toEqual([]);
      expect(result.bytes).toBe(data.length);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect EICAR in stream', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const stream = Readable.from(Buffer.from(eicar));

      const result = await scanStream(stream);

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
      expect(result.bytes).toBe(eicar.length);
    });

    it('should detect EICAR split across chunks', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      
      // Create stream that emits EICAR in multiple chunks
      const stream = new Readable({
        read() {
          this.push(eicar.slice(0, 20));
          this.push(eicar.slice(20, 40));
          this.push(eicar.slice(40));
          this.push(null);
        }
      });

      const result = await scanStream(stream);

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });

    it('should handle empty stream', async () => {
      const stream = Readable.from(Buffer.alloc(0));

      const result = await scanStream(stream);

      expect(result.verdict).toBe('suspicious');
      expect(result.findings).toContain('Empty file');
      expect(result.bytes).toBe(0);
    });
  });

  describe('Magic bytes detection', () => {
    it('should detect PE/DOS executable header', async () => {
      const peHeader = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ header
      const stream = Readable.from(peHeader);

      const result = await scanStream(stream);

      expect(result.verdict).toBe('suspicious');
      expect(result.findings.some(f => f.includes('PE/DOS executable'))).toBe(true);
    });

    it('should detect ELF executable', async () => {
      const elfHeader = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // ELF header
      const stream = Readable.from(elfHeader);

      const result = await scanStream(stream);

      expect(result.verdict).toBe('suspicious');
      expect(result.findings.some(f => f.includes('ELF executable'))).toBe(true);
    });

    it('should detect PHP script in header', async () => {
      const phpScript = Buffer.from('<?php system($_GET["cmd"]); ?>');
      const stream = Readable.from(phpScript);

      const result = await scanStream(stream);

      expect(result.verdict).toBe('suspicious');
      expect(result.findings.some(f => f.includes('Script content detected'))).toBe(true);
    });

    it('should detect shebang in header', async () => {
      const script = Buffer.from('#!/bin/bash\nrm -rf /');
      const stream = Readable.from(script);

      const result = await scanStream(stream);

      expect(result.verdict).toBe('suspicious');
      expect(result.findings.some(f => f.includes('Script content detected'))).toBe(true);
    });
  });

  describe('Memory efficiency', () => {
    it('should respect maxBufferSize limit', async () => {
      // Create 20MB stream
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = 20;
      
      let chunksEmitted = 0;
      const stream = new Readable({
        read() {
          if (chunksEmitted < totalChunks) {
            this.push(Buffer.alloc(chunkSize, 'A'));
            chunksEmitted++;
          } else {
            this.push(null);
          }
        }
      });

      // Set max buffer to 5MB
      const result = await scanStream(stream, { maxBufferSize: 5 * 1024 * 1024 });

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(20 * chunkSize);
      // Should have processed all data but only buffered 5MB
    });

    it('should detect threats within maxBufferSize', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      // Create stream with EICAR in first part, then lots of clean data
      const stream = new Readable({
        read() {
          this.push(eicar);
          this.push(Buffer.alloc(10 * 1024 * 1024, 'A')); // 10MB clean data
          this.push(null);
        }
      });

      const result = await scanStream(stream, { maxBufferSize: 1024 }); // Small buffer

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });

    it('should handle very large files without memory exhaustion', async () => {
      // Simulate scanning 1GB file (in small chunks for test speed)
      const chunkSize = 1024; // 1KB chunks for test
      const totalChunks = 100; // Simulate 100KB (represents 1GB in concept)
      
      let chunksEmitted = 0;
      const stream = new Readable({
        highWaterMark: 16 * 1024,
        read() {
          if (chunksEmitted < totalChunks) {
            this.push(Buffer.alloc(chunkSize, 'X'));
            chunksEmitted++;
          } else {
            this.push(null);
          }
        }
      });

      const result = await scanStream(stream, { maxBufferSize: 10 * 1024 });

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(totalChunks * chunkSize);
    });
  });

  describe('Options handling', () => {
    it('should respect failFast option', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const peHeader = Buffer.from([0x4D, 0x5A]); // MZ
      
      // Stream with multiple threats
      const data = Buffer.concat([peHeader, Buffer.from(' '), Buffer.from(eicar)]);
      const stream = Readable.from(data);

      const result = await scanStream(stream, { failFast: true });

      expect(result.verdict).toBe('malicious');
      // With failFast, should stop early
    });

    it('should customize magic bytes window', async () => {
      const largeHeader = Buffer.alloc(10000, 'A');
      largeHeader[5000] = 0x4D; // MZ at position 5000
      largeHeader[5001] = 0x5A;
      
      const stream = Readable.from(largeHeader);

      // Small window won't catch it
      const result1 = await scanStream(stream, { magicBytesWindow: 100 });
      expect(result1.findings.some(f => f.includes('PE/DOS'))).toBe(false);

      // Large window will catch it
      const stream2 = Readable.from(largeHeader);
      const result2 = await scanStream(stream2, { magicBytesWindow: 6000 });
      expect(result2.findings.some(f => f.includes('PE/DOS'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle stream errors gracefully', async () => {
      const stream = new Readable({
        read() {
          this.emit('error', new Error('Stream read error'));
        }
      });

      await expect(scanStream(stream)).rejects.toThrow('Stream read error');
    });

    it('should handle PassThrough streams', async () => {
      const passThrough = new PassThrough();
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      
      // Write to PassThrough stream
      setTimeout(() => {
        passThrough.write(eicar);
        passThrough.end();
      }, 10);

      const result = await scanStream(passThrough);

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });
  });

  describe('scanStreamFromBuffer helper', () => {
    it('should scan buffer via stream interface', async () => {
      const buffer = Buffer.from('Clean content');
      const result = await scanStreamFromBuffer(buffer);

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(buffer.length);
    });

    it('should scan string via stream interface', async () => {
      const text = 'Clean text content';
      const result = await scanStreamFromBuffer(text);

      expect(result.verdict).toBe('clean');
      expect(result.bytes).toBe(Buffer.from(text).length);
    });

    it('should detect EICAR via buffer helper', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const result = await scanStreamFromBuffer(eicar);

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });
  });

  describe('Real-world scenarios', () => {
    it('should scan realistic text file', async () => {
      const textFile = `
        This is a realistic text file
        with multiple lines
        and various content.
        
        It should be marked as clean.
      `;
      const stream = Readable.from(Buffer.from(textFile));
      const result = await scanStream(stream);

      expect(result.verdict).toBe('clean');
    });

    it('should handle binary data', async () => {
      const binaryData = Buffer.alloc(1000);
      for (let i = 0; i < binaryData.length; i++) {
        binaryData[i] = Math.floor(Math.random() * 256);
      }
      
      const stream = Readable.from(binaryData);
      const result = await scanStream(stream);

      // Should complete without errors
      expect(result.bytes).toBe(1000);
    });

    it('should detect threats in large stream', async () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      
      // Create stream: 1MB clean data + EICAR + 1MB clean data
      const stream = new Readable({
        read() {
          this.push(Buffer.alloc(1024 * 1024, 'A')); // 1MB
          this.push(eicar);
          this.push(Buffer.alloc(1024 * 1024, 'B')); // 1MB
          this.push(null);
        }
      });

      const result = await scanStream(stream);

      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
      expect(result.bytes).toBeGreaterThan(2 * 1024 * 1024);
    });
  });
});
