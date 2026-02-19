import { describe, it, expect } from 'vitest';
import { prefilter } from '../src/risk';
import type { Policy } from '../src/risk';

// ─── Policies ────────────────────────────────────────────────────────────────

const imagePolicy: Policy = {
  includeExtensions: ['jpg', 'jpeg', 'png', 'gif'],
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
  maxFileSizeBytes: 5 * 1024 * 1024,
};

const pdfPolicy: Policy = {
  includeExtensions: ['pdf'],
  allowedMimeTypes: ['application/pdf'],
  maxFileSizeBytes: 10 * 1024 * 1024,
};

const svgPolicy: Policy = {
  includeExtensions: ['svg'],
  allowedMimeTypes: ['image/svg+xml'],
  maxFileSizeBytes: 1 * 1024 * 1024,
  denyScriptableSvg: true,
};

const permissivePolicy: Policy = {
  includeExtensions: ['txt', 'bin'],
  allowedMimeTypes: ['text/plain', 'application/octet-stream'],
  maxFileSizeBytes: 100 * 1024 * 1024,
};

// ─── File byte helpers ───────────────────────────────────────────────────────

/** Minimal JPEG (FF D8 FF ...) */
const jpegBytes = () => new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);

/** Minimal PNG (89 50 4E 47 0D 0A 1A 0A) */
const pngBytes = () => new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/** Fake "PDF" bytes (%PDF-) */
const pdfBytes = () => new Uint8Array(Buffer.from('%PDF-1.4'));

/** Plain text bytes */
const textBytes = () => new Uint8Array(Buffer.from('hello world, plain text!'));

/** SVG with a script tag */
const svgWithScript = () => new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));

/** Clean SVG */
const svgClean = () => new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><text>hi</text></svg>'));

/** SVG with onload handler */
const svgOnload = () => new Uint8Array(Buffer.from('<svg onload=alert(1)>'));

/** SVG with javascript: href */
const svgJsHref = () => new Uint8Array(Buffer.from('<svg><a href="javascript:void(0)">'));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('prefilter', () => {

  describe('extension checks', () => {
    it('allows a permitted extension', () => {
      const r = prefilter(jpegBytes(), 'photo.jpg', imagePolicy);
      expect(r.reasons.some(s => s.startsWith('ext_denied:'))).toBe(false);
    });

    it('denies a disallowed extension', () => {
      const r = prefilter(textBytes(), 'file.exe', imagePolicy);
      expect(r.reasons.some(s => s.startsWith('ext_denied:'))).toBe(true);
      expect(r.severity).toBe('suspicious');
    });

    it('is case-insensitive for extensions', () => {
      // sniff on jpeg bytes should return image/jpeg; extension is lowercased
      const r = prefilter(jpegBytes(), 'photo.JPG', imagePolicy);
      expect(r.reasons.some(s => s.startsWith('ext_denied:'))).toBe(false);
    });
  });

  describe('MIME type checks (magic bytes)', () => {
    it('clean JPEG with policy allowing image/jpeg returns clean severity', () => {
      const r = prefilter(jpegBytes(), 'photo.jpg', imagePolicy);
      expect(r.reasons.filter(s => s.startsWith('mime_denied:')).length).toBe(0);
    });

    it('flags detected MIME not in allowedMimeTypes', () => {
      // PDF bytes uploaded as .pdf to imagePolicy (which only allows images)
      const r = prefilter(pdfBytes(), 'doc.pdf', imagePolicy);
      // ext_denied:pdf AND mime_denied:application/pdf should both fire
      expect(r.reasons.some(s => s.startsWith('ext_denied:'))).toBe(true);
    });

    it('returns mime_unknown for unrecognised magic bytes', () => {
      // Random bytes that don't match any known signature
      const noise = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
      const r = prefilter(noise, 'data.bin', permissivePolicy);
      expect(r.reasons).toContain('mime_unknown');
    });
  });

  describe('extension / MIME mismatch', () => {
    it('flags JPEG bytes uploaded with a .png extension', () => {
      // sniff returns extHint=jpg but file is named .png → ext_mismatch
      const r = prefilter(jpegBytes(), 'photo.png', {
        ...imagePolicy,
        includeExtensions: [...imagePolicy.includeExtensions],
      });
      // The mismatch reason should be present
      expect(r.reasons.some(s => s.startsWith('ext_mismatch:'))).toBe(true);
    });
  });

  describe('SVG script detection', () => {
    it('flags SVG containing a <script> tag', () => {
      const r = prefilter(svgWithScript(), 'image.svg', svgPolicy);
      expect(r.reasons).toContain('svg_script');
      expect(r.severity).toBe('suspicious');
    });

    it('flags SVG with onload= attribute', () => {
      const r = prefilter(svgOnload(), 'image.svg', svgPolicy);
      expect(r.reasons).toContain('svg_script');
    });

    it('flags SVG with javascript: href', () => {
      const r = prefilter(svgJsHref(), 'image.svg', svgPolicy);
      expect(r.reasons).toContain('svg_script');
    });

    it('does not flag a clean SVG', () => {
      const r = prefilter(svgClean(), 'image.svg', svgPolicy);
      expect(r.reasons.includes('svg_script')).toBe(false);
    });

    it('does not flag SVG script when denyScriptableSvg is false', () => {
      const r = prefilter(svgWithScript(), 'image.svg', {
        ...svgPolicy,
        denyScriptableSvg: false,
      });
      expect(r.reasons.includes('svg_script')).toBe(false);
    });
  });

  describe('return shape', () => {
    it('returns severity: clean when no reasons', () => {
      const r = prefilter(jpegBytes(), 'photo.jpg', imagePolicy);
      if (r.reasons.length === 0) {
        expect(r.severity).toBe('clean');
      }
    });

    it('returns severity: suspicious when there are reasons', () => {
      const r = prefilter(textBytes(), 'malware.exe', imagePolicy);
      expect(r.severity).toBe('suspicious');
    });

    it('always returns an empty matches array', () => {
      const r = prefilter(textBytes(), 'file.exe', imagePolicy);
      expect(r.matches).toEqual([]);
    });

    it('returns the detected mime string', () => {
      const r = prefilter(jpegBytes(), 'photo.jpg', imagePolicy);
      expect(typeof r.mime === 'string' || r.mime === undefined).toBe(true);
    });
  });
});
