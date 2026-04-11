'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const path = require('path');

// ─── Spawn mock helpers ───────────────────────────────────────────────────────

/** Returns a spawn mock that emits 'close' with the given code and signal. */
function spawnClose(code, signal = null) {
    return () => {
        const child = new EventEmitter();
        process.nextTick(() => child.emit('close', code, signal));
        return child;
    };
}

/** Returns a spawn mock that emits 'error'. */
function spawnError(message) {
    return () => {
        const child = new EventEmitter();
        process.nextTick(() => child.emit('error', new Error(message)));
        return child;
    };
}

// ─── Module loader with dependency injection ──────────────────────────────────

/**
 * Loads `targetPath` fresh with selected dependencies replaced.
 *
 * Keys in `mocks` are module identifiers as you would pass to require():
 *   - npm package names  ('cross-spawn')
 *   - built-in names     ('child_process')
 *   - paths relative to this test file  ('../src/constants.js')
 *
 * Non-built-in modules are mocked by swapping require.cache[...].exports.
 * Built-in modules (which Node does not store in require.cache) are mocked
 * by patching individual properties on the live exports object.
 *
 * Originals are restored and the target module is deleted from cache
 * after each call, so every invocation gets a completely fresh module.
 */
function load(targetPath, mocks = {}) {
    const restores = [];

    for (const [dep, mockExports] of Object.entries(mocks)) {
        let resolved;
        try {
            resolved = require.resolve(dep);
        } catch {
            resolved = dep; // built-in whose resolve returns the bare name
        }

        // Ensure the module is loaded so require.cache is populated (if it ever will be).
        if (!require.cache[resolved]) {
            try { require(dep); } catch { /* ignore — the mock replaces it anyway */ }
        }

        const entry = require.cache[resolved];

        if (entry) {
            // Regular module (including newly loaded ones): swap the whole exports object.
            const original = entry.exports;
            entry.exports = mockExports;
            restores.push(() => { entry.exports = original; });
        } else {
            // True built-in (Node never stores these in require.cache): patch
            // individual properties on the live exports object and restore afterwards.
            const mod = require(dep);
            const saved = {};
            for (const key of Object.keys(mockExports)) {
                saved[key] = mod[key];
                mod[key] = mockExports[key];
            }
            restores.push(() => {
                for (const [k, v] of Object.entries(saved)) mod[k] = v;
            });
        }
    }

    const targetResolved = require.resolve(targetPath);
    delete require.cache[targetResolved];

    let loaded;
    try {
        loaded = require(targetPath);
    } finally {
        // Restore mocked dependencies (LIFO so nested overrides unwind cleanly).
        for (const restore of restores.reverse()) restore();
        // Always leave the target out of cache so the next call starts fresh.
        delete require.cache[targetResolved];
    }

    return loaded;
}

// ─── InstallerCommand ─────────────────────────────────────────────────────────

describe('InstallerCommand', () => {
    // Pure synchronous module — no mocking required.
    const { getInstallerCommand, getUpdaterCommand } = require('../src/InstallerCommand.js');

    describe('getInstallerCommand', () => {
        it('darwin  → brew install clamav', () => {
            assert.deepEqual(getInstallerCommand('darwin'), ['brew', ['install', 'clamav']]);
        });
        it('linux   → sudo apt-get install', () => {
            assert.deepEqual(
                getInstallerCommand('linux'),
                ['sudo', ['apt-get', 'install', '-y', 'clamav', 'clamav-daemon']]
            );
        });
        it('win32   → choco install clamav', () => {
            assert.deepEqual(getInstallerCommand('win32'), ['choco', ['install', 'clamav', '-y']]);
        });
        it('unknown → [null, []]', () => {
            assert.deepEqual(getInstallerCommand('freebsd'), [null, []]);
        });
    });

    describe('getUpdaterCommand', () => {
        it('darwin  → freshclam', () => {
            assert.deepEqual(getUpdaterCommand('darwin'), ['freshclam', []]);
        });
        it('linux   → sudo freshclam', () => {
            assert.deepEqual(getUpdaterCommand('linux'), ['sudo', ['freshclam']]);
        });
        it('win32   → freshclam', () => {
            assert.deepEqual(getUpdaterCommand('win32'), ['freshclam', []]);
        });
        it('unknown → [null, []]', () => {
            assert.deepEqual(getUpdaterCommand('freebsd'), [null, []]);
        });
    });
});

// ─── ClamAVScanner ────────────────────────────────────────────────────────────

describe('ClamAVScanner', () => {
    const EXISTING_FILE = __filename;
    const MISSING_FILE  = path.join(__dirname, '__nonexistent_test_file__');

    /** Returns a freshly loaded ClamAVScanner with spawn replaced by spawnMock. */
    function scanner(spawnMock) {
        return load('../src/ClamAVScanner.js', { 'cross-spawn': spawnMock });
    }

    it('rejects if filePath is not a string', async () => {
        const { scan } = scanner(spawnClose(0));
        await assert.rejects(() => scan(42), /filePath must be a string/);
    });

    it('rejects if file does not exist', async () => {
        const { scan } = scanner(spawnClose(0));
        await assert.rejects(() => scan(MISSING_FILE), /File not found/);
    });

    it('exit code 0  → resolves to "Clean"', async () => {
        const { scan } = scanner(spawnClose(0));
        assert.equal(await scan(EXISTING_FILE), 'Clean');
    });

    it('exit code 1  → resolves to "Malicious"', async () => {
        const { scan } = scanner(spawnClose(1));
        assert.equal(await scan(EXISTING_FILE), 'Malicious');
    });

    it('exit code 2  → resolves to "ScanError"', async () => {
        const { scan } = scanner(spawnClose(2));
        assert.equal(await scan(EXISTING_FILE), 'ScanError');
    });

    it('exit code 99 → rejects with exit code message', async () => {
        const { scan } = scanner(spawnClose(99));
        await assert.rejects(() => scan(EXISTING_FILE), /Unexpected exit code: 99/);
    });

    it('spawn error  → rejects with the error', async () => {
        const { scan } = scanner(spawnError('ENOENT'));
        await assert.rejects(() => scan(EXISTING_FILE), /ENOENT/);
    });

    it('signal kill  → rejects with signal name', async () => {
        const { scan } = scanner(spawnClose(null, 'SIGTERM'));
        await assert.rejects(() => scan(EXISTING_FILE), /Process killed by signal: SIGTERM/);
    });
});

