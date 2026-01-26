import { describe, it, expect } from 'vitest';
import {
  ReasonCode,
  getReasonCodeInfo,
  inferReasonCode,
  REASON_CODE_METADATA,
} from '../src/reasonCodes.js';

describe('Reason Codes', () => {
  describe('ReasonCode enum', () => {
    it('should have malware detection codes', () => {
      expect(ReasonCode.MALWARE_SIGNATURE_MATCH).toBe('MALWARE_SIGNATURE_MATCH');
      expect(ReasonCode.MALWARE_YARA_MATCH).toBe('MALWARE_YARA_MATCH');
      expect(ReasonCode.MALWARE_CLAMAV_MATCH).toBe('MALWARE_CLAMAV_MATCH');
      expect(ReasonCode.MALWARE_EICAR_TEST).toBe('MALWARE_EICAR_TEST');
    });

    it('should have archive-related codes', () => {
      expect(ReasonCode.ARCHIVE_TOO_DEEP).toBe('ARCHIVE_TOO_DEEP');
      expect(ReasonCode.ARCHIVE_TOO_MANY_FILES).toBe('ARCHIVE_TOO_MANY_FILES');
      expect(ReasonCode.ARCHIVE_BOMB_DETECTED).toBe('ARCHIVE_BOMB_DETECTED');
      expect(ReasonCode.ARCHIVE_PATH_TRAVERSAL).toBe('ARCHIVE_PATH_TRAVERSAL');
    });

    it('should have file characteristic codes', () => {
      expect(ReasonCode.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
      expect(ReasonCode.FILE_POLYGLOT).toBe('FILE_POLYGLOT');
      expect(ReasonCode.FILE_EMBEDDED_SCRIPT).toBe('FILE_EMBEDDED_SCRIPT');
      expect(ReasonCode.FILE_EXECUTABLE).toBe('FILE_EXECUTABLE');
    });

    it('should have operational codes', () => {
      expect(ReasonCode.SCAN_TIMEOUT).toBe('SCAN_TIMEOUT');
      expect(ReasonCode.SCAN_ERROR).toBe('SCAN_ERROR');
    });

    it('should have clean code', () => {
      expect(ReasonCode.CLEAN).toBe('CLEAN');
    });
  });

  describe('REASON_CODE_METADATA', () => {
    it('should have metadata for all reason codes', () => {
      const codes = Object.values(ReasonCode);
      for (const code of codes) {
        expect(REASON_CODE_METADATA[code]).toBeDefined();
        expect(REASON_CODE_METADATA[code].description).toBeTruthy();
        expect(REASON_CODE_METADATA[code].severity).toMatch(/^(clean|suspicious|malicious)$/);
        expect(typeof REASON_CODE_METADATA[code].actionable).toBe('boolean');
      }
    });

    it('should mark malware codes as malicious', () => {
      expect(REASON_CODE_METADATA[ReasonCode.MALWARE_EICAR_TEST].severity).toBe('malicious');
      expect(REASON_CODE_METADATA[ReasonCode.MALWARE_YARA_MATCH].severity).toBe('malicious');
      expect(REASON_CODE_METADATA[ReasonCode.ARCHIVE_BOMB_DETECTED].severity).toBe('malicious');
    });

    it('should mark suspicious codes appropriately', () => {
      expect(REASON_CODE_METADATA[ReasonCode.FILE_POLYGLOT].severity).toBe('suspicious');
      expect(REASON_CODE_METADATA[ReasonCode.ARCHIVE_TOO_DEEP].severity).toBe('suspicious');
      expect(REASON_CODE_METADATA[ReasonCode.HEURISTIC_SUSPICIOUS].severity).toBe('suspicious');
    });

    it('should mark clean code as clean', () => {
      expect(REASON_CODE_METADATA[ReasonCode.CLEAN].severity).toBe('clean');
    });
  });

  describe('getReasonCodeInfo', () => {
    it('should return complete info for EICAR test', () => {
      const info = getReasonCodeInfo(ReasonCode.MALWARE_EICAR_TEST);
      expect(info).toEqual({
        code: ReasonCode.MALWARE_EICAR_TEST,
        description: 'EICAR test file detected (safe test pattern)',
        severity: 'malicious',
        actionable: true,
      });
    });

    it('should return complete info for polyglot detection', () => {
      const info = getReasonCodeInfo(ReasonCode.FILE_POLYGLOT);
      expect(info.code).toBe(ReasonCode.FILE_POLYGLOT);
      expect(info.severity).toBe('suspicious');
      expect(info.actionable).toBe(true);
    });

    it('should return complete info for archive bomb', () => {
      const info = getReasonCodeInfo(ReasonCode.ARCHIVE_BOMB_DETECTED);
      expect(info.code).toBe(ReasonCode.ARCHIVE_BOMB_DETECTED);
      expect(info.severity).toBe('malicious');
      expect(info.actionable).toBe(true);
    });
  });

  describe('inferReasonCode', () => {
    it('should infer EICAR from finding text', () => {
      expect(inferReasonCode('EICAR test signature')).toBe(ReasonCode.MALWARE_EICAR_TEST);
      expect(inferReasonCode('eicar pattern detected')).toBe(ReasonCode.MALWARE_EICAR_TEST);
    });

    it('should infer YARA match', () => {
      expect(inferReasonCode('YARA rule matched: evil.malware')).toBe(ReasonCode.MALWARE_YARA_MATCH);
    });

    it('should infer ClamAV match', () => {
      expect(inferReasonCode('ClamAV signature detected')).toBe(ReasonCode.MALWARE_CLAMAV_MATCH);
    });

    it('should infer polyglot detection', () => {
      expect(inferReasonCode('Polyglot file: PDF, ZIP')).toBe(ReasonCode.FILE_POLYGLOT);
      expect(inferReasonCode('polyglot detected')).toBe(ReasonCode.FILE_POLYGLOT);
    });

    it('should infer embedded script', () => {
      expect(inferReasonCode('embedded script detected')).toBe(ReasonCode.FILE_EMBEDDED_SCRIPT);
    });

    it('should infer executable', () => {
      expect(inferReasonCode('Executable file type')).toBe(ReasonCode.FILE_EXECUTABLE);
    });

    it('should infer macro detection', () => {
      expect(inferReasonCode('Document contains macros')).toBe(ReasonCode.FILE_MACRO_DETECTED);
    });

    it('should infer archive bomb', () => {
      expect(inferReasonCode('ZIP bomb detected')).toBe(ReasonCode.ARCHIVE_BOMB_DETECTED);
      expect(inferReasonCode('archive bomb characteristics')).toBe(ReasonCode.ARCHIVE_BOMB_DETECTED);
    });

    it('should infer path traversal', () => {
      expect(inferReasonCode('Path traversal attempt')).toBe(ReasonCode.ARCHIVE_PATH_TRAVERSAL);
      expect(inferReasonCode('traversal detected in archive')).toBe(ReasonCode.ARCHIVE_PATH_TRAVERSAL);
    });

    it('should infer archive depth', () => {
      expect(inferReasonCode('Archive too deep')).toBe(ReasonCode.ARCHIVE_TOO_DEEP);
      expect(inferReasonCode('exceeded depth limit')).toBe(ReasonCode.ARCHIVE_TOO_DEEP);
    });

    it('should infer too many files', () => {
      expect(inferReasonCode('too many files in archive')).toBe(ReasonCode.ARCHIVE_TOO_MANY_FILES);
    });

    it('should infer timeout', () => {
      expect(inferReasonCode('scan timeout exceeded')).toBe(ReasonCode.SCAN_TIMEOUT);
    });

    it('should infer heuristic as fallback', () => {
      expect(inferReasonCode('some unknown pattern')).toBe(ReasonCode.HEURISTIC_SUSPICIOUS);
      expect(inferReasonCode('heuristic detection')).toBe(ReasonCode.HEURISTIC_SUSPICIOUS);
    });
  });
});
