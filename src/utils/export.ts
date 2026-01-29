/**
 * Export utilities for scan results
 * @module utils/export
 */

import type { ScanReport } from '../types';

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'html' | 'sarif';

export interface ExportOptions {
  /** Include detailed match information */
  includeDetails?: boolean;
  /** Include performance metrics if available */
  includeMetrics?: boolean;
  /** Pretty print JSON output */
  prettyPrint?: boolean;
}

/**
 * Export scan results to various formats
 */
export class ScanResultExporter {
  /**
   * Export to JSON format
   */
  toJSON(reports: ScanReport | ScanReport[], options: ExportOptions = {}): string {
    const data = Array.isArray(reports) ? reports : [reports];
    
    if (!options.includeDetails) {
      // Simplified output
      const simplified = data.map(r => ({
        verdict: r.verdict,
        file: r.file?.name,
        matches: r.matches.length,
        durationMs: r.durationMs,
      }));
      return options.prettyPrint 
        ? JSON.stringify(simplified, null, 2)
        : JSON.stringify(simplified);
    }

    return options.prettyPrint 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  }

  /**
   * Export to CSV format
   */
  toCSV(reports: ScanReport | ScanReport[], options: ExportOptions = {}): string {
    const data = Array.isArray(reports) ? reports : [reports];
    
    const headers = [
      'filename',
      'verdict',
      'matches_count',
      'file_size',
      'mime_type',
      'duration_ms',
      'engine',
    ];

    if (options.includeDetails) {
      headers.push('reasons', 'match_rules');
    }

    const rows = data.map(report => {
      const row = [
        this.escapeCsv(report.file?.name || 'unknown'),
        report.verdict,
        report.matches.length.toString(),
        (report.file?.size || 0).toString(),
        this.escapeCsv(report.file?.mimeType || 'unknown'),
        (report.durationMs || 0).toString(),
        report.engine || 'unknown',
      ];

      if (options.includeDetails) {
        row.push(
          this.escapeCsv((report.reasons || []).join('; ')),
          this.escapeCsv(report.matches.map(m => m.rule).join('; '))
        );
      }

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export to Markdown format
   */
  toMarkdown(reports: ScanReport | ScanReport[], options: ExportOptions = {}): string {
    const data = Array.isArray(reports) ? reports : [reports];
    
    let md = '# Scan Results\n\n';
    md += `**Total Scans:** ${data.length}\n\n`;
    
    const clean = data.filter(r => r.verdict === 'clean').length;
    const suspicious = data.filter(r => r.verdict === 'suspicious').length;
    const malicious = data.filter(r => r.verdict === 'malicious').length;

    md += '## Summary\n\n';
    md += `- ✅ Clean: ${clean}\n`;
    md += `- ⚠️ Suspicious: ${suspicious}\n`;
    md += `- ❌ Malicious: ${malicious}\n\n`;

    md += '## Detailed Results\n\n';
    
    for (const report of data) {
      const icon = report.verdict === 'clean' ? '✅' : report.verdict === 'suspicious' ? '⚠️' : '❌';
      md += `### ${icon} ${report.file?.name || 'Unknown'}\n\n`;
      md += `- **Verdict:** ${report.verdict}\n`;
      md += `- **Size:** ${this.formatBytes(report.file?.size || 0)}\n`;
      md += `- **MIME Type:** ${report.file?.mimeType || 'unknown'}\n`;
      md += `- **Duration:** ${report.durationMs || 0}ms\n`;
      md += `- **Matches:** ${report.matches.length}\n`;

      if (options.includeDetails && report.matches.length > 0) {
        md += '\n**Match Details:**\n';
        for (const match of report.matches) {
          md += `- ${match.rule}`;
          if (match.tags && match.tags.length > 0) {
            md += ` (${match.tags.join(', ')})`;
          }
          md += '\n';
        }
      }
      md += '\n';
    }

    return md;
  }

  /**
   * Export to SARIF format (Static Analysis Results Interchange Format)
   * Useful for CI/CD integration
   */
  toSARIF(reports: ScanReport | ScanReport[], options: ExportOptions = {}): string {
    const data = Array.isArray(reports) ? reports : [reports];

    const results = data.flatMap(report => {
      if (report.verdict === 'clean') return [];

      return report.matches.map(match => ({
        ruleId: match.rule,
        level: report.verdict === 'malicious' ? 'error' : 'warning',
        message: {
          text: `${match.rule} detected in ${report.file?.name || 'unknown file'}`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: report.file?.name || 'unknown',
              },
            },
          },
        ],
        properties: {
          tags: match.tags,
          metadata: match.meta,
        },
      }));
    });

    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'Pompelmi',
              version: '0.29.0',
              informationUri: 'https://pompelmi.github.io/pompelmi/',
            },
          },
          results,
        },
      ],
    };

    return options.prettyPrint
      ? JSON.stringify(sarif, null, 2)
      : JSON.stringify(sarif);
  }

  /**
   * Export to HTML format
   */
  toHTML(reports: ScanReport | ScanReport[], options: ExportOptions = {}): string {
    const data = Array.isArray(reports) ? reports : [reports];
    
    const clean = data.filter(r => r.verdict === 'clean').length;
    const suspicious = data.filter(r => r.verdict === 'suspicious').length;
    const malicious = data.filter(r => r.verdict === 'malicious').length;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pompelmi Scan Results</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .card { padding: 20px; border-radius: 8px; text-align: center; }
    .clean { background: #d4edda; color: #155724; }
    .suspicious { background: #fff3cd; color: #856404; }
    .malicious { background: #f8d7da; color: #721c24; }
    .result { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .result h3 { margin-top: 0; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>🛡️ Pompelmi Scan Results</h1>
  <div class="summary">
    <div class="card clean"><h2>${clean}</h2><p>Clean Files</p></div>
    <div class="card suspicious"><h2>${suspicious}</h2><p>Suspicious Files</p></div>
    <div class="card malicious"><h2>${malicious}</h2><p>Malicious Files</p></div>
  </div>
  <h2>Detailed Results</h2>`;

    for (const report of data) {
      const statusClass = report.verdict;
      html += `<div class="result ${statusClass}">`;
      html += `<h3>${this.escapeHtml(report.file?.name || 'Unknown')}</h3>`;
      html += `<table>`;
      html += `<tr><th>Verdict</th><td>${report.verdict.toUpperCase()}</td></tr>`;
      html += `<tr><th>Size</th><td>${this.formatBytes(report.file?.size || 0)}</td></tr>`;
      html += `<tr><th>MIME Type</th><td>${this.escapeHtml(report.file?.mimeType || 'unknown')}</td></tr>`;
      html += `<tr><th>Duration</th><td>${report.durationMs || 0}ms</td></tr>`;
      html += `<tr><th>Matches</th><td>${report.matches.length}</td></tr>`;
      html += `</table>`;

      if (options.includeDetails && report.matches.length > 0) {
        html += `<h4>Match Details:</h4><ul>`;
        for (const match of report.matches) {
          html += `<li><strong>${this.escapeHtml(match.rule)}</strong>`;
          if (match.tags && match.tags.length > 0) {
            html += ` ${match.tags.map(tag => `<span class="badge">${this.escapeHtml(tag)}</span>`).join('')}`;
          }
          html += `</li>`;
        }
        html += `</ul>`;
      }
      html += `</div>`;
    }

    html += `</body></html>`;
    return html;
  }

  /**
   * Export to specified format
   */
  export(reports: ScanReport | ScanReport[], format: ExportFormat, options: ExportOptions = {}): string {
    switch (format) {
      case 'json':
        return this.toJSON(reports, options);
      case 'csv':
        return this.toCSV(reports, options);
      case 'markdown':
        return this.toMarkdown(reports, options);
      case 'html':
        return this.toHTML(reports, options);
      case 'sarif':
        return this.toSARIF(reports, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Quick export helper
 */
export function exportScanResults(
  reports: ScanReport | ScanReport[],
  format: ExportFormat,
  options?: ExportOptions
): string {
  const exporter = new ScanResultExporter();
  return exporter.export(reports, format, options);
}
