'use strict';

const fs  = require('fs');
const pkg = require('../package.json');

/**
 * Normalise scan results (same shapes as Dashboard.js).
 * Returns { total, infected, clean, errors }.
 */
function stats(scanResults) {
  if (Array.isArray(scanResults)) {
    const total    = scanResults.length;
    const infected = scanResults.filter(r => r.verdict === 'infected').length;
    const errors   = scanResults.filter(r => r.verdict === 'error').length;
    return { total, infected, clean: total - infected - errors, errors };
  }
  // DirectoryScanResult
  const clean    = (scanResults.clean    || []).length;
  const infected = (scanResults.malicious|| []).length;
  const errors   = (scanResults.errors   || []).length;
  return { total: clean + infected + errors, infected, clean, errors };
}

function escXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate a shareable SVG card showing the scan result.
 *
 * @param {object|Array} scanResults  - Array<{file,verdict}> or DirectoryScanResult
 * @param {object}       [options]
 * @param {string}       [options.outputPath]  - Write SVG to this path (optional)
 * @returns {string} SVG markup
 */
function generateShareCard(scanResults, options = {}) {
  const { total, infected, clean } = stats(scanResults);
  const version  = pkg.version;
  const date     = new Date().toISOString().slice(0, 10);
  const allClean = infected === 0;

  // Card dimensions
  const W = 560;
  const H = 200;

  // Theme
  const bgColor     = allClean ? '#f0fdf4' : '#fff1f2';
  const borderColor = allClean ? '#86efac' : '#fca5a5';
  const accentColor = allClean ? '#16a34a' : '#dc2626';
  const headlineTxt = allClean
    ? `${total} file${total === 1 ? '' : 's'} scanned — All clean`
    : `${total} file${total === 1 ? '' : 's'} scanned — ${infected} infected`;
  const statusIcon  = allClean ? '✅' : '🚨';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="pompelmi scan result: ${escXml(headlineTxt)}">
  <defs>
    <style>
      .card-font { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" rx="14" ry="14" fill="${bgColor}" stroke="${borderColor}" stroke-width="2"/>

  <!-- Grapefruit logo (top-left) -->
  <g transform="translate(24, 24)">
    <circle cx="16" cy="16" r="15" fill="#e8846a"/>
    <circle cx="16" cy="16" r="12" fill="#f5c4a0"/>
    <circle cx="16" cy="16" r="9"  fill="#f9d8c0"/>
    <line x1="16" y1="7"   x2="16" y2="25" stroke="#e8846a" stroke-width="0.8"/>
    <line x1="7"  y1="16"  x2="25" y2="16" stroke="#e8846a" stroke-width="0.8"/>
    <line x1="9.6" y1="9.6"  x2="22.4" y2="22.4" stroke="#e8846a" stroke-width="0.8"/>
    <line x1="22.4" y1="9.6" x2="9.6"  y2="22.4" stroke="#e8846a" stroke-width="0.8"/>
    <circle cx="16" cy="16" r="2.2" fill="#e8846a" opacity="0.6"/>
    <rect x="14.5" y="1" width="3" height="4" rx="1" fill="#7a9e5a"/>
    <ellipse cx="19" cy="2.5" rx="3.5" ry="1.4" fill="#7a9e5a" transform="rotate(-30 19 2.5)"/>
  </g>

  <!-- Brand name -->
  <text x="64" y="39" class="card-font" font-size="15" font-weight="700" fill="#0f172a">pompelmi</text>
  <text x="64" y="54" class="card-font" font-size="11" fill="#64748b">Virus scan report</text>

  <!-- Status icon -->
  <text x="${W - 32}" y="46" class="card-font" font-size="28" text-anchor="end">${statusIcon}</text>

  <!-- Divider -->
  <line x1="24" y1="76" x2="${W - 24}" y2="76" stroke="${borderColor}" stroke-width="1.5"/>

  <!-- Headline -->
  <text x="${W / 2}" y="112" class="card-font" font-size="20" font-weight="700"
        fill="${accentColor}" text-anchor="middle">${escXml(headlineTxt)}</text>

  <!-- Stats row -->
  <text x="112" y="145" class="card-font" font-size="28" font-weight="800" fill="#2563eb" text-anchor="middle">${total}</text>
  <text x="112" y="162" class="card-font" font-size="11" fill="#64748b" text-anchor="middle">TOTAL</text>

  <text x="224" y="145" class="card-font" font-size="28" font-weight="800" fill="#16a34a" text-anchor="middle">${clean}</text>
  <text x="224" y="162" class="card-font" font-size="11" fill="#64748b" text-anchor="middle">CLEAN</text>

  <text x="336" y="145" class="card-font" font-size="28" font-weight="800" fill="#dc2626" text-anchor="middle">${infected}</text>
  <text x="336" y="162" class="card-font" font-size="11" fill="#64748b" text-anchor="middle">INFECTED</text>

  <!-- Separator lines between stats -->
  <line x1="170" y1="130" x2="170" y2="168" stroke="${borderColor}" stroke-width="1"/>
  <line x1="282" y1="130" x2="282" y2="168" stroke="${borderColor}" stroke-width="1"/>

  <!-- Footer: date + version -->
  <line x1="24" y1="178" x2="${W - 24}" y2="178" stroke="${borderColor}" stroke-width="1"/>
  <text x="24" y="193" class="card-font" font-size="11" fill="#94a3b8">${escXml(date)}</text>
  <text x="${W - 24}" y="193" class="card-font" font-size="11" fill="#94a3b8" text-anchor="end">pompelmi v${escXml(version)} • pompelmi.app</text>
</svg>`;

  if (options.outputPath) {
    fs.writeFileSync(options.outputPath, svg, 'utf8');
  }

  return svg;
}

module.exports = { generateShareCard };
