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

// ─── ClamdScanner ─────────────────────────────────────────────────────────────

describe('ClamdScanner', () => {
    // Why not load() here?
    //
    // `net` and `fs` are true Node.js built-ins.  When load() patches them it
    // mutates properties on the live module object and then immediately restores
    // them after require() returns — before any test code ever runs.  Because
    // ClamdScanner.js holds a reference to the *same* live object, the mock is
    // already gone by the time scanViaClamd() is called.
    //
    // Solution: require the real modules once so we share the same object
    // references as ClamdScanner.js, then use t.mock.method() inside each test.
    // t.mock patches the property in-place and auto-restores it when the test
    // ends — no manual cleanup needed.
    const net = require('net');
    const fs  = require('fs');
    const { scanViaClamd } = require('../src/ClamdScanner.js');

    const EXISTING_FILE = __filename;

    /**
     * Builds a mock TCP socket for the narrow subset of events/methods that
     * ClamdScanner uses.
     *
     * Timing: createConnection() returns the socket synchronously; scanViaClamd
     * then attaches all listeners synchronously; the first event (connect/error/
     * timeout) fires on the next tick — so every listener is already wired up.
     *
     * end() schedules the clamd reply on the next tick after the terminating
     * chunk has been written, matching real clamd behaviour.
     */
    function makeClamdSocket({
        response     = 'stream: OK',
        connectError = null,
        emitTimeout  = false,
    } = {}) {
        const socket     = new EventEmitter();
        socket.destroyed = false;
        socket.written   = [];   // lets the protocol-sanity test inspect writes
        socket.setTimeout = () => {};
        socket.write      = (buf) => socket.written.push(buf);
        socket.destroy    = () => { socket.destroyed = true; };
        socket.end        = () => {
            process.nextTick(() => {
                socket.emit('data', Buffer.from(response));
                socket.emit('end');
            });
        };
        // Schedule first event so listeners are attached before it fires
        process.nextTick(() => {
            if (connectError)     socket.emit('error', new Error(connectError));
            else if (emitTimeout) socket.emit('timeout');
            else                  socket.emit('connect');
        });
        return socket;
    }

    /**
     * Returns a mock Readable that fires events on the next tick.
     * It is created inside the 'connect' handler so one nextTick is enough for
     * scanViaClamd to attach 'data'/'end'/'error' listeners first.
     */
    function makeMockStream({ streamError = null } = {}) {
        const stream = new EventEmitter();
        process.nextTick(() => {
            if (streamError) stream.emit('error', new Error(streamError));
            else {
                stream.emit('data', Buffer.from('test file bytes'));
                stream.emit('end');
            }
        });
        return stream;
    }

    // ── Input validation ──────────────────────────────────────────────────────

    it('rejects if filePath is not a string', async () => {
        // No I/O at all — no mocking needed.
        await assert.rejects(() => scanViaClamd(42), /filePath must be a string/);
    });

    it('rejects if file does not exist', async (t) => {
        t.mock.method(fs, 'existsSync', () => false);
        await assert.rejects(() => scanViaClamd(EXISTING_FILE), /File not found/);
    });

    // ── Response parsing ──────────────────────────────────────────────────────

    it('"stream: OK"              → "Clean"', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ response: 'stream: OK' }));
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream());
        assert.equal(await scanViaClamd(EXISTING_FILE), 'Clean');
    });

    it('"stream: ... FOUND"       → "Malicious"', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ response: 'stream: EICAR-Test-Signature FOUND' }));
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream());
        assert.equal(await scanViaClamd(EXISTING_FILE), 'Malicious');
    });

    it('any other clamd response  → "ScanError"', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ response: 'ERROR: Could not connect' }));
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream());
        assert.equal(await scanViaClamd(EXISTING_FILE), 'ScanError');
    });

    // ── Error paths ───────────────────────────────────────────────────────────

    it('socket error (ECONNREFUSED) → rejects with that error', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ connectError: 'ECONNREFUSED' }));
        t.mock.method(fs,  'existsSync',       () => true);
        // createReadStream is never reached when the socket errors before connect
        await assert.rejects(() => scanViaClamd(EXISTING_FILE), /ECONNREFUSED/);
    });

    it('socket timeout              → rejects with timeout message', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ emitTimeout: true }));
        t.mock.method(fs,  'existsSync',       () => true);
        await assert.rejects(() => scanViaClamd(EXISTING_FILE), /timed out/);
    });

    it('file read stream error      → rejects with that error', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket());
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream({ streamError: 'EACCES' }));
        await assert.rejects(() => scanViaClamd(EXISTING_FILE), /EACCES/);
    });

    // ── Protocol sanity ───────────────────────────────────────────────────────

    it('sends zINSTREAM command, chunk header, chunk data, and terminator', async (t) => {
        const fileChunk = Buffer.from('hello world');
        let   capturedSocket;

        t.mock.method(net, 'createConnection', () => {
            capturedSocket = makeClamdSocket({ response: 'stream: OK' });
            return capturedSocket;
        });
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'createReadStream', () => {
            const stream = new EventEmitter();
            process.nextTick(() => { stream.emit('data', fileChunk); stream.emit('end'); });
            return stream;
        });

        await scanViaClamd(EXISTING_FILE);

        const w = capturedSocket.written;
        // [0] zINSTREAM\0 command
        assert.deepEqual(w[0], Buffer.from('zINSTREAM\0'));
        // [1] 4-byte big-endian chunk length
        const header = Buffer.allocUnsafe(4);
        header.writeUInt32BE(fileChunk.length, 0);
        assert.deepEqual(w[1], header);
        // [2] chunk data
        assert.deepEqual(w[2], fileChunk);
        // [3] four zero bytes — terminating chunk
        assert.deepEqual(w[3], Buffer.alloc(4));
    });
});

