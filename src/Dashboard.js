'use strict';

const fs  = require('fs');
const pkg = require('../package.json');

// Inline grapefruit SVG (no external image dependency)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
  <circle cx="16" cy="16" r="15" fill="#e8846a"/>
  <circle cx="16" cy="16" r="12" fill="#f5c4a0"/>
  <circle cx="16" cy="16" r="9" fill="#f9d8c0"/>
  <line x1="16" y1="7" x2="16" y2="25" stroke="#e8846a" stroke-width="0.8"/>
  <line x1="7" y1="16" x2="25" y2="16" stroke="#e8846a" stroke-width="0.8"/>
  <line x1="9.6" y1="9.6" x2="22.4" y2="22.4" stroke="#e8846a" stroke-width="0.8"/>
  <line x1="22.4" y1="9.6" x2="9.6" y2="22.4" stroke="#e8846a" stroke-width="0.8"/>
  <circle cx="16" cy="16" r="2.2" fill="#e8846a" opacity="0.6"/>
  <rect x="14.5" y="1" width="3" height="4" rx="1" fill="#7a9e5a"/>
  <ellipse cx="19" cy="2.5" rx="3.5" ry="1.4" fill="#7a9e5a" transform="rotate(-30 19 2.5)"/>
</svg>`;

/**
 * Normalise input into a flat array of { file, verdict, viruses[] }.
 * Accepts:
 *   - Array<{ file, verdict, viruses? }>  (CLI / scanOne format)
 *   - DirectoryScanResult { clean[], malicious[], errors[] }
 */
function normalise(scanResults) {
  if (Array.isArray(scanResults)) return scanResults;

  // DirectoryScanResult shape
  const rows = [];
  for (const f of (scanResults.clean    || [])) rows.push({ file: f, verdict: 'clean',    viruses: [] });
  for (const f of (scanResults.malicious|| [])) rows.push({ file: f, verdict: 'infected', viruses: [] });
  for (const f of (scanResults.errors   || [])) rows.push({ file: f, verdict: 'error',    viruses: [] });
  return rows;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badge(verdict) {
  if (verdict === 'clean')    return `<span class="badge badge-clean">CLEAN</span>`;
  if (verdict === 'infected') return `<span class="badge badge-infected">INFECTED</span>`;
  return `<span class="badge badge-error">ERROR</span>`;
}

/**
 * Generate a self-contained HTML security report.
 *
 * @param {object|Array} scanResults   - Array<{file,verdict,viruses?}> or DirectoryScanResult
 * @param {object}       [options]
 * @param {number}       [options.elapsed]       - Scan time in ms
 * @param {string}       [options.clamdVersion]  - clamd version string if known
 * @param {string}       [options.host]          - clamd host used
 * @param {string}       [options.socket]        - UNIX socket used
 * @param {string}       [options.outputPath]    - Write HTML to this path (optional)
 * @returns {string} Self-contained HTML
 */
function generateDashboard(scanResults, options = {}) {
  const rows     = normalise(scanResults);
  const total    = rows.length;
  const infected = rows.filter(r => r.verdict === 'infected').length;
  const clean    = rows.filter(r => r.verdict === 'clean').length;
  const errors   = rows.filter(r => r.verdict === 'error').length;
  const elapsed  = options.elapsed != null ? options.elapsed : null;
  const elapsedStr = elapsed != null ? (elapsed / 1000).toFixed(2) + 's' : '—';
  const ts       = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const version  = pkg.version;
  const allClean = infected === 0 && errors === 0;

  const connectionStr = options.socket
    ? escHtml(options.socket)
    : options.host
      ? escHtml(`${options.host}:${options.port || 3310}`)
      : 'local clamscan';

  const infectedRows = rows.filter(r => r.verdict === 'infected');

  const fileTableRows = rows.map(r => `
      <tr>
        <td class="file-cell">${escHtml(r.file)}</td>
        <td>${badge(r.verdict)}</td>
        <td class="virus-cell">${r.viruses && r.viruses.length ? `<span class="virus-name">${escHtml(r.viruses[0])}</span>` : ''}</td>
      </tr>`).join('');

  const infectedSection = infectedRows.length === 0 ? '' : `
    <section class="infected-section">
      <h2>&#9888; Infected Files</h2>
      <ul class="infected-list">
        ${infectedRows.map(r => `
        <li>
          <span class="infected-path">${escHtml(r.file)}</span>
          ${r.viruses && r.viruses.length ? `<br><span class="virus-label">Virus: <strong>${escHtml(r.viruses[0])}</strong></span>` : ''}
        </li>`).join('')}
      </ul>
    </section>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pompelmi Security Report — ${ts}</title>