// ─── ClamAVInstaller ─────────────────────────────────────────────────────────

describe('ClamAVInstaller', () => {
    // Pin the platform to 'darwin' so tests are platform-independent.
    // Use 'freebsd' for the "unsupported platform" case.
    const CONSTANTS = '../src/constants.js';

    function installer({ alreadyInstalled, spawnMock, platform = 'darwin' }) {
        return load('../src/ClamAVInstaller.js', {
            [CONSTANTS]:     { PLATFORM: platform },
            'cross-spawn':   spawnMock,
            // child_process is a built-in; load() patches execSync in-place.
            'child_process': {
                execSync: alreadyInstalled
                    ? () => Buffer.from('/usr/bin/clamscan')
                    : () => { throw new Error('not found'); },
            },
        });
    }

    it('resolves if ClamAV is already installed', async () => {
        const { ClamAVInstaller } = installer({ alreadyInstalled: true, spawnMock: spawnClose(0) });
        assert.equal(await ClamAVInstaller(), 'ClamAV is already installed, skipping.');
    });

    it('resolves with platform-not-supported message', async () => {
        const { ClamAVInstaller } = installer({
            alreadyInstalled: false,
            platform: 'freebsd',
            spawnMock: spawnClose(0),
        });
        assert.equal(await ClamAVInstaller(), 'Current platform is not supported.');
    });

    it('resolves after successful installation', async () => {
        const { ClamAVInstaller } = installer({ alreadyInstalled: false, spawnMock: spawnClose(0) });
        assert.equal(await ClamAVInstaller(), 'Installation completed successfully!');
    });

    it('rejects when installation exits non-zero', async () => {
        const { ClamAVInstaller } = installer({ alreadyInstalled: false, spawnMock: spawnClose(1) });
        await assert.rejects(() => ClamAVInstaller(), /Installation failed with exit code: 1/);
    });

    it('rejects on spawn error', async () => {
        const { ClamAVInstaller } = installer({ alreadyInstalled: false, spawnMock: spawnError('EACCES') });
        await assert.rejects(() => ClamAVInstaller(), /EACCES/);
    });
});

// ─── ClamAVDatabaseUpdater ────────────────────────────────────────────────────

describe('ClamAVDatabaseUpdater', () => {
    const CONSTANTS = '../src/constants.js';
    const CONFIG    = '../src/config.js';

    // Spread the real config so INSTALLER_COMMANDS / UPDATER_COMMANDS / SCAN_RESULTS
    // remain intact; only DB_PATHS is overridden per test.
    const realConfig = require('../src/config.js');

    function updater({ dbExists, spawnMock, platform = 'darwin' }) {
        const dbPath = dbExists
            ? __filename                                          // guaranteed to exist
            : path.join(__dirname, '__nonexistent_db__');        // guaranteed to not exist

        return load('../src/ClamAVDatabaseUpdater.js', {
            [CONSTANTS]: { PLATFORM: platform },
            [CONFIG]:    { ...realConfig, DB_PATHS: { [platform]: dbPath } },
            'cross-spawn': spawnMock,
        });
    }

    it('resolves if database is already present', async () => {
        const { updateClamAVDatabase } = updater({ dbExists: true, spawnMock: spawnClose(0) });
        assert.equal(
            await updateClamAVDatabase(),
            'Virus database already present, skipping.'
        );
    });

    it('resolves with platform-not-supported message', async () => {
        // 'freebsd' has no entry in UPDATER_COMMANDS → [null, []] → unsupported branch.
        const { updateClamAVDatabase } = updater({
            dbExists: false,
            platform: 'freebsd',
            spawnMock: spawnClose(0),
        });
        assert.equal(await updateClamAVDatabase(), 'Current platform is not supported.');
    });

    it('resolves after successful update', async () => {
        const { updateClamAVDatabase } = updater({ dbExists: false, spawnMock: spawnClose(0) });
        assert.equal(await updateClamAVDatabase(), 'Database updated successfully!');
    });

    it('rejects when update exits non-zero', async () => {
        const { updateClamAVDatabase } = updater({ dbExists: false, spawnMock: spawnClose(1) });
        await assert.rejects(
            () => updateClamAVDatabase(),
            /Database update failed with exit code: 1/
        );
    });

    it('rejects on spawn error', async () => {
        const { updateClamAVDatabase } = updater({ dbExists: false, spawnMock: spawnError('EPERM') });
        await assert.rejects(() => updateClamAVDatabase(), /EPERM/);
    });
});
