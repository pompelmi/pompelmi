import { describe, it, expect } from 'vitest';
import { MagicBytesDetector } from '../detector.js';
import type { MagicBytesSignature } from '../types.js';

describe('MagicBytesDetector - Custom Signatures', () => {
  it('should allow adding custom signatures', () => {
    const detector = new MagicBytesDetector([]);
    
    const customSig: MagicBytesSignature = {
      name: 'Custom Format',
      mimeType: 'application/x-custom',
      extensions: ['.custom'],
      pattern: Buffer.from('CUSTOM'),
    };
    
    detector.addSignature(customSig);
    
    const buffer = Buffer.from('CUSTOM file content');
    const result = detector.detect(buffer);
    
    expect(result.detected).toBe(true);
    expect(result.format).toBe('Custom Format');
  });

  it('should support custom detection functions', () => {
    const detector = new MagicBytesDetector([]);
    
    const customSig: MagicBytesSignature = {
      name: 'Complex Format',
      mimeType: 'application/x-complex',
      extensions: ['.complex'],
      pattern: Buffer.from('DUMMY'), // Not used when detect() is provided
      detect: (buffer: Buffer) => {
        // Complex detection logic
        return buffer.length > 10 && buffer.slice(0, 4).equals(Buffer.from('TEST'));
      },
    };
    
    detector.addSignature(customSig);
    
    const validBuffer = Buffer.from('TEST with more than 10 bytes');
    const invalidBuffer = Buffer.from('TEST');
    
    expect(detector.detect(validBuffer).detected).toBe(true);
    expect(detector.detect(invalidBuffer).detected).toBe(false);
  });

  it('should allow removing signatures', () => {
    const detector = new MagicBytesDetector();
    
    detector.removeSignature('PE (Windows Executable)');
    
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const result = detector.detect(peHeader);
    
    // Should not detect PE anymore
    expect(result.format).not.toBe('PE (Windows Executable)');
  });

  it('should allow adding multiple signatures at once', () => {
    const detector = new MagicBytesDetector([]);
    
    const signatures: MagicBytesSignature[] = [
      {
        name: 'Format A',
        mimeType: 'application/a',
        extensions: ['.a'],
        pattern: Buffer.from('AAA'),
      },
      {
        name: 'Format B',
        mimeType: 'application/b',
        extensions: ['.b'],
        pattern: Buffer.from('BBB'),
      },
    ];
    
    detector.addSignatures(signatures);
    
    expect(detector.detect(Buffer.from('AAA')).format).toBe('Format A');
    expect(detector.detect(Buffer.from('BBB')).format).toBe('Format B');
  });

  it('should support offset-based patterns', () => {
    const detector = new MagicBytesDetector([]);
    
    detector.addSignature({
      name: 'Offset Format',
      mimeType: 'application/x-offset',
      extensions: ['.off'],
      pattern: Buffer.from('MAGIC'),
      offset: 10,
    });
    
    const buffer = Buffer.concat([
      Buffer.alloc(10), // 10 bytes padding
      Buffer.from('MAGIC'),
      Buffer.from(' content'),
    ]);
    
    const result = detector.detect(buffer);
    expect(result.detected).toBe(true);
    expect(result.format).toBe('Offset Format');
  });

  it('should return all matching signatures', () => {
    const detector = new MagicBytesDetector([]);
    
    // Add multiple signatures that match the same pattern
    detector.addSignatures([
      {
        name: 'Format 1',
        mimeType: 'application/1',
        extensions: ['.f1'],
        pattern: Buffer.from('TEST'),
      },
      {
        name: 'Format 2',
        mimeType: 'application/2',
        extensions: ['.f2'],
        pattern: Buffer.from('TEST'),
      },
    ]);
    
    const result = detector.detect(Buffer.from('TEST content'));
    
    expect(result.matches).toBeDefined();
    expect(result.matches?.length).toBe(2);
    expect(result.matches?.map(m => m.name)).toContain('Format 1');
    expect(result.matches?.map(m => m.name)).toContain('Format 2');
  });

  it('should check if specific format exists', () => {
    const detector = new MagicBytesDetector();
    
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const plainText = Buffer.from('Hello World');
    
    expect(detector.hasFormat(peHeader, 'PE (Windows Executable)')).toBe(true);
    expect(detector.hasFormat(plainText, 'PE (Windows Executable)')).toBe(false);
  });

  it('should get all registered signatures', () => {
    const detector = new MagicBytesDetector();
    
    const signatures = detector.getSignatures();
    
    expect(Array.isArray(signatures)).toBe(true);
    expect(signatures.length).toBeGreaterThan(0);
    expect(signatures.some(s => s.name.includes('PE'))).toBe(true);
  });
});

describe('MagicBytesDetector - Archive Detection', () => {
  it('should detect ZIP archives', () => {
    const detector = new MagicBytesDetector();
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    
    const result = detector.detect(zipHeader);
    
    expect(result.detected).toBe(true);
    expect(result.format).toBe('ZIP Archive');
  });

  it('should detect RAR archives', () => {
    const detector = new MagicBytesDetector();
    const rarHeader = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]);
    
    const result = detector.detect(rarHeader);
    
    expect(result.detected).toBe(true);
    expect(result.format).toBe('RAR Archive');
  });

  it('should detect 7-Zip archives', () => {
    const detector = new MagicBytesDetector();
    const sevenZipHeader = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
    
    const result = detector.detect(sevenZipHeader);
    
    expect(result.detected).toBe(true);
    expect(result.format).toBe('7-Zip Archive');
  });
});

describe('MagicBytesDetector - Script Detection', () => {
  it('should detect shell scripts', () => {
    const detector = new MagicBytesDetector();
    const shellScript = Buffer.from('#!/bin/sh\necho "Hello"');
    
    const result = detector.detect(shellScript);
    
    expect(result.detected).toBe(true);
    expect(result.format).toContain('Shell');
    expect(result.suspicious).toBe(true);
  });

  it('should detect Python scripts', () => {
    const detector = new MagicBytesDetector();
    const pythonScript = Buffer.from('#!/usr/bin/env python\nprint("Hello")');
    
    const result = detector.detect(pythonScript);
    
    expect(result.detected).toBe(true);
    expect(result.format).toContain('Python');
    expect(result.suspicious).toBe(true);
  });

  it('should detect PHP files', () => {
    const detector = new MagicBytesDetector();
    const phpFile = Buffer.from('<?php echo "Hello"; ?>');
    
    const result = detector.detect(phpFile);
    
    expect(result.detected).toBe(true);
    expect(result.format).toContain('PHP');
    expect(result.suspicious).toBe(true);
  });
});

describe('MagicBytesDetector - Media Files', () => {
  it('should detect JPEG images', () => {
    const detector = new MagicBytesDetector();
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    
    const result = detector.detect(jpegHeader);
    
    expect(result.detected).toBe(true);
    expect(result.format).toBe('JPEG Image');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('should detect PNG images', () => {
    const detector = new MagicBytesDetector();
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    
    const result = detector.detect(pngHeader);
    
    expect(result.detected).toBe(true);
    expect(result.format).toBe('PNG Image');
  });

  it('should detect WebP images with custom detector', () => {
    const detector = new MagicBytesDetector();
    const webpHeader = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.alloc(4), // File size
      Buffer.from('WEBP'),
    ]);
    
    const result = detector.detect(webpHeader);
    
    expect(result.detected).toBe(true);
    expect(result.format).toBe('WebP Image');
  });
});
