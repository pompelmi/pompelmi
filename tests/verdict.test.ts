import { describe, it, expect } from 'vitest';
import { mapMatchesToVerdict } from '../src/verdict';

describe('verdict utilities', () => {
  describe('mapMatchesToVerdict', () => {
    it('should return clean for empty matches', () => {
      const verdict = mapMatchesToVerdict([]);
      expect(verdict).toBe('clean');
    });

    it('should return malicious for critical tags', () => {
      const matches = [
        { rule: 'test', namespace: 'test', tags: ['critical'] }
      ];
      const verdict = mapMatchesToVerdict(matches);
      expect(verdict).toBe('malicious');
    });

    it('should return malicious for malware tag', () => {
      const matches = [
        { rule: 'test', namespace: 'test', tags: ['malware'] }
      ];
      const verdict = mapMatchesToVerdict(matches);
      expect(verdict).toBe('malicious');
    });

    it('should return malicious for trojan in rule name', () => {
      const matches = [
        { rule: 'trojan_test', namespace: 'test' }
      ];
      const verdict = mapMatchesToVerdict(matches);
      expect(verdict).toBe('malicious');
    });

    it('should return suspicious for non-critical matches', () => {
      const matches = [
        { rule: 'suspicious_file', namespace: 'test', tags: ['medium'] }
      ];
      const verdict = mapMatchesToVerdict(matches);
      expect(verdict).toBe('suspicious');
    });

    it('should handle undefined matches', () => {
      const verdict = mapMatchesToVerdict(undefined);
      expect(verdict).toBe('clean');
    });

    it('should detect ransomware', () => {
      const matches = [
        { rule: 'ransom_detector', namespace: 'test' }
      ];
      const verdict = mapMatchesToVerdict(matches);
      expect(verdict).toBe('malicious');
    });
  });
});
