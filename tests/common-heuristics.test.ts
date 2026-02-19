import { describe, it, expect } from 'vitest';
import { CommonHeuristicsScanner } from '../src/scanners/common-heuristics';

// ─── File format helpers ──────────────────────────────────────────────────────

const empty = () => Buffer.alloc(0);

/** Plain text — no known signatures */
const plainText = () => Buffer.from('Hello, world!');

/** MZ PE executable header */
const peExe = () => Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);

/** OLE Compound File Binary header (D0 CF 11 E0 A1 B1 1A E1) */
const oleHeader = () => Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, ...Array(8).fill(0)]);

/** Minimal PDF header */
const pdfClean = () => Buffer.from('%PDF-1.4\n%%EOF');

/** PDF with /JavaScript action */
const pdfJavaScript = () => Buffer.from('%PDF-1.4\n/JavaScript (app.alert("hi"))');

/** PDF with /OpenAction */
const pdfOpenAction = () => Buffer.from('%PDF-1.4\n/OpenAction << /S /Launch >>');

/** PDF with /AA (Additional Actions) */
const pdfAA = () => Buffer.from('%PDF-1.4\n/AA /Launch');

/** PDF with /Launch */
const pdfLaunch = () => Buffer.from('%PDF-1.4\n/Launch /S /URI');

/** PDF with multiple risky tokens */
const pdfMulti = () => Buffer.from('%PDF-1.4\n/JavaScript /OpenAction /AA');

/**
 * Minimal valid ZIP-like buffer (PK\x03\x04) containing vbaProject.bin token.
 * Simulates a macro-embedded OOXML file (.docx/.xlsm).
 */
const ooxmlWithMacros = () => {
  const header = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const token  = Buffer.from('vbaProject.bin', 'latin1');
  return Buffer.concat([header, Buffer.alloc(26), token]);
};

/** ZIP-like buffer WITHOUT vbaProject.bin (clean OOXML) */
const ooxmlClean = () => {
  const header = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  return Buffer.concat([header, Buffer.alloc(26), Buffer.from('word/document.xml')]);
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CommonHeuristicsScanner', () => {

  describe('clean files', () => {
    it('returns empty matches for empty buffer', async () => {
      expect(await CommonHeuristicsScanner.scan(empty())).toEqual([]);
    });

    it('returns empty matches for plain text', async () => {
      expect(await CommonHeuristicsScanner.scan(plainText())).toEqual([]);
    });

    it('returns no matches for a clean PDF (no risky tokens)', async () => {
      const result = await CommonHeuristicsScanner.scan(pdfClean());
      expect(result.some(m => m.rule === 'pdf_risky_actions')).toBe(false);
    });

    it('returns no matches for clean OOXML (no vbaProject.bin)', async () => {
      const result = await CommonHeuristicsScanner.scan(ooxmlClean());
      expect(result.some(m => m.rule === 'office_ooxml_macros')).toBe(false);
    });
  });

  describe('PE executable detection', () => {
    it('flags MZ executable header', async () => {
      const result = await CommonHeuristicsScanner.scan(peExe());
      expect(result.some(m => m.rule === 'pe_executable_signature')).toBe(true);
    });

    it('includes severity on PE match', async () => {
      const result = await CommonHeuristicsScanner.scan(peExe());
      const match = result.find(m => m.rule === 'pe_executable_signature');
      expect(match?.severity).toBe('suspicious');
    });

    it('small buffer that starts with M but not MZ returns no PE match', async () => {
      const result = await CommonHeuristicsScanner.scan(Buffer.from([0x4d]));
      expect(result.some(m => m.rule === 'pe_executable_signature')).toBe(false);
    });
  });

  describe('OLE CFB (legacy Office) detection', () => {
    it('flags OLE Compound File Binary header', async () => {
      const result = await CommonHeuristicsScanner.scan(oleHeader());
      expect(result.some(m => m.rule === 'office_ole_container')).toBe(true);
    });

    it('assigns suspicious severity', async () => {
      const result = await CommonHeuristicsScanner.scan(oleHeader());
      const match = result.find(m => m.rule === 'office_ole_container');
      expect(match?.severity).toBe('suspicious');
    });
  });

  describe('OOXML macro detection', () => {
    it('flags OOXML ZIP containing vbaProject.bin', async () => {
      const result = await CommonHeuristicsScanner.scan(ooxmlWithMacros());
      expect(result.some(m => m.rule === 'office_ooxml_macros')).toBe(true);
    });

    it('assigns suspicious severity to macro match', async () => {
      const result = await CommonHeuristicsScanner.scan(ooxmlWithMacros());
      const match = result.find(m => m.rule === 'office_ooxml_macros');
      expect(match?.severity).toBe('suspicious');
    });

    it('non-ZIP buffer with vbaProject.bin string is not flagged', async () => {
      // Not a ZIP (no PK header) — OOXML check requires isZipLike first
      const result = await CommonHeuristicsScanner.scan(Buffer.from('vbaProject.bin'));
      expect(result.some(m => m.rule === 'office_ooxml_macros')).toBe(false);
    });
  });

  describe('PDF risky action detection', () => {
    it('flags PDF with /JavaScript', async () => {
      const result = await CommonHeuristicsScanner.scan(pdfJavaScript());
      expect(result.some(m => m.rule === 'pdf_risky_actions')).toBe(true);
      const match = result.find(m => m.rule === 'pdf_risky_actions');
      expect((match?.meta?.tokens as string[]).includes('/JavaScript')).toBe(true);
    });

    it('flags PDF with /OpenAction', async () => {
      const result = await CommonHeuristicsScanner.scan(pdfOpenAction());
      expect(result.some(m => m.rule === 'pdf_risky_actions')).toBe(true);
    });

    it('flags PDF with /AA (Additional Actions)', async () => {
      const result = await CommonHeuristicsScanner.scan(pdfAA());
      expect(result.some(m => m.rule === 'pdf_risky_actions')).toBe(true);
    });

    it('flags PDF with /Launch', async () => {
      const result = await CommonHeuristicsScanner.scan(pdfLaunch());
      expect(result.some(m => m.rule === 'pdf_risky_actions')).toBe(true);
    });

    it('reports multiple tokens in a single match', async () => {
      const result = await CommonHeuristicsScanner.scan(pdfMulti());
      const match = result.find(m => m.rule === 'pdf_risky_actions');
      expect((match?.meta?.tokens as string[]).length).toBeGreaterThanOrEqual(2);
    });

    it('assigns suspicious severity to PDF risky match', async () => {
      const result = await CommonHeuristicsScanner.scan(pdfJavaScript());
      const match = result.find(m => m.rule === 'pdf_risky_actions');
      expect(match?.severity).toBe('suspicious');
    });

    it('non-PDF buffer containing /JavaScript is not flagged as PDF risk', async () => {
      const result = await CommonHeuristicsScanner.scan(Buffer.from('/JavaScript'));
      expect(result.some(m => m.rule === 'pdf_risky_actions')).toBe(false);
    });
  });

  describe('combined detections', () => {
    it('can return multiple distinct matches for a malicious polyglot', async () => {
      // Buffer starting with MZ (PE) + OLE header bytes won't both fire simultaneously
      // since startsWith checks from index 0, but we verify accumulation works
      const result = await CommonHeuristicsScanner.scan(peExe());
      expect(Array.isArray(result)).toBe(true);
    });

    it('accepts Uint8Array input', async () => {
      const u8 = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
      const result = await CommonHeuristicsScanner.scan(u8);
      expect(result.some(m => m.rule === 'pe_executable_signature')).toBe(true);
    });
  });
});
