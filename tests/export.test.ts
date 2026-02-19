import { describe, it, expect } from 'vitest';
import { ScanResultExporter, exportScanResults } from '../src/utils/export';
import type { ScanReport } from '../src/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeReport(
  verdict: 'clean' | 'suspicious' | 'malicious' = 'clean',
  overrides: Partial<ScanReport> = {}
): ScanReport {
  return {
    verdict,
    matches: verdict === 'clean' ? [] : [{ rule: `test_${verdict}`, tags: ['tag1'], strings: [] }],
    ok: verdict === 'clean',
    durationMs: 10,
    reasons: verdict === 'clean' ? [] : [`reason_${verdict}`],
    file: {
      name: `sample_${verdict}.bin`,
      size: 1024,
      mimeType: 'application/octet-stream',
    },
    engine: 'pompelmi',
    ...overrides,
  };
}

const cleanReport  = makeReport('clean');
const suspReport   = makeReport('suspicious');
const malReport    = makeReport('malicious');
const multiReports = [cleanReport, suspReport, malReport];

// ─── ScanResultExporter ──────────────────────────────────────────────────────

describe('ScanResultExporter', () => {
  const exp = new ScanResultExporter();

  // ── toJSON ──────────────────────────────────────────────────────────────

  describe('toJSON', () => {
    it('serialises a single report (simplified)', () => {
      const out = exp.toJSON(cleanReport);
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].verdict).toBe('clean');
    });

    it('serialises an array of reports (simplified)', () => {
      const out = exp.toJSON(multiReports);
      const parsed = JSON.parse(out);
      expect(parsed).toHaveLength(3);
    });

    it('simplified output omits match-level detail', () => {
      const out = exp.toJSON(malReport);
      const parsed = JSON.parse(out);
      expect(typeof parsed[0].matches).toBe('number'); // count, not array
    });

    it('full detail output when includeDetails: true', () => {
      const out = exp.toJSON(malReport, { includeDetails: true });
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed[0].matches)).toBe(true);
    });

    it('prettyPrint produces indented JSON', () => {
      const out = exp.toJSON(cleanReport, { prettyPrint: true });
      expect(out).toContain('\n'); // indented output has newlines
    });

    it('compact JSON (no prettyPrint) has no indentation', () => {
      const out = exp.toJSON(cleanReport, { prettyPrint: false });
      expect(out).not.toMatch(/\n {2}/);
    });

    it('handles report without file property', () => {
      const report = makeReport('clean', { file: undefined });
      const out = exp.toJSON(report);
      expect(() => JSON.parse(out)).not.toThrow();
    });
  });

  // ── toCSV ───────────────────────────────────────────────────────────────

  describe('toCSV', () => {
    it('returns a CSV string with header row', () => {
      const out = exp.toCSV(cleanReport);
      const lines = out.split('\n');
      expect(lines[0]).toContain('filename');
      expect(lines[0]).toContain('verdict');
    });

    it('data row contains verdict value', () => {
      const out = exp.toCSV(cleanReport);
      expect(out).toContain('clean');
    });

    it('handles array of reports', () => {
      const out = exp.toCSV(multiReports);
      const lines = out.split('\n');
      expect(lines.length).toBe(multiReports.length + 1); // header + data rows
    });

    it('includeDetails adds reasons and match_rules columns', () => {
      const out = exp.toCSV(malReport, { includeDetails: true });
      expect(out).toContain('reasons');
      expect(out).toContain('match_rules');
    });

    it('escapes CSV fields containing commas', () => {
      const report = makeReport('clean', { file: { name: 'file,with,commas.txt', size: 0, mimeType: 'text/plain' } });
      const out = exp.toCSV(report);
      expect(out).toContain('"file,with,commas.txt"');
    });

    it('handles missing file info gracefully', () => {
      const report = makeReport('clean', { file: undefined });
      expect(() => exp.toCSV(report)).not.toThrow();
    });
  });

  // ── toMarkdown ──────────────────────────────────────────────────────────

  describe('toMarkdown', () => {
    it('produces a markdown string starting with # Scan Results', () => {
      const out = exp.toMarkdown(cleanReport);
      expect(out).toMatch(/^# Scan Results/);
    });

    it('summary counts are correct', () => {
      const out = exp.toMarkdown(multiReports);
      expect(out).toContain('Clean: 1');
      expect(out).toContain('Suspicious: 1');
      expect(out).toContain('Malicious: 1');
    });

    it('includes file names when present', () => {
      const out = exp.toMarkdown(cleanReport);
      expect(out).toContain('sample_clean.bin');
    });

    it('includeDetails shows match rules', () => {
      const out = exp.toMarkdown(malReport, { includeDetails: true });
      expect(out).toContain('test_malicious');
    });

    it('omits match details when includeDetails is false', () => {
      const out = exp.toMarkdown(malReport, { includeDetails: false });
      expect(out).not.toContain('Match Details');
    });

    it('includes match tags in detail view', () => {
      const report = makeReport('suspicious', {
        matches: [{ rule: 'tagged_rule', tags: ['malware', 'ransomware'], strings: [] }],
      });
      const out = exp.toMarkdown(report, { includeDetails: true });
      expect(out).toContain('malware');
    });

    it('handles report with no file property', () => {
      const report = makeReport('clean', { file: undefined });
      const out = exp.toMarkdown(report);
      expect(out).toContain('Unknown');
    });
  });

  // ── toSARIF ─────────────────────────────────────────────────────────────

  describe('toSARIF', () => {
    it('returns a valid JSON SARIF structure', () => {
      const out = exp.toSARIF(malReport);
      const parsed = JSON.parse(out);
      expect(parsed.version).toBe('2.1.0');
      expect(Array.isArray(parsed.runs)).toBe(true);
    });

    it('clean reports produce no SARIF results', () => {
      const out = exp.toSARIF(cleanReport);
      const parsed = JSON.parse(out);
      expect(parsed.runs[0].results).toHaveLength(0);
    });

    it('malicious report produces error-level SARIF result', () => {
      const out = exp.toSARIF(malReport);
      const parsed = JSON.parse(out);
      expect(parsed.runs[0].results[0].level).toBe('error');
    });

    it('suspicious report produces warning-level SARIF result', () => {
      const out = exp.toSARIF(suspReport);
      const parsed = JSON.parse(out);
      expect(parsed.runs[0].results[0].level).toBe('warning');
    });

    it('prettyPrint produces indented SARIF output', () => {
      const out = exp.toSARIF(malReport, { prettyPrint: true });
      expect(out).toContain('\n');
    });

    it('handles multiple reports', () => {
      const out = exp.toSARIF(multiReports);
      const parsed = JSON.parse(out);
      // clean has no results; suspicious + malicious have one each
      expect(parsed.runs[0].results.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── toHTML ──────────────────────────────────────────────────────────────

  describe('toHTML', () => {
    it('returns a DOCTYPE HTML string', () => {
      const out = exp.toHTML(cleanReport);
      expect(out).toMatch(/^<!DOCTYPE html>/);
    });

    it('includes file name in output', () => {
      const out = exp.toHTML(cleanReport);
      expect(out).toContain('sample_clean.bin');
    });

    it('summary counts appear in output', () => {
      const out = exp.toHTML(multiReports);
      expect(out).toContain('>1<'); // count=1 for each verdict
    });

    it('includeDetails adds match rule list', () => {
      const out = exp.toHTML(malReport, { includeDetails: true });
      expect(out).toContain('test_malicious');
    });

    it('escapes HTML special characters in filenames', () => {
      const report = makeReport('clean', {
        file: { name: '<script>alert(1)</script>', size: 0, mimeType: 'text/plain' },
      });
      const out = exp.toHTML(report);
      expect(out).not.toContain('<script>alert(1)</script>');
      expect(out).toContain('&lt;script&gt;');
    });

    it('handles missing file property without throwing', () => {
      const report = makeReport('clean', { file: undefined });
      expect(() => exp.toHTML(report)).not.toThrow();
    });
  });

  // ── export() dispatcher ─────────────────────────────────────────────────

  describe('export()', () => {
    it('dispatches to toJSON for format=json', () => {
      const out = exp.export(cleanReport, 'json');
      expect(() => JSON.parse(out)).not.toThrow();
    });

    it('dispatches to toCSV for format=csv', () => {
      const out = exp.export(cleanReport, 'csv');
      expect(out).toContain('filename');
    });

    it('dispatches to toMarkdown for format=markdown', () => {
      const out = exp.export(cleanReport, 'markdown');
      expect(out).toContain('# Scan Results');
    });

    it('dispatches to toHTML for format=html', () => {
      const out = exp.export(cleanReport, 'html');
      expect(out).toContain('<!DOCTYPE html>');
    });

    it('dispatches to toSARIF for format=sarif', () => {
      const out = exp.export(cleanReport, 'sarif');
      const parsed = JSON.parse(out);
      expect(parsed.version).toBe('2.1.0');
    });

    it('throws for unknown format', () => {
      expect(() => exp.export(cleanReport, 'xml' as any)).toThrow();
    });
  });
});

// ─── exportScanResults helper ────────────────────────────────────────────────

describe('exportScanResults', () => {
  it('exports JSON via the convenience function', () => {
    const out = exportScanResults(cleanReport, 'json');
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('exports markdown via the convenience function', () => {
    const out = exportScanResults(cleanReport, 'markdown');
    expect(out).toContain('# Scan Results');
  });

  it('passes options through', () => {
    const out = exportScanResults(cleanReport, 'json', { prettyPrint: true });
    expect(out).toContain('\n');
  });
});