// ─── ClamAVScanner — TCP routing ──────────────────────────────────────────────

describe('ClamAVScanner (TCP routing)', () => {
    const EXISTING_FILE = __filename;

    /**
     * Loads ClamAVScanner with the ClamdScanner module replaced by a spy.
     * The spy records every call to scanViaClamd and resolves with `clamdResult`.
     * cross-spawn is mocked with spawnClose(0) so the CLI path resolves too.
     */
    function scannerWithSpy(clamdResult = 'Clean') {
        let clamdCalls = 0;
        let lastFilePath;
        let lastOptions;

        const spy = {
            scanViaClamd: (fp, opts) => {
                clamdCalls++;
                lastFilePath = fp;
                lastOptions  = opts;
                return Promise.resolve(clamdResult);
            },
        };

        const { scan } = load('../src/ClamAVScanner.js', {
            '../src/ClamdScanner.js': spy,
            'cross-spawn': spawnClose(0),
        });

        return {
            scan,
            getClamdCalls:   () => clamdCalls,
            getLastFilePath: () => lastFilePath,
            getLastOptions:  () => lastOptions,
        };
    }

    // ── Clamd path ────────────────────────────────────────────────────────────

    it('routes to clamd when { port } is given', async () => {
        const { scan, getClamdCalls } = scannerWithSpy();
        const result = await scan(EXISTING_FILE, { port: 3310 });
        assert.equal(result, 'Clean');
        assert.equal(getClamdCalls(), 1);
    });

    it('routes to clamd when { host } is given', async () => {
        const { scan, getClamdCalls } = scannerWithSpy();
        const result = await scan(EXISTING_FILE, { host: '192.168.1.100' });
        assert.equal(result, 'Clean');
        assert.equal(getClamdCalls(), 1);
    });

    it('routes to clamd when { host, port } are both given', async () => {
        const { scan, getClamdCalls, getLastOptions } = scannerWithSpy();
        await scan(EXISTING_FILE, { host: '10.0.0.5', port: 3310 });
        assert.equal(getClamdCalls(), 1);
        assert.deepEqual(getLastOptions(), { host: '10.0.0.5', port: 3310 });
    });

    it('forwards filePath and options unchanged to scanViaClamd', async () => {
        const { scan, getLastFilePath, getLastOptions } = scannerWithSpy();
        await scan(EXISTING_FILE, { host: 'clamd-svc', port: 9999, timeout: 5000 });
        assert.equal(getLastFilePath(), EXISTING_FILE);
        assert.deepEqual(getLastOptions(), { host: 'clamd-svc', port: 9999, timeout: 5000 });
    });

    // ── CLI path ──────────────────────────────────────────────────────────────

    it('uses the CLI path when called without options', async () => {
        const { scan, getClamdCalls } = scannerWithSpy();
        const result = await scan(EXISTING_FILE);
        assert.equal(result, 'Clean');
        assert.equal(getClamdCalls(), 0);
    });

    it('uses the CLI path when called with an empty options object {}', async () => {
        const { scan, getClamdCalls } = scannerWithSpy();
        const result = await scan(EXISTING_FILE, {});
        assert.equal(result, 'Clean');
        assert.equal(getClamdCalls(), 0);
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
