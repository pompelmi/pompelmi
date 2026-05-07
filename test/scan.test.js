const path = require('path');
const fs   = require('fs');
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

    console.log("\n--- scanBuffer integration tests ---\n");

    async function testBuffer(label, buffer, expected) {
        try {
            const result = await pompelmi.scanBuffer(buffer);
            if (result === expected) {
                console.log(`✅ ${label}: ${String(result)}`);
                passed++;
            } else {
                console.error(`❌ ${label}: Expected ${String(expected)}, got ${String(result)}`);
                failed++;
            }
        } catch (err) {
            console.error(`❌ ${label}: Threw ${err.message}`);
            failed++;
        }
    }

    const cleanBuffer = fs.readFileSync(path.join(__dirname, 'clean.txt'));

    // Build the EICAR test string in memory to avoid OS-level read blocks on eicar.txt
    const eicarBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    );

    await testBuffer('Buffer: Clean file',      cleanBuffer,  Verdict.Clean);
    await testBuffer('Buffer: EICAR signature', eicarBuffer,  Verdict.Malicious);

    console.log("\n--- scanStream integration tests ---\n");

    async function testStream(label, stream, expected) {
        try {
            const result = await pompelmi.scanStream(stream);
            if (result === expected) {
                console.log(`✅ ${label}: ${String(result)}`);
                passed++;
            } else {
                console.error(`❌ ${label}: Expected ${String(expected)}, got ${String(result)}`);
                failed++;
            }
        } catch (err) {
            console.error(`❌ ${label}: Threw ${err.message}`);
            failed++;
        }
    }

    const { Readable } = require('stream');

    await testStream(
        'Stream: Clean text',
        Readable.from([fs.readFileSync(path.join(__dirname, 'clean.txt'))]),
        Verdict.Clean
    );

    // Build EICAR in memory to avoid OS-level blocks on eicar.txt
    await testStream(
        'Stream: EICAR signature',
        Readable.from([Buffer.from(
            'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
        )]),
        Verdict.Malicious
    );

    console.log("\n--- scanDirectory integration tests ---\n");

    const fixturesDir = __dirname;
    let dirResult;
    try {
        dirResult = await pompelmi.scanDirectory(fixturesDir);
        const total = dirResult.clean.length + dirResult.malicious.length + dirResult.errors.length;
        if (total > 0) {
            console.log(`✅ scanDirectory: ${dirResult.clean.length} clean, ${dirResult.malicious.length} malicious, ${dirResult.errors.length} errors`);
            passed++;
        } else {
            console.error('❌ scanDirectory: expected at least one result, got zero');
            failed++;
        }
    } catch (err) {
        console.error(`❌ scanDirectory threw: ${err.message}`);
        failed++;
    }

    console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
    if (failed > 0) process.exit(1);
}

runTests().catch((err) => { console.error(err); process.exit(1); });