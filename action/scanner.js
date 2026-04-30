'use strict';

const fs   = require('fs');
const path = require('path');
const { scan, scanDirectory, Verdict } = require('./src/index.js');

const scanPath    = process.argv[2] || '.';
const failOnVirus = process.argv[3] !== 'false';

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
