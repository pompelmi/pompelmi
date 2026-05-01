'use strict';

const fs   = require('fs');
const path = require('path');
const { scan, scanDirectory, Verdict } = require('pompelmi');

const scanPath    = process.argv[2] || '.';
const failOnVirus = process.argv[3] !== 'false';

async function writeReport(clean, malicious, errors, outputDir) {
    const total  = clean.length + malicious.length + errors.length;
    const status = malicious.length > 0 ? 'infected' : 'clean';

    const rows = [
        ...clean.map(f => ({ file: f, status: 'clean', verdict: 'Clean' })),
        ...malicious.map(f => ({ file: f, status: 'infected', verdict: 'Malicious' })),
        ...errors.map(f => ({ file: f, status: 'error', verdict: 'ScanError' })),
    ];

    const json = JSON.stringify({ status, total, clean: clean.length, malicious: malicious.length, errors: errors.length, files: rows }, null, 2);
    fs.writeFileSync(path.join(outputDir, 'report.json'), json);

    const tableRows = rows.map(r => {
        const color = r.status === 'clean' ? '#22c55e' : r.status === 'infected' ? '#ef4444' : '#f59e0b';
        return `<tr><td>${escHtml(r.file)}</td><td style="color:${color};font-weight:bold">${r.verdict}</td></tr>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Pompelmi Scan Report</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 1.5rem; }
  .summary { display: flex; gap: 24px; margin: 16px 0; }
  .stat { background: #f1f5f9; border-radius: 8px; padding: 12px 20px; text-align: center; }
  .stat span { display: block; font-size: 1.8rem; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th { background: #0f172a; color: #fff; text-align: left; padding: 8px 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; word-break: break-all; }
  tr:hover td { background: #f8fafc; }
</style>
</head>
<body>
<h1>${status === 'clean' ? '✅' : '❌'} Pompelmi Scan Report</h1>
<div class="summary">
  <div class="stat"><span>${total}</span>Total</div>
  <div class="stat"><span style="color:#22c55e">${clean.length}</span>Clean</div>
  <div class="stat"><span style="color:#ef4444">${malicious.length}</span>Infected</div>
  <div class="stat"><span style="color:#f59e0b">${errors.length}</span>Errors</div>
</div>
<table>
<thead><tr><th>File</th><th>Verdict</th></tr></thead>
<tbody>
${tableRows}
</tbody>
</table>
</body>
</html>`;
    fs.writeFileSync(path.join(outputDir, 'report.html'), html);

    return { jsonPath: path.join(outputDir, 'report.json'), htmlPath: path.join(outputDir, 'report.html') };
}

function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function uploadArtifact(jsonPath, htmlPath) {
    try {
        const { DefaultArtifactClient } = require('@actions/artifact');
        const client = new DefaultArtifactClient();
        await client.uploadArtifact('pompelmi-scan-report', [jsonPath, htmlPath], path.dirname(jsonPath));
        console.log('Scan report artifact uploaded: pompelmi-scan-report');
    } catch (err) {
        console.warn(`Could not upload artifact (not running in Actions?): ${err.message}`);
    }
}

async function main() {
    const resolved = path.resolve(scanPath);

    if (!fs.existsSync(resolved)) {
        console.error(`::error::Path not found: ${resolved}`);
        process.exit(2);
    }

    let clean = [], malicious = [], errors = [];
    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
        const result = await scanDirectory(resolved);
        clean     = result.clean;
        malicious = result.malicious;
        errors    = result.errors;
    } else {
        const verdict = await scan(resolved);
        if (verdict === Verdict.Clean)          clean.push(resolved);
        else if (verdict === Verdict.Malicious) malicious.push(resolved);
        else                                    errors.push(resolved);
    }

    const total  = clean.length + malicious.length + errors.length;
    const status = malicious.length > 0 ? 'infected' : 'clean';

    // --- GitHub outputs ---
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
        const lines = [
            `status=${status}`,
            `infected-files<<POMPELMI_EOF`,
            malicious.join('\n'),
            `POMPELMI_EOF`,
        ].join('\n') + '\n';
        fs.appendFileSync(outputFile, lines);
    }

    // --- Job summary ---
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
        const icon = status === 'clean' ? '✅' : '❌';
        const rows = [
            `## ${icon} ClamAV Scan Results`,
            '',
            `| Metric | Count |`,
            `|--------|-------|`,
            `| Files scanned | ${total} |`,
            `| Clean | ${clean.length} |`,
            `| Infected | **${malicious.length}** |`,
            `| Errors | ${errors.length} |`,
        ];
        if (malicious.length > 0) {
            rows.push('', '### Infected Files', '');
            malicious.forEach(f => rows.push(`- \`${f}\``));
        }
        fs.appendFileSync(summaryFile, rows.join('\n') + '\n');
    }

    // --- Report artifact ---
    const reportDir = process.env.RUNNER_TEMP || '/tmp';
    const { jsonPath, htmlPath } = await writeReport(clean, malicious, errors, reportDir);
    await uploadArtifact(jsonPath, htmlPath);

    // --- Console ---
    console.log(`\nScan complete — ${total} file(s) scanned`);
    console.log(`  Clean:    ${clean.length}`);
    console.log(`  Infected: ${malicious.length}`);
    console.log(`  Errors:   ${errors.length}`);
    console.log(`  Status:   ${status.toUpperCase()}`);

    if (malicious.length > 0) {
        console.error('\nInfected files:');
        malicious.forEach(f => console.error(`  ${f}`));
        if (failOnVirus) {
            console.error('\n::error::Virus(es) detected — failing workflow.');
            process.exit(1);
        }
    }
}

main().catch(err => {
    console.error(`::error::Scanner crashed: ${err.message}`);
    process.exit(2);
});
