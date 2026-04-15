const path = require('path');
const { execSync } = require('child_process');
const pompelmi = require('../src/index.js');
const { Verdict } = require('../src/verdicts.js');

function isClamAVInstalled() {
    try {
        execSync(
            process.platform === 'win32' ? 'where clamscan' : 'which clamscan',
            { stdio: 'ignore' }
        );
        return true;
    } catch {
        return false;
    }
}

if (!isClamAVInstalled()) {
    console.log('\nSkipping integration tests: clamscan not found in PATH.\n');
    process.exit(0);
}

async function runTests() {
    let passed = 0;
    let failed = 0;

    async function test(label, filePath, expected) {
        try {
            const result = await pompelmi.scan(filePath);
            if (result === expected) {
                console.log(`✅ ${label}: ${String(result)}`);
                passed++;
            } else {
                console.error(`❌ ${label}: Expected ${String(expected)}, got ${String(result)}`);
                failed++;
            }
        } catch (err) {
            if (err.message === expected) {
                console.log(`✅ ${label}: ${err.message}`);
                passed++;
            } else {
                console.error(`❌ ${label}: Expected ${String(expected)}, got ${err.message}`);
                failed++;
            }
        }
    }

    console.log("\n--- ClamAV Scanner Tests ---\n");

    const ghostPath = path.join(__dirname, 'ghost.txt');
    await test("Clean file",         path.join(__dirname, 'clean.txt'), Verdict.Clean);
    await test("Malicious file",     path.join(__dirname, 'eicar.txt'), Verdict.Malicious);
    await test("Malicious zip",      path.join(__dirname, 'eicar.zip'), Verdict.Malicious);
    await test("File non esistente", ghostPath, `File not found: ${ghostPath}`);

    console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
}

runTests().catch(console.error);