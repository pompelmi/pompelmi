import * as pc from 'picocolors';
import prettyBytes from 'pretty-bytes';
// @ts-ignore - no types available for cli-table3
import Table from 'cli-table3';
import { relative } from 'node:path';
import type { ScanResult } from '../commands/scan.js';

export interface ScanSummary {
  total: number;
  clean: number;
  suspicious: number;
  malicious: number;
  errors: number;
  totalDurationMs: number;
}

/**
 * Format results as a table
 */
export function formatTable(
  results: ScanResult[],
  summary: ScanSummary,
  baseDir: string,
): string {
  const output: string[] = [];

  // Show threats first, then errors, then clean files
  const threats = results.filter(r => r.verdict === 'malicious' || r.verdict === 'suspicious');
  const errors = results.filter(r => r.error);
  const clean = results.filter(r => r.verdict === 'clean' && !r.error);

  // Threats table
  if (threats.length > 0) {
    output.push(pc.red(pc.bold('🚨 THREATS DETECTED')));
    output.push('');

    const table = new Table({
      head: [
        pc.bold('File'),
        pc.bold('Size'),
        pc.bold('Verdict'),
        pc.bold('Findings'),
        pc.bold('Time'),
      ],
      style: { head: [], border: [] },
      colWidths: [40, 12, 15, 40, 10],
      wordWrap: true,
    });

    threats.forEach(result => {
      const verdict =
        result.verdict === 'malicious'
          ? pc.red(pc.bold('MALICIOUS'))
          : pc.yellow('SUSPICIOUS');

      const findings = result.findings.length > 0
        ? result.findings.slice(0, 2).join(', ') + (result.findings.length > 2 ? ` (+${result.findings.length - 2})` : '')
        : '—';

      table.push([
        relative(baseDir, result.file),
        prettyBytes(result.size),
        verdict,
        findings,
        `${result.durationMs}ms`,
      ]);
    });

    output.push(table.toString());
    output.push('');
  }

  // Errors table
  if (errors.length > 0) {
    output.push(pc.yellow('⚠️  ERRORS'));
    output.push('');

    const table = new Table({
      head: [pc.bold('File'), pc.bold('Error')],
      style: { head: [], border: [] },
      colWidths: [50, 50],
      wordWrap: true,
    });

    errors.forEach(result => {
      table.push([
        relative(baseDir, result.file),
        pc.red(result.error || 'Unknown error'),
      ]);
    });

    output.push(table.toString());
    output.push('');
  }

  // Summary
  output.push(pc.bold('📊 SUMMARY'));
  output.push(pc.dim('─'.repeat(60)));
  output.push(`Total files scanned: ${summary.total}`);
  output.push(`${pc.green('✓')} Clean: ${summary.clean}`);
  if (summary.suspicious > 0) {
    output.push(`${pc.yellow('⚠')} Suspicious: ${summary.suspicious}`);
  }
  if (summary.malicious > 0) {
    output.push(`${pc.red('✗')} Malicious: ${summary.malicious}`);
  }
  if (summary.errors > 0) {
    output.push(`${pc.yellow('!')} Errors: ${summary.errors}`);
  }
  output.push(`Duration: ${(summary.totalDurationMs / 1000).toFixed(2)}s`);
  output.push(pc.dim('─'.repeat(60)));

  if (summary.malicious > 0 || summary.suspicious > 0) {
    output.push('');
    output.push(pc.red(pc.bold('❌ SCAN FAILED: Threats detected')));
    output.push(pc.yellow('Exit code: 1'));
  } else if (summary.errors > 0) {
    output.push('');
    output.push(pc.yellow('⚠️  SCAN COMPLETED WITH ERRORS'));
  } else {
    output.push('');
    output.push(pc.green(pc.bold('✅ SCAN PASSED: No threats detected')));
  }

  return output.join('\n');
}

/**
 * Format results as JSON
 */
export function formatJson(
  results: ScanResult[],
  summary: ScanSummary,
  baseDir: string,
): string {
  return JSON.stringify(
    {
      summary,
      results: results.map(r => ({
        ...r,
        file: relative(baseDir, r.file),
      })),
    },
    null,
    2,
  );
}

/**
 * Format results as a summary (CI/CD friendly)
 */
export function formatSummary(
  results: ScanResult[],
  summary: ScanSummary,
  baseDir: string,
): string {
  const output: string[] = [];

  output.push(`SCAN_TOTAL=${summary.total}`);
  output.push(`SCAN_CLEAN=${summary.clean}`);
  output.push(`SCAN_SUSPICIOUS=${summary.suspicious}`);
  output.push(`SCAN_MALICIOUS=${summary.malicious}`);
  output.push(`SCAN_ERRORS=${summary.errors}`);
  output.push(`SCAN_DURATION_MS=${summary.totalDurationMs}`);
  output.push(`SCAN_STATUS=${summary.malicious > 0 || summary.suspicious > 0 ? 'FAIL' : 'PASS'}`);

  if (summary.malicious > 0 || summary.suspicious > 0) {
    output.push('');
    output.push('THREATS:');
    results
      .filter(r => r.verdict === 'malicious' || r.verdict === 'suspicious')
      .forEach(r => {
        output.push(`  ${relative(baseDir, r.file)} [${r.verdict.toUpperCase()}]`);
        r.findings.forEach(f => output.push(`    - ${f}`));
      });
  }

  return output.join('\n');
}
