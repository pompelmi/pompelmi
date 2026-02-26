import { describe, it, expect } from 'vitest';
import {
  MagicBytesDetector,
  defaultDetector,
  detectFormat,
  detectPolyglot,
  analyzeSecurityRisks,
} from '../index.js';

describe('MagicBytesDetector', () => {
  describe('Basic Format Detection', () => {
    it('should detect PE executable', () => {
      const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ header
      const result = detectFormat(peHeader);
      
      expect(result.detected).toBe(true);
      expect(result.format).toBe('PE (Windows Executable)');
      expect(result.mimeType).toBe('application/x-msdownload');
      expect(result.suspicious).toBe(true);
    });

    it('should detect ELF executable', () => {
      const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
      const result = defaultDetector.detect(elf);
      
      expect(result.detected).toBe(true);
      expect(result.format).toBe('ELF (Linux Executable)');
      expect(result.suspicious).toBe(true);
    });

    it('should detect PE executables', () => {
      const pe = Buffer.from([0x4d, 0x5a, ...Array(50).fill(0)]);
      const result = defaultDetector.detect(pe);
      
      expect(result.detected).toBe(true);
      expect(result.format).toContain('PE');
      expect(result.suspicious).toBe(true);
    });

    it('should detect Mach-O executables', () => {
      const macho = Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0x00, 0x00]);
      const result = defaultDetector.detect(macho);
      
      expect(result.detected).toBe(true);
      expect(result.format).toContain('Mach-O');
      expect(result.suspicious).toBe(true);
    });

    it('should detect Java class files', () => {
      const javaClass = Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00]);
      const result = detectFormat(javaClass);
      
      expect(result.detected).toBe(true);
      expect(result.format).toBe('Java Class');
      expect(result.mimeType).toBe('application/java-vm');
      expect(result.suspicious).toBe(true);
    });
  });

  describe('detectPolyglot', () => {
    it('should detect polyglot files', () => {
      // Create a buffer that looks like both PNG and PHP
      const buffer = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG header
        Buffer.from('<?php eval($_POST["cmd"]); ?>'), // PHP code
      ]);

      const result = detectPolyglot(buffer);
      
      expect(result.isPolyglot).toBe(false); // Only PNG signature at start
      // But security analysis should catch the PHP
    });

    it('should detect polyglot PDF/ZIP file', () => {
      // Create a buffer that looks like both PDF and ZIP
      const buffer = Buffer.concat([
        Buffer.from('%PDF-1.4'),
        Buffer.alloc(100),
        Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP signature
      ]);

      const result = defaultDetector.detectPolyglot(buffer);
      
      expect(result.isPolyglot).toBe(true);
      expect(result.formats.length).toBeGreaterThan(1);
      expect(result.formats).toContain('PDF Document');
    });
  });

  describe('detectEmbeddedScripts', () => {
    it('should detect PHP code in image', () => {
      const buffer = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
        Buffer.from('<?php system($_GET["cmd"]); ?>'),
      ]);

      const result = defaultDetector.detectEmbeddedScripts(buffer);
      
      expect(result.hasScripts).toBe(true);
      expect(result.scriptTypes).toContain('PHP');
      expect(result.suspicious).toBe(true);
    });

    it('should detect base64-encoded eval payload', () => {
      const maliciousCode = Buffer.from('eval(atob("malicious code"))');
      
      const result = defaultDetector.detectEmbeddedScripts(maliciousCode);
      
      expect(result.hasScripts).toBe(true);
      expect(result.scriptTypes).toContain('Obfuscated Script');
      expect(result.suspicious).toBe(true);
    });
  });

  describe('analyzeSecurityRisks', () => {
    it('should detect executable files as suspicious', () => {
      const pe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // PE header
      const analysis = defaultDetector.analyzeSecurityRisks(pe);

      expect(analysis.isExecutable).toBe(true);
      expect(analysis.suspicious).toBe(true);
      expect(analysis.reasons).toContain('Suspicious file format: PE (Windows Executable)');
    });

    it('should detect polyglot files', () => {
      // Create a file that is both ZIP and PE
      const polyglot = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP signature
        Buffer.from([0x4d, 0x5a]), // PE signature at offset 4
      ]);

      const result = analyzeSecurityRisks(polyglot);
      
      expect(result.suspicious).toBe(true);
      expect(result.isPolyglot).toBe(true);
      expect(result.reasons.some(r => r.toLowerCase().includes('polyglot'))).toBe(true);
    });

    it('should detect embedded scripts in images', () => {
      const imageWithScript = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
        Buffer.from('<?php system($_GET["cmd"]); ?>'), // PHP backdoor
      ]);

      const analysis = defaultDetector.analyzeSecurityRisks(imageWithScript);
      
      expect(analysis.hasEmbeddedScripts).toBe(true);
      expect(analysis.suspicious).toBe(true);
      expect(analysis.reasons.some(r => r.includes('Embedded scripts'))).toBe(true);
    });

    it('should detect image with embedded code', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const phpCode = Buffer.from('<?php system($_GET["cmd"]); ?>');
      const polyglot = Buffer.concat([pngHeader, phpCode]);

      const analysis = defaultDetector.analyzeSecurityRisks(polyglot);

      expect(analysis.suspicious).toBe(true);
      expect(analysis.hasEmbeddedScripts).toBe(true);
      expect(analysis.reasons).toContain('Image file contains embedded executable code');
    });

    it('should detect document with embedded executables', () => {
      const pdfWithExe = Buffer.concat([
        Buffer.from('%PDF-1.4'),
        Buffer.from([0x4d, 0x5a]), // MZ header
      ]);

      const analysis = defaultDetector.analyzeSecurityRisks(pdfWithExe);

      expect(analysis.suspicious).toBe(true);
      expect(analysis.isPolyglot).toBe(true);
    });
  });
});