<style>
/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:        #ffffff;
  --bg2:       #f8f9fa;
  --border:    #e2e8f0;
  --text:      #0f172a;
  --muted:     #64748b;
  --clean:     #16a34a;
  --clean-bg:  #dcfce7;
  --infected:  #dc2626;
  --inf-bg:    #fee2e2;
  --error:     #d97706;
  --err-bg:    #fef3c7;
  --blue:      #2563eb;
  --banner-clean-bg:   #dcfce7;
  --banner-clean-txt:  #166534;
  --banner-clean-bdr:  #86efac;
  --banner-inf-bg:     #fee2e2;
  --banner-inf-txt:    #991b1b;
  --banner-inf-bdr:    #fca5a5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:        #0f172a;
    --bg2:       #1e293b;
    --border:    #334155;
    --text:      #f1f5f9;
    --muted:     #94a3b8;
    --clean:     #4ade80;
    --clean-bg:  #14532d;
    --infected:  #f87171;
    --inf-bg:    #7f1d1d;
    --error:     #fbbf24;
    --err-bg:    #78350f;
    --banner-clean-bg:   #14532d;
    --banner-clean-txt:  #bbf7d0;
    --banner-clean-bdr:  #166534;
    --banner-inf-bg:     #7f1d1d;
    --banner-inf-txt:    #fecaca;
    --banner-inf-bdr:    #991b1b;
  }
}
body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  padding: 32px 20px 64px;
  max-width: 960px;
  margin: 0 auto;
}
/* ── Header ── */
.report-header {
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 20px;
  margin-bottom: 28px;
}
.report-header svg { flex-shrink: 0; }
.report-title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
.report-sub   { font-size: 13px; color: var(--muted); margin-top: 2px; }
/* ── Banner ── */
.banner {
  border-radius: 10px;
  padding: 18px 24px;
  margin-bottom: 28px;
  font-size: 18px;
  font-weight: 700;
  border: 1.5px solid;
}
.banner.clean    { background: var(--banner-clean-bg); color: var(--banner-clean-txt); border-color: var(--banner-clean-bdr); }
.banner.infected { background: var(--banner-inf-bg);   color: var(--banner-inf-txt);   border-color: var(--banner-inf-bdr); }
.banner-icon { font-size: 22px; margin-right: 8px; vertical-align: middle; }
/* ── Stats grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 14px;
  margin-bottom: 32px;
}
.stat-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px 16px 14px;
  text-align: center;
}
.stat-value { font-size: 36px; font-weight: 800; line-height: 1; }
.stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
.stat-total    .stat-value { color: var(--blue); }
.stat-clean    .stat-value { color: var(--clean); }
.stat-infected .stat-value { color: var(--infected); }
.stat-errors   .stat-value { color: var(--error); }
.stat-time     .stat-value { font-size: 24px; }
/* ── Section headings ── */
section { margin-bottom: 32px; }
section h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text); }
/* ── File table ── */
.file-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.file-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--muted);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}
.file-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  word-break: break-all;
}
.file-table tr:last-child td { border-bottom: none; }
.file-table tr:hover td { background: var(--bg2); }
.file-cell  { font-family: 'Menlo', 'Consolas', monospace; font-size: 12.5px; color: var(--muted); }
.virus-cell { font-family: 'Menlo', 'Consolas', monospace; font-size: 12px; }
.virus-name { color: var(--infected); }
/* ── Badges ── */
.badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.badge-clean    { background: var(--clean-bg);   color: var(--clean); }
.badge-infected { background: var(--inf-bg);      color: var(--infected); }
.badge-error    { background: var(--err-bg);      color: var(--error); }
/* ── Infected section ── */
.infected-section h2 { color: var(--infected); }
.infected-list { list-style: none; }
.infected-list li {
  background: var(--inf-bg);
  border: 1px solid var(--banner-inf-bdr);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
}
.infected-path { font-family: 'Menlo', 'Consolas', monospace; font-size: 13px; color: var(--infected); }
.virus-label   { font-size: 13px; color: var(--text); margin-top: 4px; display: block; }
/* ── Metadata ── */
.meta-table { border-collapse: collapse; font-size: 13.5px; }
.meta-table td { padding: 6px 14px 6px 0; vertical-align: top; }
.meta-table td:first-child { color: var(--muted); width: 160px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; padding-top: 8px; }
/* ── Footer ── */
.report-footer {
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
/* ── Print ── */
@media print {
  body { padding: 0; max-width: 100%; color: #000; background: #fff; }
  .banner.clean    { background: #dcfce7 !important; color: #166534 !important; }
  .banner.infected { background: #fee2e2 !important; color: #991b1b !important; }
  .stat-card { border: 1px solid #ccc; }
  .badge-clean    { background: #dcfce7 !important; color: #166534 !important; }
  .badge-infected { background: #fee2e2 !important; color: #991b1b !important; }
  .badge-error    { background: #fef3c7 !important; color: #d97706 !important; }
  .file-table tr:hover td { background: none; }
}
</style>
</head>
<body>

<header class="report-header">
  ${LOGO_SVG}
  <div>
    <div class="report-title">pompelmi Security Report</div>
    <div class="report-sub">Generated ${ts}</div>
  </div>
</header>

<div class="banner ${allClean ? 'clean' : 'infected'}">
  <span class="banner-icon">${allClean ? '✅' : '🚨'}</span>
  ${allClean
    ? `All ${total} file${total === 1 ? '' : 's'} scanned — no threats detected`
    : `${infected} infected file${infected === 1 ? '' : 's'} detected out of ${total} scanned`}
</div>

<div class="stats-grid">
  <div class="stat-card stat-total">
    <div class="stat-value">${total}</div>
    <div class="stat-label">Files scanned</div>
  </div>
  <div class="stat-card stat-clean">
    <div class="stat-value">${clean}</div>
    <div class="stat-label">Clean</div>
  </div>
  <div class="stat-card stat-infected">
    <div class="stat-value">${infected}</div>
    <div class="stat-label">Infected</div>
  </div>
  <div class="stat-card stat-errors">
    <div class="stat-value">${errors}</div>
    <div class="stat-label">Errors</div>
  </div>
  <div class="stat-card stat-time">
    <div class="stat-value">${elapsedStr}</div>
    <div class="stat-label">Scan time</div>
  </div>
</div>

${infectedSection}

<section>
  <h2>All Scanned Files</h2>
  ${total === 0 ? '<p style="color:var(--muted)">No files scanned.</p>' : `
  <table class="file-table">
    <thead>
      <tr>
        <th>File</th>
        <th>Verdict</th>
        <th>Threat name</th>
      </tr>
    </thead>
    <tbody>${fileTableRows}</tbody>
  </table>`}
</section>

<section>
  <h2>Scan Metadata</h2>
  <table class="meta-table">
    <tr><td>Timestamp</td><td>${ts}</td></tr>
    <tr><td>Connection</td><td>${connectionStr}</td></tr>
    ${options.clamdVersion ? `<tr><td>ClamAV</td><td>${escHtml(options.clamdVersion)}</td></tr>` : ''}
    <tr><td>pompelmi</td><td>v${escHtml(version)}</td></tr>
  </table>
</section>

<footer class="report-footer">
  ${LOGO_SVG.replace('width="32" height="32"', 'width="18" height="18"')}
  Generated by <strong>pompelmi v${escHtml(version)}</strong> &mdash;
  <a href="https://pompelmi.app" style="color:inherit">pompelmi.app</a>
</footer>

</body>
</html>`;

  if (options.outputPath) {
    fs.writeFileSync(options.outputPath, html, 'utf8');
  }

  return html;
}

module.exports = { generateDashboard };
