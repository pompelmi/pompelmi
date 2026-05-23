'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const path = require('path');

// Pull in the Verdict constants once — they are module-level singletons, so the
// same Symbol instances are returned whether required here or inside source files.
const { Verdict } = require('../src/verdicts.js');

// ─── Spawn mock helpers ───────────────────────────────────────────────────────

/** Returns a nativeSpawn mock that emits 'close' with the given code and signal. */
function spawnClose(code, signal = null) {
    return () => {
        const child = new EventEmitter();
        process.nextTick(() => child.emit('close', code, signal));
        return child;
    };
}

/** Returns a nativeSpawn mock that emits 'error'. */
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
 *   - npm package names  ('some-package')
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

// ─── Verdict ──────────────────────────────────────────────────────────────────

describe('Verdict', () => {
    it('exports exactly three Symbol constants', () => {
        assert.equal(typeof Verdict.Clean,     'symbol');
        assert.equal(typeof Verdict.Malicious, 'symbol');
        assert.equal(typeof Verdict.ScanError, 'symbol');
    });

    it('each constant is unique', () => {
        assert.notEqual(Verdict.Clean,     Verdict.Malicious);
        assert.notEqual(Verdict.Clean,     Verdict.ScanError);
        assert.notEqual(Verdict.Malicious, Verdict.ScanError);
    });

    it('constants carry the expected description', () => {
        assert.equal(Verdict.Clean.description,     'Clean');
        assert.equal(Verdict.Malicious.description, 'Malicious');
        assert.equal(Verdict.ScanError.description, 'ScanError');
    });

    it('is frozen (no accidental mutation)', () => {
        assert.ok(Object.isFrozen(Verdict));
    });

    it('re-requiring verdicts.js returns the same Symbol instances', () => {
        // Symbols are module-level singletons — critical for === comparisons.
        const { Verdict: V2 } = require('../src/verdicts.js');
        assert.equal(Verdict.Clean,     V2.Clean);
        assert.equal(Verdict.Malicious, V2.Malicious);
        assert.equal(Verdict.ScanError, V2.ScanError);
    });
});

// ─── ClamAVScanner ────────────────────────────────────────────────────────────

describe('ClamAVScanner', () => {
    const EXISTING_FILE = __filename;
    const MISSING_FILE  = path.join(__dirname, '__nonexistent_test_file__');

    /**
     * Returns a freshly loaded ClamAVScanner with nativeSpawn replaced by spawnMock.
     * The spawn module is mocked via its path so there is no cross-spawn dependency.
     */
    function scanner(spawnMock) {
        return load('../src/ClamAVScanner.js', { '../src/spawn.js': { nativeSpawn: spawnMock } });
    }

    it('rejects if filePath is not a string', async () => {
        const { scan } = scanner(spawnClose(0));
        await assert.rejects(() => scan(42), /filePath must be a string/);
    });

    it('rejects if file does not exist', async () => {
        const { scan } = scanner(spawnClose(0));
        await assert.rejects(() => scan(MISSING_FILE), /File not found/);
    });

    it('exit code 0  → resolves to Verdict.Clean', async () => {
        const { scan } = scanner(spawnClose(0));
        assert.equal(await scan(EXISTING_FILE), Verdict.Clean);
    });

    it('exit code 1  → resolves to Verdict.Malicious', async () => {
        const { scan } = scanner(spawnClose(1));
        assert.equal(await scan(EXISTING_FILE), Verdict.Malicious);
    });

    it('exit code 2  → resolves to Verdict.ScanError', async () => {
        const { scan } = scanner(spawnClose(2));
        assert.equal(await scan(EXISTING_FILE), Verdict.ScanError);
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
            [CONSTANTS]:         { PLATFORM: platform },
            '../src/spawn.js':   { nativeSpawn: spawnMock },
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

    // ── Response parsing → Verdict Symbols ───────────────────────────────────

    it('"stream: OK"              → Verdict.Clean', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ response: 'stream: OK' }));
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream());
        assert.equal(await scanViaClamd(EXISTING_FILE), Verdict.Clean);
    });

    it('"stream: ... FOUND"       → Verdict.Malicious', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ response: 'stream: EICAR-Test-Signature FOUND' }));
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream());
        assert.equal(await scanViaClamd(EXISTING_FILE), Verdict.Malicious);
    });

    it('any other clamd response  → Verdict.ScanError', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ response: 'ERROR: Could not connect' }));
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream());
        assert.equal(await scanViaClamd(EXISTING_FILE), Verdict.ScanError);
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

    // ── UNIX socket connection ─────────────────────────────────────────────────

    it('{ socket } → passes { path } to createConnection instead of { host, port }', async (t) => {
        let capturedConnOpts;
        t.mock.method(net, 'createConnection', (opts) => {
            capturedConnOpts = opts;
            return makeClamdSocket({ response: 'stream: OK' });
        });
        t.mock.method(fs, 'existsSync',       () => true);
        t.mock.method(fs, 'createReadStream', () => makeMockStream());
        await scanViaClamd(EXISTING_FILE, { socket: '/run/clamav/clamd.sock' });
        assert.deepEqual(capturedConnOpts, { path: '/run/clamav/clamd.sock' });
    });

    it('{ socket } → resolves to Verdict.Clean when clamd says OK', async (t) => {
        t.mock.method(net, 'createConnection', () => makeClamdSocket({ response: 'stream: OK' }));
        t.mock.method(fs,  'existsSync',       () => true);
        t.mock.method(fs,  'createReadStream', () => makeMockStream());
        assert.equal(await scanViaClamd(EXISTING_FILE, { socket: '/run/clamav/clamd.sock' }), Verdict.Clean);
    });

    it('{ socket } + timeout → still uses { path } not host/port', async (t) => {
        let capturedConnOpts;
        t.mock.method(net, 'createConnection', (opts) => {
            capturedConnOpts = opts;
            return makeClamdSocket({ response: 'stream: OK' });
        });
        t.mock.method(fs, 'existsSync',       () => true);
        t.mock.method(fs, 'createReadStream', () => makeMockStream());
        await scanViaClamd(EXISTING_FILE, { socket: '/run/clamav/clamd.sock', timeout: 5000 });
        assert.deepEqual(capturedConnOpts, { path: '/run/clamav/clamd.sock' });
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
     * nativeSpawn is mocked with spawnClose(0) so the CLI path resolves too.
     */
    function scannerWithSpy(clamdResult = Verdict.Clean) {
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
            '../src/spawn.js': { nativeSpawn: spawnClose(0) },
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
        assert.equal(result, Verdict.Clean);
        assert.equal(getClamdCalls(), 1);
    });

    it('routes to clamd when { host } is given', async () => {
        const { scan, getClamdCalls } = scannerWithSpy();
        const result = await scan(EXISTING_FILE, { host: '192.168.1.100' });
        assert.equal(result, Verdict.Clean);
        assert.equal(getClamdCalls(), 1);
    });

    it('routes to clamd when { socket } is given', async () => {
        const { scan, getClamdCalls, getLastOptions } = scannerWithSpy();
        const result = await scan(EXISTING_FILE, { socket: '/run/clamav/clamd.sock' });
        assert.equal(result, Verdict.Clean);
        assert.equal(getClamdCalls(), 1);
        assert.deepEqual(getLastOptions(), { socket: '/run/clamav/clamd.sock' });
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
        assert.equal(result, Verdict.Clean);
        assert.equal(getClamdCalls(), 0);
    });

    it('uses the CLI path when called with an empty options object {}', async () => {
        const { scan, getClamdCalls } = scannerWithSpy();
        const result = await scan(EXISTING_FILE, {});
        assert.equal(result, Verdict.Clean);
        assert.equal(getClamdCalls(), 0);
    });
});

// ─── scanBuffer ──────────────────────────────────────────────────────────────

describe('scanBuffer', () => {
    const fs = require('fs');

    // Load a fresh ClamAVScanner with optional dep overrides.
    function bufferScanner({ spawnMock = spawnClose(0), bufferScannerMock } = {}) {
        const mocks = { '../src/spawn.js': { nativeSpawn: spawnMock } };
        if (bufferScannerMock) mocks['../src/BufferScanner.js'] = bufferScannerMock;
        return load('../src/ClamAVScanner.js', mocks);
    }

    // ── Input validation ──────────────────────────────────────────────────────

    it('rejects with Error if buffer is not a Buffer', async () => {
        const { scanBuffer } = bufferScanner();
        await assert.rejects(() => scanBuffer('not a buffer'), /buffer must be a Buffer/);
    });

    it('rejects with Error if buffer is not a Buffer (number)', async () => {
        const { scanBuffer } = bufferScanner();
        await assert.rejects(() => scanBuffer(42), /buffer must be a Buffer/);
    });

    it('rejects with Error if buffer is empty', async () => {
        const { scanBuffer } = bufferScanner();
        await assert.rejects(() => scanBuffer(Buffer.alloc(0)), /buffer is empty/);
    });

    // ── Local mode (no host/port) — mock fs built-in + spawn ─────────────────

    it('returns Verdict.Clean for a clean buffer (local mode)', async (t) => {
        t.mock.method(fs, 'writeFileSync', () => {});
        t.mock.method(fs, 'existsSync',    () => true);
        t.mock.method(fs, 'unlink',        (_p, cb) => cb(null));
        const { scanBuffer } = bufferScanner({ spawnMock: spawnClose(0) });
        assert.equal(await scanBuffer(Buffer.from('clean content')), Verdict.Clean);
    });

    it('returns Verdict.Malicious for a malicious buffer (local mode)', async (t) => {
        t.mock.method(fs, 'writeFileSync', () => {});
        t.mock.method(fs, 'existsSync',    () => true);
        t.mock.method(fs, 'unlink',        (_p, cb) => cb(null));
        const { scanBuffer } = bufferScanner({ spawnMock: spawnClose(1) });
        assert.equal(await scanBuffer(Buffer.from('EICAR')), Verdict.Malicious);
    });

    it('returns Verdict.ScanError on scan error (local mode)', async (t) => {
        t.mock.method(fs, 'writeFileSync', () => {});
        t.mock.method(fs, 'existsSync',    () => true);
        t.mock.method(fs, 'unlink',        (_p, cb) => cb(null));
        const { scanBuffer } = bufferScanner({ spawnMock: spawnClose(2) });
        assert.equal(await scanBuffer(Buffer.from('garbled')), Verdict.ScanError);
    });

    // ── TCP mode (host/port provided) — mock BufferScanner module ─────────────

    it('routes to scanBufferViaClamd when { host } is given', async () => {
        const { scanBuffer } = bufferScanner({
            bufferScannerMock: { scanBufferViaClamd: () => Promise.resolve(Verdict.Clean) },
        });
        assert.equal(await scanBuffer(Buffer.from('data'), { host: '127.0.0.1' }), Verdict.Clean);
    });

    it('routes to scanBufferViaClamd when { port } is given', async () => {
        const { scanBuffer } = bufferScanner({
            bufferScannerMock: { scanBufferViaClamd: () => Promise.resolve(Verdict.Clean) },
        });
        assert.equal(await scanBuffer(Buffer.from('data'), { port: 3310 }), Verdict.Clean);
    });

    it('routes to scanBufferViaClamd when { socket } is given', async () => {
        const { scanBuffer } = bufferScanner({
            bufferScannerMock: { scanBufferViaClamd: () => Promise.resolve(Verdict.Clean) },
        });
        assert.equal(await scanBuffer(Buffer.from('data'), { socket: '/run/clamav/clamd.sock' }), Verdict.Clean);
    });

    it('returns Verdict.Malicious for a malicious buffer (TCP mode)', async () => {
        const { scanBuffer } = bufferScanner({
            bufferScannerMock: { scanBufferViaClamd: () => Promise.resolve(Verdict.Malicious) },
        });
        assert.equal(await scanBuffer(Buffer.from('EICAR'), { host: '127.0.0.1' }), Verdict.Malicious);
    });

    it('returns Verdict.ScanError on scan error (TCP mode)', async () => {
        const { scanBuffer } = bufferScanner({
            bufferScannerMock: { scanBufferViaClamd: () => Promise.resolve(Verdict.ScanError) },
        });
        assert.equal(await scanBuffer(Buffer.from('data'), { host: '127.0.0.1' }), Verdict.ScanError);
    });
});

// ─── scanStream ──────────────────────────────────────────────────────────────

describe('scanStream', () => {
    const fs = require('fs');
    const { Readable } = require('stream');

    function streamScanner({ spawnMock = spawnClose(0), streamScannerMock } = {}) {
        const mocks = { '../src/spawn.js': { nativeSpawn: spawnMock } };
        if (streamScannerMock) mocks['../src/StreamScanner.js'] = streamScannerMock;
        return load('../src/ClamAVScanner.js', mocks);
    }

    function makeMockWritable() {
        const w = new EventEmitter();
        w.write   = () => true;
        w.end     = () => process.nextTick(() => w.emit('finish'));
        w.destroy = () => {};
        return w;
    }

    // ── Input validation ──────────────────────────────────────────────────────

    it('rejects if stream is not a Readable (number)', async () => {
        const { scanStream } = streamScanner();
        await assert.rejects(() => scanStream(42), /stream must be a Readable/);
    });

    it('rejects if stream is not a Readable (plain object)', async () => {
        const { scanStream } = streamScanner();
        await assert.rejects(() => scanStream({}), /stream must be a Readable/);
    });

    // ── Local mode (no host/port) — mock fs built-in + spawn ─────────────────

    it('returns Verdict.Clean for a clean stream (mock internals)', async (t) => {
        t.mock.method(fs, 'createWriteStream', () => makeMockWritable());
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'unlink', (_p, cb) => cb(null));
        const { scanStream } = streamScanner({ spawnMock: spawnClose(0) });
        const stream = new Readable({ read() { this.push(Buffer.from('clean')); this.push(null); } });
        assert.equal(await scanStream(stream), Verdict.Clean);
    });

    it('returns Verdict.Malicious for a stream with EICAR content', async (t) => {
        t.mock.method(fs, 'createWriteStream', () => makeMockWritable());
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'unlink', (_p, cb) => cb(null));
        const { scanStream } = streamScanner({ spawnMock: spawnClose(1) });
        const stream = new Readable({ read() { this.push(Buffer.from('EICAR')); this.push(null); } });
        assert.equal(await scanStream(stream), Verdict.Malicious);
    });

    it('returns Verdict.ScanError on scan error', async (t) => {
        t.mock.method(fs, 'createWriteStream', () => makeMockWritable());
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'unlink', (_p, cb) => cb(null));
        const { scanStream } = streamScanner({ spawnMock: spawnClose(2) });
        const stream = new Readable({ read() { this.push(Buffer.from('garbled')); this.push(null); } });
        assert.equal(await scanStream(stream), Verdict.ScanError);
    });

    it('rejects if stream emits an error event', async (t) => {
        t.mock.method(fs, 'createWriteStream', () => makeMockWritable());
        t.mock.method(fs, 'unlink', (_p, cb) => cb(null));
        const { scanStream } = streamScanner({ spawnMock: spawnClose(0) });
        const stream = new Readable({
            read() { this.emit('error', new Error('stream read error')); },
        });
        await assert.rejects(() => scanStream(stream), /stream read error/);
    });

    // ── TCP mode (host/port provided) — mock StreamScanner module ────────────

    it('routes to scanStreamViaClamd when { host } is given', async () => {
        const { scanStream } = streamScanner({
            streamScannerMock: { scanStreamViaClamd: () => Promise.resolve(Verdict.Clean) },
        });
        const stream = new Readable({ read() { this.push(null); } });
        assert.equal(await scanStream(stream, { host: '127.0.0.1' }), Verdict.Clean);
    });

    it('routes to scanStreamViaClamd when { port } is given', async () => {
        const { scanStream } = streamScanner({
            streamScannerMock: { scanStreamViaClamd: () => Promise.resolve(Verdict.Clean) },
        });
        const stream = new Readable({ read() { this.push(null); } });
        assert.equal(await scanStream(stream, { port: 3310 }), Verdict.Clean);
    });

    it('routes to scanStreamViaClamd when { socket } is given', async () => {
        const { scanStream } = streamScanner({
            streamScannerMock: { scanStreamViaClamd: () => Promise.resolve(Verdict.Clean) },
        });
        const stream = new Readable({ read() { this.push(null); } });
        assert.equal(await scanStream(stream, { socket: '/run/clamav/clamd.sock' }), Verdict.Clean);
    });

    it('returns Verdict.Malicious via TCP mode', async () => {
        const { scanStream } = streamScanner({
            streamScannerMock: { scanStreamViaClamd: () => Promise.resolve(Verdict.Malicious) },
        });
        const stream = new Readable({ read() { this.push(null); } });
        assert.equal(await scanStream(stream, { host: '127.0.0.1' }), Verdict.Malicious);
    });

    it('returns Verdict.ScanError via TCP mode', async () => {
        const { scanStream } = streamScanner({
            streamScannerMock: { scanStreamViaClamd: () => Promise.resolve(Verdict.ScanError) },
        });
        const stream = new Readable({ read() { this.push(null); } });
        assert.equal(await scanStream(stream, { host: '127.0.0.1' }), Verdict.ScanError);
    });
});

// ─── parseClamdResponse (null-byte stripping — fix #189) ─────────────────────

describe('parseClamdResponse (null-byte stripping)', () => {
    // parseClamdResponse is not exported, so we test it indirectly via the net
    // socket path.  We drive scanStreamViaClamd with a mock socket whose response
    // contains (or lacks) a trailing null byte and assert the returned Verdict.

    const net = require('net');
    const { Readable } = require('stream');

    function makeSocketWithResponse(response) {
        const sock     = new EventEmitter();
        sock.destroyed = false;
        sock.written   = [];
        sock.setTimeout = () => {};
        sock.write      = (buf) => { sock.written.push(buf); };
        sock.destroy    = () => { sock.destroyed = true; };
        sock.end        = () => {
            process.nextTick(() => {
                sock.emit('data', Buffer.from(response));
                sock.emit('end');
            });
        };
        process.nextTick(() => sock.emit('connect'));
        return sock;
    }

    function makeStream() {
        const s = new Readable({ read() {} });
        process.nextTick(() => { s.push(Buffer.from('x')); s.push(null); });
        return s;
    }

    it('"stream: OK\\0"  → Verdict.Clean (null-terminated response)', async (t) => {
        const { scanStreamViaClamd } = require('../src/StreamScanner.js');
        t.mock.method(net, 'createConnection', () => makeSocketWithResponse('stream: OK\0'));
        assert.equal(await scanStreamViaClamd(makeStream()), Verdict.Clean);
    });

    it('"stream: OK"     → Verdict.Clean (no null byte, no regression)', async (t) => {
        const { scanStreamViaClamd } = require('../src/StreamScanner.js');
        t.mock.method(net, 'createConnection', () => makeSocketWithResponse('stream: OK'));
        assert.equal(await scanStreamViaClamd(makeStream()), Verdict.Clean);
    });

    it('"stream: Win.Test.EICAR_HDB-1 FOUND\\0" → Verdict.Malicious (null-terminated)', async (t) => {
        const { scanStreamViaClamd } = require('../src/StreamScanner.js');
        t.mock.method(net, 'createConnection', () =>
            makeSocketWithResponse('stream: Win.Test.EICAR_HDB-1 FOUND\0')
        );
        assert.equal(await scanStreamViaClamd(makeStream()), Verdict.Malicious);
    });

    it('"stream: Win.Test.EICAR_HDB-1 FOUND"   → Verdict.Malicious (no regression)', async (t) => {
        const { scanStreamViaClamd } = require('../src/StreamScanner.js');
        t.mock.method(net, 'createConnection', () =>
            makeSocketWithResponse('stream: Win.Test.EICAR_HDB-1 FOUND')
        );
        assert.equal(await scanStreamViaClamd(makeStream()), Verdict.Malicious);
    });
});

// ─── scanDirectory ───────────────────────────────────────────────────────────

describe('scanDirectory', () => {
    const fs   = require('fs');

    function dirScanner(spawnMock) {
        return load('../src/ClamAVScanner.js', { '../src/spawn.js': { nativeSpawn: spawnMock } });
    }

    it('rejects if dirPath is not a string', async () => {
        const { scanDirectory } = dirScanner(spawnClose(0));
        await assert.rejects(() => scanDirectory(42), /dirPath must be a string/);
    });

    it('rejects if directory does not exist', async (t) => {
        t.mock.method(fs, 'existsSync', () => false);
        const { scanDirectory } = dirScanner(spawnClose(0));
        await assert.rejects(() => scanDirectory('/nonexistent'), /Directory not found: \/nonexistent/);
    });

    it('returns correct clean/malicious/errors arrays (mock scan)', async (t) => {
        let callCount = 0;
        const codes = [0, 1, 2]; // Clean, Malicious, ScanError
        const spawnSequence = () => {
            const code = codes[callCount++ % codes.length];
            const child = new EventEmitter();
            process.nextTick(() => child.emit('close', code, null));
            return child;
        };

        t.mock.method(fs, 'existsSync',  () => true);
        t.mock.method(fs, 'readdirSync', () => ['a.txt', 'b.txt', 'c.txt']);
        t.mock.method(fs, 'statSync',    () => ({ isFile: () => true }));

        const { scanDirectory } = dirScanner(spawnSequence);
        const result = await scanDirectory('/fake-dir');

        assert.equal(result.clean.length,     1);
        assert.equal(result.malicious.length, 1);
        assert.equal(result.errors.length,    1);
        assert.ok(result.clean[0].includes('a.txt'));
        assert.ok(result.malicious[0].includes('b.txt'));
        assert.ok(result.errors[0].includes('c.txt'));
    });

    it('handles per-file scan errors without throwing', async (t) => {
        t.mock.method(fs, 'existsSync',  () => true);
        t.mock.method(fs, 'readdirSync', () => ['x.bin', 'y.bin']);
        t.mock.method(fs, 'statSync',    () => ({ isFile: () => true }));

        const { scanDirectory } = dirScanner(spawnError('EACCES'));
        const result = await scanDirectory('/fake-dir');

        assert.equal(result.clean.length,     0);
        assert.equal(result.malicious.length, 0);
        assert.equal(result.errors.length,    2);
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
            [CONSTANTS]:       { PLATFORM: platform },
            [CONFIG]:          { ...realConfig, DB_PATHS: { [platform]: dbPath } },
            '../src/spawn.js': { nativeSpawn: spawnMock },
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

// ─── Retry logic (ClamdScanner / BufferScanner / StreamScanner) ───────────────

describe('Retry logic', () => {
    const net = require('net');
    const fs  = require('fs');

    function makeFailSocket(message) {
        const sock = new EventEmitter();
        sock.destroyed = false;
        sock.setTimeout = () => {};
        sock.destroy    = () => { sock.destroyed = true; };
        process.nextTick(() => sock.emit('error', new Error(message)));
        return sock;
    }

    function makeOkClamdSocket() {
        const sock     = new EventEmitter();
        sock.destroyed = false;
        sock.written   = [];
        sock.setTimeout = () => {};
        sock.write      = (buf) => { sock.written.push(buf); };
        sock.destroy    = () => { sock.destroyed = true; };
        sock.end        = () => {
            process.nextTick(() => {
                sock.emit('data', Buffer.from('stream: OK'));
                sock.emit('end');
            });
        };
        process.nextTick(() => sock.emit('connect'));
        return sock;
    }

    it('scanViaClamd succeeds on 3rd attempt with retries:2 retryDelay:0', async (t) => {
        const { scanViaClamd } = require('../src/ClamdScanner.js');
        let callCount = 0;
        t.mock.method(net, 'createConnection', () => {
            callCount++;
            if (callCount < 3) return makeFailSocket('ECONNREFUSED');
            return makeOkClamdSocket();
        });
        t.mock.method(fs, 'existsSync',       () => true);
        t.mock.method(fs, 'createReadStream', () => {
            const s = new EventEmitter();
            process.nextTick(() => { s.emit('data', Buffer.from('x')); s.emit('end'); });
            return s;
        });
        const result = await scanViaClamd(__filename, { retries: 2, retryDelay: 0 });
        assert.equal(result, Verdict.Clean);
        assert.equal(callCount, 3);
    });

    it('scanViaClamd rejects after exhausting retries', async (t) => {
        const { scanViaClamd } = require('../src/ClamdScanner.js');
        t.mock.method(net, 'createConnection', () => makeFailSocket('ECONNREFUSED'));
        t.mock.method(fs, 'existsSync',        () => true);
        await assert.rejects(
            () => scanViaClamd(__filename, { retries: 1, retryDelay: 0 }),
            /ECONNREFUSED/
        );
    });

    it('scanBufferViaClamd retries on connection error', async (t) => {
        const { scanBufferViaClamd } = require('../src/BufferScanner.js');
        let callCount = 0;
        t.mock.method(net, 'createConnection', () => {
            callCount++;
            if (callCount < 2) return makeFailSocket('ETIMEDOUT');
            return makeOkClamdSocket();
        });
        const result = await scanBufferViaClamd(Buffer.from('data'), { retries: 1, retryDelay: 0 });
        assert.equal(result, Verdict.Clean);
        assert.equal(callCount, 2);
    });

    it('scanStreamViaClamd retries on connection error', async (t) => {
        const { scanStreamViaClamd } = require('../src/StreamScanner.js');
        const { Readable } = require('stream');
        let callCount = 0;
        t.mock.method(net, 'createConnection', () => {
            callCount++;
            if (callCount < 2) return makeFailSocket('ECONNREFUSED');
            return makeOkClamdSocket();
        });
        const stream = new Readable({ read() { this.push(null); } });
        const result = await scanStreamViaClamd(stream, { retries: 1, retryDelay: 0 });
        assert.equal(result, Verdict.Clean);
        assert.equal(callCount, 2);
    });
});

// ─── ClamdPool ────────────────────────────────────────────────────────────────

describe('ClamdPool', () => {
    const net = require('net');
    const fs  = require('fs');
    const { createPool } = require('../src/ClamdPool.js');

    function makePersistentSocket({ response = 'stream: OK\0' } = {}) {
        const sock     = new EventEmitter();
        sock.destroyed = false;
        sock.written   = [];
        sock.readyState = 'open';
        sock.setTimeout = () => {};
        sock.write = (buf) => {
            sock.written.push(buf);
            if (buf.length === 4 && buf.readUInt32BE(0) === 0) {
                process.nextTick(() => sock.emit('data', Buffer.from(response)));
            }
            return true;
        };
        sock.destroy = () => { sock.destroyed = true; sock.readyState = 'closed'; };
        sock.end     = () => {};
        process.nextTick(() => sock.emit('connect'));
        return sock;
    }

    it('createPool returns an object with scan/scanBuffer/scanStream/destroy', () => {
        const pool = createPool();
        assert.equal(typeof pool.scan,        'function');
        assert.equal(typeof pool.scanBuffer,  'function');
        assert.equal(typeof pool.scanStream,  'function');
        assert.equal(typeof pool.destroy,     'function');
        pool.destroy();
    });

    it('pool.scan rejects for missing file', async () => {
        const pool = createPool({ host: '127.0.0.1', port: 3310 });
        await assert.rejects(
            () => pool.scan('/nonexistent/__test_pool_file__'),
            /File not found/
        );
        pool.destroy();
    });

    it('pool.scan rejects for non-string filePath', async () => {
        const pool = createPool({ host: '127.0.0.1', port: 3310 });
        await assert.rejects(() => pool.scan(42), /filePath must be a string/);
        pool.destroy();
    });

    it('pool.scanBuffer resolves to Verdict.Clean on "stream: OK\\0"', async (t) => {
        t.mock.method(net, 'createConnection', () => makePersistentSocket({ response: 'stream: OK\0' }));
        const pool   = createPool({ host: '127.0.0.1', port: 3310 });
        const result = await pool.scanBuffer(Buffer.from('clean data'));
        assert.equal(result, Verdict.Clean);
        pool.destroy();
    });

    it('pool.scanBuffer resolves to Verdict.Malicious on "FOUND\\0"', async (t) => {
        t.mock.method(net, 'createConnection', () =>
            makePersistentSocket({ response: 'stream: Eicar-Test-Signature FOUND\0' })
        );
        const pool   = createPool({ host: '127.0.0.1', port: 3310 });
        const result = await pool.scanBuffer(Buffer.from('malware'));
        assert.equal(result, Verdict.Malicious);
        pool.destroy();
    });

    it('pool.scanStream resolves to Verdict.Clean', async (t) => {
        const { Readable } = require('stream');
        t.mock.method(net, 'createConnection', () => makePersistentSocket({ response: 'stream: OK\0' }));
        const pool   = createPool({ host: '127.0.0.1', port: 3310 });
        const stream = new Readable({ read() { this.push(Buffer.from('data')); this.push(null); } });
        const result = await pool.scanStream(stream);
        assert.equal(result, Verdict.Clean);
        pool.destroy();
    });

    it('pool.scan resolves to Verdict.Clean', async (t) => {
        t.mock.method(net, 'createConnection', () => makePersistentSocket({ response: 'stream: OK\0' }));
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'createReadStream', () => {
            const s = new EventEmitter();
            process.nextTick(() => { s.emit('data', Buffer.from('hello')); s.emit('end'); });
            return s;
        });
        const pool   = createPool({ host: '127.0.0.1', port: 3310 });
        const result = await pool.scan(__filename);
        assert.equal(result, Verdict.Clean);
        pool.destroy();
    });

    it('pool.destroy rejects queued requests', async (t) => {
        t.mock.method(net, 'createConnection', () => {
            const sock = new EventEmitter();
            sock.destroyed = false;
            sock.readyState = 'opening';
            sock.setTimeout = () => {};
            sock.destroy = () => { sock.destroyed = true; };
            sock.write = () => {};
            sock.end = () => {};
            // Never emit 'connect' — keeps slot busy indefinitely
            return sock;
        });
        const pool = createPool({ size: 1, host: '127.0.0.1', port: 3310 });

        // Kick off one scan that will never complete (occupies the only slot)
        pool.scanBuffer(Buffer.from('x')).catch(() => {});

        // Give it a tick to enter runOnSlot
        await new Promise(r => process.nextTick(r));

        // Queue a second scan — it must be queued since slot is busy
        const queued = pool.scanBuffer(Buffer.from('y'));

        pool.destroy();

        await assert.rejects(() => queued, /Pool destroyed/);
    });
});

// ─── S3Scanner ────────────────────────────────────────────────────────────────

describe('S3Scanner', () => {
    it('scanS3 is exported from index', () => {
        const { scanS3 } = require('../src/index.js');
        assert.equal(typeof scanS3, 'function');
    });

    it('throws "Install AWS SDK" when @aws-sdk/client-s3 is not available', async () => {
        // Temporarily remove the SDK from cache (if installed) to simulate a missing package.
        let cachedEntry;
        let resolvedKey;
        try {
            resolvedKey  = require.resolve('@aws-sdk/client-s3');
            cachedEntry  = require.cache[resolvedKey];
            delete require.cache[resolvedKey];
        } catch {
            // SDK not installed — require.resolve throws, nothing to remove.
        }

        // Load a fresh S3Scanner without the SDK in cache.
        const { scanS3 } = load('../src/S3Scanner.js', {});

        try {
            await assert.rejects(
                () => scanS3({ bucket: 'b', key: 'k', region: 'us-east-1' }),
                /Install AWS SDK/
            );
        } finally {
            // Restore the SDK entry if we removed it.
            if (resolvedKey && cachedEntry) require.cache[resolvedKey] = cachedEntry;
        }
    });
});

// ─── Watcher ──────────────────────────────────────────────────────────────────

describe('Watcher', () => {
    const fs = require('fs');

    it('watch is exported from index', () => {
        const { watch } = require('../src/index.js');
        assert.equal(typeof watch, 'function');
    });

    it('fires onClean callback for clean files', async (t) => {
        let watchCb;

        t.mock.method(global, 'setTimeout',   (fn) => { process.nextTick(fn); return {}; });
        t.mock.method(global, 'clearTimeout', () => {});
        t.mock.method(fs, 'watch', (_dir, _opts, cb) => {
            watchCb = cb;
            return { close: () => {} };
        });
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'statSync',   () => ({ isFile: () => true }));

        const { watch } = load('../src/Watcher.js', {
            '../src/ClamAVScanner.js': { scan: () => Promise.resolve(Verdict.Clean) },
        });

        let cleanFile = null;
        watch('/fake', {}, { onClean: (fp) => { cleanFile = fp; } });

        watchCb('change', 'report.pdf');

        await new Promise(r => process.nextTick(r));

        assert.ok(cleanFile !== null, 'onClean should have been called');
        assert.ok(cleanFile.endsWith('report.pdf'));
    });

    it('fires onMalicious callback for infected files', async (t) => {
        let watchCb;

        t.mock.method(global, 'setTimeout',   (fn) => { process.nextTick(fn); return {}; });
        t.mock.method(global, 'clearTimeout', () => {});
        t.mock.method(fs, 'watch', (_dir, _opts, cb) => {
            watchCb = cb;
            return { close: () => {} };
        });
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'statSync',   () => ({ isFile: () => true }));

        const { watch } = load('../src/Watcher.js', {
            '../src/ClamAVScanner.js': { scan: () => Promise.resolve(Verdict.Malicious) },
        });

        let maliciousFile = null;
        watch('/fake', {}, { onMalicious: (fp) => { maliciousFile = fp; } });

        watchCb('change', 'virus.exe');

        await new Promise(r => process.nextTick(r));

        assert.ok(maliciousFile !== null, 'onMalicious should have been called');
        assert.ok(maliciousFile.endsWith('virus.exe'));
    });

    it('fires onError callback when scan throws', async (t) => {
        let watchCb;

        t.mock.method(global, 'setTimeout',   (fn) => { process.nextTick(fn); return {}; });
        t.mock.method(global, 'clearTimeout', () => {});
        t.mock.method(fs, 'watch', (_dir, _opts, cb) => {
            watchCb = cb;
            return { close: () => {} };
        });
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'statSync',   () => ({ isFile: () => true }));

        const { watch } = load('../src/Watcher.js', {
            '../src/ClamAVScanner.js': { scan: () => Promise.reject(new Error('ECONNREFUSED')) },
        });

        let caughtErr = null;
        watch('/fake', {}, { onError: (err) => { caughtErr = err; } });

        watchCb('change', 'file.bin');

        await new Promise(r => process.nextTick(r));

        assert.ok(caughtErr !== null, 'onError should have been called');
        assert.match(caughtErr.message, /ECONNREFUSED/);
    });

    it('skips deleted files (existsSync returns false)', async (t) => {
        let watchCb;

        t.mock.method(global, 'setTimeout',   (fn) => { process.nextTick(fn); return {}; });
        t.mock.method(global, 'clearTimeout', () => {});
        t.mock.method(fs, 'watch', (_dir, _opts, cb) => {
            watchCb = cb;
            return { close: () => {} };
        });
        t.mock.method(fs, 'existsSync', () => false);

        let called = false;
        const scanMock = { scan: () => { called = true; return Promise.resolve(Verdict.Clean); } };

        const { watch } = load('../src/Watcher.js', {
            '../src/ClamAVScanner.js': scanMock,
        });

        watch('/fake', {}, {});

        watchCb('rename', 'gone.txt');

        await new Promise(r => process.nextTick(r));

        assert.equal(called, false, 'scan should not be called for deleted files');
    });
});

// ─── WebhookNotifier ─────────────────────────────────────────────────────────

describe('WebhookNotifier', () => {
    // Require the live https module — same object WebhookNotifier.js holds.
    // We patch individual methods with t.mock.method() inside each test so that
    // the mock is active at call time (not just during module load).
    const https = require('https');
    const { notify } = require('../src/WebhookNotifier.js');
    const { Verdict: V } = require('../src/verdicts.js');

    /**
     * Builds a mock https.request function.
     * Returns { requestFn, getBody(), getHeaders() } so tests can inspect writes.
     */
    function makeRequestMock({ statusCode = 200, networkError = null } = {}) {
        let capturedHeaders = {};
        let capturedBody    = '';

        function requestFn(options, callback) {
            capturedHeaders = options.headers || {};
            const req = new EventEmitter();
            req.write = (chunk) => { capturedBody += chunk; };
            req.end   = () => {
                process.nextTick(() => {
                    if (networkError) {
                        req.emit('error', new Error(networkError));
                        return;
                    }
                    const res = new EventEmitter();
                    res.statusCode = statusCode;
                    res.resume = () => {};
                    callback(res);
                });
            };
            return req;
        }

        return { requestFn, getBody: () => capturedBody, getHeaders: () => capturedHeaders };
    }

    it('rejects if webhookUrl is not a string', async () => {
        await assert.rejects(() => notify(42, { verdict: 'Clean' }), /webhookUrl must be/);
    });

    it('rejects if scanResult is not an object', async () => {
        await assert.rejects(() => notify('https://example.com', null), /scanResult must be/);
    });

    it('resolves without sending when onlyOnMalicious=true and verdict is Clean', async (t) => {
        const mock = makeRequestMock();
        t.mock.method(https, 'request', mock.requestFn);
        await notify('https://example.com/hook', { verdict: V.Clean }, { onlyOnMalicious: true });
        assert.equal(mock.getBody(), '');
    });

    it('sends POST when onlyOnMalicious=false and verdict is Clean', async (t) => {
        const mock = makeRequestMock({ statusCode: 200 });
        t.mock.method(https, 'request', mock.requestFn);
        await notify('https://example.com/hook', { verdict: V.Clean }, { onlyOnMalicious: false });
        const body = JSON.parse(mock.getBody());
        assert.equal(body.verdict, 'Clean');
    });

    it('sends POST when verdict is Malicious', async (t) => {
        const mock = makeRequestMock({ statusCode: 200 });
        t.mock.method(https, 'request', mock.requestFn);
        await notify('https://example.com/hook', { file: '/tmp/bad.exe', verdict: V.Malicious, viruses: ['Eicar'] });
        const body = JSON.parse(mock.getBody());
        assert.equal(body.verdict, 'Malicious');
        assert.equal(body.file, '/tmp/bad.exe');
        assert.deepEqual(body.viruses, ['Eicar']);
        assert.ok(body.timestamp);
        assert.ok(body.hostname);
    });

    it('adds X-Pompelmi-Signature header when secret is provided', async (t) => {
        const mock = makeRequestMock({ statusCode: 200 });
        t.mock.method(https, 'request', mock.requestFn);
        await notify('https://example.com/hook', { verdict: V.Malicious }, { secret: 'mysecret' });
        const sig = mock.getHeaders()['X-Pompelmi-Signature'];
        assert.ok(sig, 'signature header should be present');
        assert.match(sig, /^sha256=[0-9a-f]{64}$/);
    });

    it('omits X-Pompelmi-Signature when no secret', async (t) => {
        const mock = makeRequestMock({ statusCode: 200 });
        t.mock.method(https, 'request', mock.requestFn);
        await notify('https://example.com/hook', { verdict: V.Malicious });
        assert.equal(mock.getHeaders()['X-Pompelmi-Signature'], undefined);
    });

    it('rejects when server returns non-2xx status', async (t) => {
        const mock = makeRequestMock({ statusCode: 500 });
        t.mock.method(https, 'request', mock.requestFn);
        await assert.rejects(
            () => notify('https://example.com/hook', { verdict: V.Malicious }),
            /HTTP 500/
        );
    });

    it('rejects on request error', async (t) => {
        const mock = makeRequestMock({ networkError: 'ECONNREFUSED' });
        t.mock.method(https, 'request', mock.requestFn);
        await assert.rejects(
            () => notify('https://example.com/hook', { verdict: V.Malicious }),
            /ECONNREFUSED/
        );
    });

    it('rejects for invalid URL', async () => {
        await assert.rejects(
            () => notify('not-a-url', { verdict: 'Malicious' }),
            /Invalid webhookUrl/
        );
    });

    it('notify is exported from index.js', () => {
        const { notify: n } = require('../src/index.js');
        assert.equal(typeof n, 'function');
    });
});

// ─── ScanEmitter ─────────────────────────────────────────────────────────────

describe('ScanEmitter', () => {
    const fs = require('fs');

    function loadEmitter(scanMock) {
        return load('../src/ScanEmitter.js', {
            '../src/ClamAVScanner.js': { scan: scanMock },
        });
    }

    it('createScanner returns an EventEmitter with scan/scanDirectory methods', () => {
        const { createScanner } = loadEmitter(() => Promise.resolve(Verdict.Clean));
        const scanner = createScanner();
        assert.equal(typeof scanner.scan,          'function');
        assert.equal(typeof scanner.scanDirectory, 'function');
        assert.equal(typeof scanner.on,            'function');
        assert.equal(typeof scanner.emit,          'function');
    });

    it('emits "clean" event for a clean file', async () => {
        const { createScanner } = loadEmitter(() => Promise.resolve(Verdict.Clean));
        const scanner = createScanner();

        const result = await new Promise((resolve) => {
            scanner.on('clean', (fp) => resolve(fp));
            scanner.scan('/fake/file.pdf');
        });

        assert.equal(result, '/fake/file.pdf');
    });

    it('emits "malicious" event with empty viruses array', async () => {
        const { createScanner } = loadEmitter(() => Promise.resolve(Verdict.Malicious));
        const scanner = createScanner();

        const { file, viruses } = await new Promise((resolve) => {
            scanner.on('malicious', (fp, v) => resolve({ file: fp, viruses: v }));
            scanner.scan('/fake/virus.exe');
        });

        assert.equal(file, '/fake/virus.exe');
        assert.deepEqual(viruses, []);
    });

    it('emits "scanError" event for Verdict.ScanError', async () => {
        const { createScanner } = loadEmitter(() => Promise.resolve(Verdict.ScanError));
        const scanner = createScanner();

        const result = await new Promise((resolve) => {
            scanner.on('scanError', (fp) => resolve(fp));
            scanner.scan('/fake/bad.bin');
        });

        assert.equal(result, '/fake/bad.bin');
    });

    it('emits "error" event when scan rejects', async () => {
        const { createScanner } = loadEmitter(() => Promise.reject(new Error('ENOENT')));
        const scanner = createScanner();

        const err = await new Promise((resolve) => {
            scanner.on('error', (e) => resolve(e));
            scanner.scan('/fake/file.pdf');
        });

        assert.match(err.message, /ENOENT/);
    });

    it('scanDirectory emits "error" for non-existent directory', async (t) => {
        t.mock.method(fs, 'existsSync', () => false);

        const { createScanner } = loadEmitter(() => Promise.resolve(Verdict.Clean));
        const scanner = createScanner();

        const err = await new Promise((resolve) => {
            scanner.on('error', (e) => resolve(e));
            scanner.scanDirectory('/nonexistent');
        });

        assert.match(err.message, /Directory not found/);
    });

    it('scanDirectory scans all files and emits events', async (t) => {
        t.mock.method(fs, 'existsSync', () => true);
        t.mock.method(fs, 'readdirSync', () => ['a.txt', 'b.exe']);
        t.mock.method(fs, 'statSync', () => ({ isDirectory: () => false }));

        let callCount = 0;
        const verdicts = [Verdict.Clean, Verdict.Malicious];
        const { createScanner } = loadEmitter(() => Promise.resolve(verdicts[callCount++]));
        const scanner = createScanner();

        const events = [];
        await new Promise((resolve) => {
            scanner.on('clean',     (fp) => { events.push({ type: 'clean',     fp }); if (events.length === 2) resolve(); });
            scanner.on('malicious', (fp) => { events.push({ type: 'malicious', fp }); if (events.length === 2) resolve(); });
            scanner.scanDirectory('/fake-dir');
        });

        assert.equal(events.length, 2);
        const types = events.map(e => e.type).sort();
        assert.deepEqual(types, ['clean', 'malicious']);
    });

    it('is exported from index.js', () => {
        const { createScanner } = require('../src/index.js');
        assert.equal(typeof createScanner, 'function');
    });
});

// ─── CLI — argument parsing ───────────────────────────────────────────────────

describe('CLI argument parsing', () => {
    function parseArgs(argv) {
        const args = argv.slice(2);
        const opts = {
            command: null, target: null,
            host: undefined, port: undefined, socket: undefined,
            timeout: 15000, retries: 0,
            json: false, quiet: false, delete: false, recursive: true,
        };
        let i = 0;
        while (i < args.length) {
            const a = args[i];
            if (a === 'scan' || a === 'watch' || a === 'version' || a === 'help') opts.command = a;
            else if (a === '--json') opts.json = true;
            else if (a === '--quiet' || a === '-q') opts.quiet = true;
            else if (a === '--recursive' || a === '-r') opts.recursive = true;
            else if (a === '--delete') opts.delete = true;
            else if (a === '--host') opts.host = args[++i];
            else if (a === '--port') opts.port = parseInt(args[++i], 10);
            else if (a === '--socket') opts.socket = args[++i];
            else if (a === '--timeout') opts.timeout = parseInt(args[++i], 10);
            else if (a === '--retries') opts.retries = parseInt(args[++i], 10);
            else if (!a.startsWith('-') && opts.command && !opts.target) opts.target = a;
            i++;
        }
        return opts;
    }

    it('parses scan command with target', () => {
        const opts = parseArgs(['node', 'pompelmi', 'scan', './uploads']);
        assert.equal(opts.command, 'scan');
        assert.equal(opts.target, './uploads');
        assert.equal(opts.json, false);
    });

    it('parses --json flag', () => {
        const opts = parseArgs(['node', 'pompelmi', 'scan', './uploads', '--json']);
        assert.equal(opts.json, true);
    });

    it('parses --quiet / -q flag', () => {
        const opts = parseArgs(['node', 'pompelmi', 'scan', './file', '-q']);
        assert.equal(opts.quiet, true);
    });

    it('parses --host and --port', () => {
        const opts = parseArgs(['node', 'pompelmi', 'scan', './f', '--host', '10.0.0.1', '--port', '3310']);
        assert.equal(opts.host, '10.0.0.1');
        assert.equal(opts.port, 3310);
    });

    it('parses --socket', () => {
        const opts = parseArgs(['node', 'pompelmi', 'scan', './f', '--socket', '/run/clamav/clamd.sock']);
        assert.equal(opts.socket, '/run/clamav/clamd.sock');
    });

    it('parses --timeout and --retries', () => {
        const opts = parseArgs(['node', 'pompelmi', 'scan', './f', '--timeout', '5000', '--retries', '3']);
        assert.equal(opts.timeout, 5000);
        assert.equal(opts.retries, 3);
    });

    it('parses watch command', () => {
        const opts = parseArgs(['node', 'pompelmi', 'watch', '/uploads']);
        assert.equal(opts.command, 'watch');
        assert.equal(opts.target, '/uploads');
    });

    it('parses version command', () => {
        const opts = parseArgs(['node', 'pompelmi', 'version']);
        assert.equal(opts.command, 'version');
    });

    it('parses help command', () => {
        const opts = parseArgs(['node', 'pompelmi', 'help']);
        assert.equal(opts.command, 'help');
    });

    it('defaults: timeout=15000 retries=0 json=false quiet=false', () => {
        const opts = parseArgs(['node', 'pompelmi', 'scan', './f']);
        assert.equal(opts.timeout, 15000);
        assert.equal(opts.retries, 0);
        assert.equal(opts.json, false);
        assert.equal(opts.quiet, false);
    });
});

// ─── CLI — progress bar ───────────────────────────────────────────────────────

describe('CLI progress bar', () => {
    function progressBar(done, total, infected) {
        const pct = total === 0 ? 0 : Math.floor((done / total) * 100);
        const filled = Math.floor(pct / 5);
        const empty = 20 - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        return `  Scanning... [${bar}] ${pct}% • ${done}/${total} files • ${infected} infected`;
    }

    it('shows 0% when done=0', () => {
        const s = progressBar(0, 10, 0);
        assert.ok(s.includes('0%'));
        assert.ok(s.includes('0/10'));
        assert.ok(s.includes('░'.repeat(20)));
    });

    it('shows 50% when done=5/10', () => {
        const s = progressBar(5, 10, 0);
        assert.ok(s.includes('50%'));
        assert.ok(s.includes('5/10'));
    });

    it('shows 100% when done=total', () => {
        const s = progressBar(10, 10, 0);
        assert.ok(s.includes('100%'));
        assert.ok(s.includes('█'.repeat(20)));
    });

    it('shows infected count', () => {
        const s = progressBar(3, 10, 2);
        assert.ok(s.includes('2 infected'));
    });

    it('handles total=0 without division error', () => {
        const s = progressBar(0, 0, 0);
        assert.ok(s.includes('0%'));
    });
});

// ─── CLI — JSON output format ─────────────────────────────────────────────────

describe('CLI JSON output format', () => {
    function buildJsonOutput(results, elapsed) {
        return {
            scanned: results.length,
            infected: results.filter(r => r.verdict === 'infected').length,
            errors: results.filter(r => r.verdict === 'error').length,
            time: Math.round(elapsed / 100) / 10,
            results: results.map(r => {
                const o = { file: r.file, verdict: r.verdict };
                if (r.viruses) o.viruses = r.viruses;
                return o;
            }),
        };
    }

    it('counts scanned/infected/errors correctly', () => {
        const results = [
            { file: '/a.pdf',    verdict: 'clean' },
            { file: '/b.exe',    verdict: 'infected', viruses: ['Win.Malware.Agent'] },
            { file: '/c.zip',    verdict: 'error' },
        ];
        const out = buildJsonOutput(results, 1200);
        assert.equal(out.scanned,  3);
        assert.equal(out.infected, 1);
        assert.equal(out.errors,   1);
    });

    it('rounds time to 1 decimal', () => {
        const out = buildJsonOutput([], 1234);
        assert.equal(out.time, 1.2);
    });

    it('includes viruses array for infected files', () => {
        const results = [
            { file: '/bad.exe', verdict: 'infected', viruses: ['Win.Malware.Agent-1234'] },
        ];
        const out = buildJsonOutput(results, 500);
        assert.deepEqual(out.results[0].viruses, ['Win.Malware.Agent-1234']);
    });

    it('omits viruses key for clean files', () => {
        const results = [{ file: '/good.pdf', verdict: 'clean' }];
        const out = buildJsonOutput(results, 100);
        assert.equal(out.results[0].viruses, undefined);
    });

    it('produces valid JSON when serialised', () => {
        const results = [
            { file: '/a.txt', verdict: 'clean' },
            { file: '/b.exe', verdict: 'infected', viruses: [] },
        ];
        const json = JSON.stringify(buildJsonOutput(results, 800));
        const parsed = JSON.parse(json);
        assert.equal(parsed.scanned, 2);
    });
});

// ─── generateDashboard ────────────────────────────────────────────────────────

describe('generateDashboard', () => {
    const { generateDashboard } = require('../src/Dashboard.js');

    const sampleRows = [
        { file: '/uploads/clean.pdf',    verdict: 'clean',    viruses: [] },
        { file: '/uploads/evil.exe',     verdict: 'infected', viruses: ['Win.Malware.Agent-1234'] },
        { file: '/uploads/unknown.bin',  verdict: 'error',    viruses: [] },
    ];

    it('returns a string', () => {
        const html = generateDashboard(sampleRows);
        assert.equal(typeof html, 'string');
    });

    it('output starts with <!DOCTYPE html>', () => {
        const html = generateDashboard(sampleRows);
        assert.ok(html.startsWith('<!DOCTYPE html>'), 'should start with DOCTYPE');
    });

    it('contains summary stat counts', () => {
        const html = generateDashboard(sampleRows, { elapsed: 1500 });
        assert.ok(html.includes('>3<'), 'total count');
        assert.ok(html.includes('>1<'), 'infected count appears');
    });

    it('shows infected banner when there are infected files', () => {
        const html = generateDashboard(sampleRows);
        assert.ok(html.includes('class="banner infected"'), 'infected banner present');
    });

    it('shows clean banner when all files are clean', () => {
        const cleanRows = [
            { file: '/a.txt', verdict: 'clean', viruses: [] },
            { file: '/b.pdf', verdict: 'clean', viruses: [] },
        ];
        const html = generateDashboard(cleanRows);
        assert.ok(html.includes('class="banner clean"'), 'clean banner present');
    });

    it('contains virus name in output', () => {
        const html = generateDashboard(sampleRows);
        assert.ok(html.includes('Win.Malware.Agent-1234'), 'virus name present');
    });

    it('contains file paths', () => {
        const html = generateDashboard(sampleRows);
        assert.ok(html.includes('/uploads/clean.pdf'));
        assert.ok(html.includes('/uploads/evil.exe'));
    });

    it('contains pompelmi footer', () => {
        const html = generateDashboard(sampleRows);
        assert.ok(html.includes('pompelmi.app'), 'footer link present');
    });

    it('contains dark mode media query', () => {
        const html = generateDashboard(sampleRows);
        assert.ok(html.includes('prefers-color-scheme'), 'dark mode CSS present');
    });

    it('contains print media query', () => {
        const html = generateDashboard(sampleRows);
        assert.ok(html.includes('@media print'), 'print CSS present');
    });

    it('accepts DirectoryScanResult shape', () => {
        const dirResult = {
            clean:     ['/a.txt', '/b.pdf'],
            malicious: ['/c.exe'],
            errors:    [],
        };
        const html = generateDashboard(dirResult);
        assert.ok(html.includes('/c.exe'), 'malicious file path present');
    });

    it('writes file when outputPath is provided', () => {
        const fs   = require('fs');
        const os   = require('os');
        const path = require('path');
        const outPath = path.join(os.tmpdir(), `pompelmi-test-${Date.now()}.html`);
        generateDashboard(sampleRows, { outputPath: outPath });
        assert.ok(fs.existsSync(outPath), 'HTML file written to disk');
        fs.unlinkSync(outPath);
    });

    it('escapes HTML in file paths', () => {
        const rows = [{ file: '<script>alert(1)</script>', verdict: 'clean', viruses: [] }];
        const html = generateDashboard(rows);
        assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script tag should be escaped');
        assert.ok(html.includes('&lt;script&gt;'), 'entities should appear instead');
    });
});

// ─── generateShareCard ────────────────────────────────────────────────────────

describe('generateShareCard', () => {
    const { generateShareCard } = require('../src/ShareCard.js');

    const cleanRows = [
        { file: '/a.pdf', verdict: 'clean',    viruses: [] },
        { file: '/b.txt', verdict: 'clean',    viruses: [] },
    ];
    const infectedRows = [
        { file: '/a.pdf', verdict: 'clean',    viruses: [] },
        { file: '/b.exe', verdict: 'infected', viruses: ['Win.Malware.X'] },
    ];

    it('returns a string', () => {
        const svg = generateShareCard(cleanRows);
        assert.equal(typeof svg, 'string');
    });

    it('starts with <svg', () => {
        const svg = generateShareCard(cleanRows);
        assert.ok(svg.trimStart().startsWith('<svg'), 'output should be an SVG element');
    });

    it('is valid XML (closes <svg> tag)', () => {
        const svg = generateShareCard(cleanRows);
        assert.ok(svg.includes('</svg>'), 'SVG must be closed');
    });

    it('shows All clean message for clean scans', () => {
        const svg = generateShareCard(cleanRows);
        assert.ok(svg.includes('All clean'), 'clean message present');
    });

    it('shows infected count for infected scans', () => {
        const svg = generateShareCard(infectedRows);
        assert.ok(svg.includes('infected'), 'infected text present');
        assert.ok(svg.includes('>1<'), 'infected count present');
    });

    it('contains pompelmi branding', () => {
        const svg = generateShareCard(cleanRows);
        assert.ok(svg.includes('pompelmi'), 'branding present');
    });

    it('contains date', () => {
        const svg = generateShareCard(cleanRows);
        const year = new Date().getFullYear().toString();
        assert.ok(svg.includes(year), 'current year present');
    });

    it('writes file when outputPath is provided', () => {
        const fs   = require('fs');
        const os   = require('os');
        const path = require('path');
        const outPath = path.join(os.tmpdir(), `pompelmi-test-${Date.now()}.svg`);
        generateShareCard(cleanRows, { outputPath: outPath });
        assert.ok(fs.existsSync(outPath), 'SVG file written to disk');
        fs.unlinkSync(outPath);
    });

    it('accepts DirectoryScanResult shape', () => {
        const dirResult = { clean: ['/a.txt'], malicious: ['/b.exe'], errors: [] };
        const svg = generateShareCard(dirResult);
        assert.ok(svg.includes('pompelmi'), 'SVG generated from DirectoryScanResult');
    });

    it('shows clean stats row with correct total', () => {
        const rows = [
            { file: '/a.txt', verdict: 'clean', viruses: [] },
            { file: '/b.txt', verdict: 'clean', viruses: [] },
            { file: '/c.txt', verdict: 'clean', viruses: [] },
        ];
        const svg = generateShareCard(rows);
        assert.ok(svg.includes('>3<') || svg.includes('>3 file'), 'total of 3 shown');
    });
});

// ─── Bun runtime detection ────────────────────────────────────────────────────

describe('Bun runtime detection', () => {
    // The isBun flag is module-level in each scanner file.
    // We verify the detection logic behaves correctly with/without the global.

    it('isBun is false when global Bun is undefined', () => {
        // In Node.js test environment, Bun global is not set.
        const hadBun = typeof globalThis.Bun !== 'undefined';
        assert.equal(hadBun, false, 'Bun global should not exist in Node.js');
        // The expression typeof Bun !== 'undefined' correctly evaluates to false.
        assert.equal(typeof globalThis.Bun !== 'undefined', false);
    });

    it('isBun logic correctly detects a mocked Bun global', () => {
        // Simulate what Bun adds to globalThis.
        const originalBun = globalThis.Bun;
        globalThis.Bun = { version: '1.0.0', file: () => {} };
        try {
            assert.equal(typeof globalThis.Bun !== 'undefined', true);
        } finally {
            if (originalBun === undefined) delete globalThis.Bun;
            else globalThis.Bun = originalBun;
        }
    });

    it('ClamdScanner exports scanViaClamd after Bun global mock', () => {
        // Inject a fake Bun global, reload the module, verify it still exports correctly.
        const originalBun = globalThis.Bun;
        globalThis.Bun = {
            version: '1.0.0',
            file: () => ({ bytes: () => Promise.resolve(new Uint8Array([1, 2, 3])) }),
        };
        let mod;
        const resolved = require.resolve('../src/ClamdScanner.js');
        const cached = require.cache[resolved];
        delete require.cache[resolved];
        try {
            mod = require('../src/ClamdScanner.js');
        } finally {
            delete require.cache[resolved];
            if (cached) require.cache[resolved] = cached;
            if (originalBun === undefined) delete globalThis.Bun;
            else globalThis.Bun = originalBun;
        }
        assert.equal(typeof mod.scanViaClamd, 'function');
    });
});

// ─── Scorecard ────────────────────────────────────────────────────────────────

describe('generateScorecard', () => {
    const { generateScorecard } = require('../src/Scorecard.js');

    it('returns grade A for a fully secured config', async () => {
        const scorecard = await generateScorecard({
            scanEnabled: true,
            mimeTypeAllowlist: ['image/jpeg', 'image/png'],
            fileSizeLimit: 10 * 1024 * 1024,
            diskWriteBeforeScan: false,
            scanErrorBehavior: 'reject',
            clamdUnavailableBehavior: 'reject',
            tlsEnabled: true,
        });
        assert.equal(scorecard.grade, 'A');
        assert.ok(scorecard.score >= 90, `score should be >= 90, got ${scorecard.score}`);
        assert.equal(scorecard.recommendations.length, 0);
    });

    it('returns grade F for an empty config', async () => {
        const scorecard = await generateScorecard({});
        assert.equal(scorecard.grade, 'F');
        assert.ok(scorecard.score === 0, `score should be 0, got ${scorecard.score}`);
        assert.ok(scorecard.recommendations.length > 0, 'should have recommendations');
    });

    it('returns grade B when TLS and scanErrorBehavior are missing', async () => {
        // Missing tlsEnabled (5 pts) + scanErrorBehavior (10 pts) = 85/100 → B
        const scorecard = await generateScorecard({
            scanEnabled: true,
            mimeTypeAllowlist: ['image/jpeg'],
            fileSizeLimit: 5 * 1024 * 1024,
            diskWriteBeforeScan: false,
            scanErrorBehavior: 'allow',
            clamdUnavailableBehavior: 'reject',
            tlsEnabled: false,
        });
        assert.equal(scorecard.grade, 'B');
        assert.equal(scorecard.recommendations.length, 2);
    });

    it('findings array has correct structure', async () => {
        const scorecard = await generateScorecard({ scanEnabled: true });
        assert.ok(Array.isArray(scorecard.findings));
        for (const f of scorecard.findings) {
            assert.ok(typeof f.check === 'string');
            assert.ok(f.status === 'pass' || f.status === 'fail');
            assert.ok(typeof f.weight === 'number' && f.weight > 0);
        }
    });

    it('marks scanEnabled as pass when true', async () => {
        const scorecard = await generateScorecard({ scanEnabled: true });
        const finding = scorecard.findings.find(f => f.check === 'Virus scanning enabled');
        assert.ok(finding, 'scanEnabled finding present');
        assert.equal(finding.status, 'pass');
    });

    it('marks diskWriteBeforeScan as fail when true', async () => {
        const scorecard = await generateScorecard({ diskWriteBeforeScan: true });
        const finding = scorecard.findings.find(f => f.check === 'No disk write before scan');
        assert.ok(finding, 'diskWriteBeforeScan finding present');
        assert.equal(finding.status, 'fail');
    });

    it('score is between 0 and 100', async () => {
        const scorecard = await generateScorecard({ scanEnabled: true, mimeTypeAllowlist: ['image/jpeg'] });
        assert.ok(scorecard.score >= 0 && scorecard.score <= 100);
    });
});

// ─── Quarantine ───────────────────────────────────────────────────────────────

describe('quarantineFile', () => {
    const { quarantineFile } = require('../src/Watcher.js');
    const os   = require('os');
    const path = require('path');
    const fs   = require('fs');

    it('moves the file to the quarantine directory', () => {
        const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'pompelmi-qtest-'));
        const srcFile  = path.join(tmpDir, 'infected.txt');
        const qDir     = path.join(tmpDir, 'quarantine');
        fs.writeFileSync(srcFile, 'eicar-payload');

        quarantineFile(srcFile, qDir, 'Eicar-Test-Signature');

        assert.ok(!fs.existsSync(srcFile), 'source file should be moved');
        const destFile = path.join(qDir, 'infected.txt.quarantined');
        assert.ok(fs.existsSync(destFile), 'quarantined file should exist');
        fs.rmSync(tmpDir, { recursive: true });
    });

    it('creates quarantine directory if it does not exist', () => {
        const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'pompelmi-qtest-'));
        const srcFile = path.join(tmpDir, 'bad.exe');
        const qDir    = path.join(tmpDir, 'deep', 'quarantine');
        fs.writeFileSync(srcFile, 'payload');

        quarantineFile(srcFile, qDir, 'Win.Test');

        assert.ok(fs.existsSync(qDir), 'quarantine dir should be created');
        fs.rmSync(tmpDir, { recursive: true });
    });

    it('writes a sidecar JSON with originalPath, virus, timestamp, sha256', () => {
        const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'pompelmi-qtest-'));
        const srcFile  = path.join(tmpDir, 'file.pdf');
        const qDir     = path.join(tmpDir, 'quarantine');
        const content  = Buffer.from('fake-pdf-content');
        fs.writeFileSync(srcFile, content);

        quarantineFile(srcFile, qDir, 'PDF.Malware');

        const sidecarPath = path.join(qDir, 'file.pdf.quarantined.json');
        assert.ok(fs.existsSync(sidecarPath), 'sidecar JSON should exist');

        const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
        assert.equal(sidecar.originalPath, srcFile);
        assert.equal(sidecar.virus, 'PDF.Malware');
        assert.ok(typeof sidecar.timestamp === 'string');
        assert.ok(typeof sidecar.sha256 === 'string' && sidecar.sha256.length === 64);

        fs.rmSync(tmpDir, { recursive: true });
    });
});

// ─── VS Code extension ────────────────────────────────────────────────────────

describe('VS Code extension', () => {
    it('exports activate and deactivate functions', () => {
        const ext = require('../packages/vscode/src/extension.js');
        assert.equal(typeof ext.activate,   'function');
        assert.equal(typeof ext.deactivate, 'function');
    });

    it('activate registers three commands via mock vscode API', () => {
        const registered = [];
        const mockVscode = {
            commands: {
                registerCommand: (id, _handler) => { registered.push(id); return { dispose: () => {} }; },
            },
            workspace: {
                getConfiguration: () => ({ get: (_k, d) => d }),
                workspaceFolders: [],
            },
            window: { showInformationMessage: () => {}, showErrorMessage: () => {}, withProgress: () => {} },
            ProgressLocation: { Notification: 15 },
        };

        // Patch require so extension.js gets mock vscode
        const Module = require('module');
        const orig   = Module._resolveFilename;
        Module._resolveFilename = function(req, ...rest) {
            if (req === 'vscode') return '__vscode_mock__';
            return orig.call(this, req, ...rest);
        };
        require.cache['__vscode_mock__'] = { id: '__vscode_mock__', filename: '__vscode_mock__', loaded: true, exports: mockVscode, children: [], paths: [] };

        // Force reload extension with mock in place
        const extPath = require.resolve('../packages/vscode/src/extension.js');
        delete require.cache[extPath];
        const { activate } = require('../packages/vscode/src/extension.js');

        const subscriptions = [];
        activate({ subscriptions });

        delete require.cache['__vscode_mock__'];
        Module._resolveFilename = orig;

        assert.ok(registered.includes('pompelmi.scanFile'),     'scanFile command registered');
        assert.ok(registered.includes('pompelmi.scanWorkspace'), 'scanWorkspace command registered');
        assert.ok(registered.includes('pompelmi.configure'),     'configure command registered');
    });

    it('deactivate does not throw', () => {
        const { deactivate } = require('../packages/vscode/src/extension.js');
        assert.doesNotThrow(() => deactivate());
    });
});

// ─── ScanCache ────────────────────────────────────────────────────────────────

describe('ScanCache', () => {
    const { Verdict } = require('../src/verdicts.js');

    function makeCache(overrides = {}) {
        // Load ScanCache with a mocked ClamAVScanner so no real clamd is required
        const targetResolved = require.resolve('../src/ScanCache.js');
        delete require.cache[targetResolved];

        const scannerResolved = require.resolve('../src/ClamAVScanner.js');
        const orig = require.cache[scannerResolved] && require.cache[scannerResolved].exports;
        if (require.cache[scannerResolved]) {
            require.cache[scannerResolved].exports = {
                scan:       overrides.scan       || (() => Promise.resolve(Verdict.Clean)),
                scanBuffer: overrides.scanBuffer || (() => Promise.resolve(Verdict.Clean)),
            };
        }

        const mod = require('../src/ScanCache.js');
        delete require.cache[targetResolved];

        if (orig && require.cache[scannerResolved]) {
            require.cache[scannerResolved].exports = orig;
        }

        return mod;
    }

    it('exports createCache function', () => {
        const { createCache } = makeCache();
        assert.equal(typeof createCache, 'function');
    });

    it('returns cache object with expected methods', () => {
        const { createCache } = makeCache();
        const cache = createCache();
        assert.equal(typeof cache.scan,        'function');
        assert.equal(typeof cache.scanBuffer,  'function');
        assert.equal(typeof cache.stats,       'function');
        assert.equal(typeof cache.clear,       'function');
        assert.equal(typeof cache.delete,      'function');
    });

    it('initial stats are all zeroes', () => {
        const { createCache } = makeCache();
        const cache = createCache();
        const s = cache.stats();
        assert.equal(s.hits,    0);
        assert.equal(s.misses,  0);
        assert.equal(s.size,    0);
        assert.equal(s.hitRate, 0);
    });

    it('records a miss on first scanBuffer call', async () => {
        let calls = 0;
        const { createCache } = makeCache({ scanBuffer: () => { calls++; return Promise.resolve(Verdict.Clean); } });
        const cache = createCache();
        await cache.scanBuffer(Buffer.from('hello'));
        assert.equal(cache.stats().misses, 1);
        assert.equal(cache.stats().hits,   0);
        assert.equal(calls, 1);
    });

    it('returns cached result on second call (cache hit)', async () => {
        let calls = 0;
        const { createCache } = makeCache({ scanBuffer: () => { calls++; return Promise.resolve(Verdict.Clean); } });
        const cache = createCache();
        const buf = Buffer.from('hello');
        await cache.scanBuffer(buf);
        const result = await cache.scanBuffer(buf);
        assert.equal(result, Verdict.Clean);
        assert.equal(calls, 1);   // underlying scan called only once
        assert.equal(cache.stats().hits, 1);
    });

    it('does not return expired entries', async () => {
        let calls = 0;
        const { createCache } = makeCache({ scanBuffer: () => { calls++; return Promise.resolve(Verdict.Clean); } });
        const cache = createCache({ ttl: 1 }); // 1 ms TTL
        const buf = Buffer.from('test');
        await cache.scanBuffer(buf);
        await new Promise(r => setTimeout(r, 10)); // wait for TTL to expire
        await cache.scanBuffer(buf);
        assert.equal(calls, 2); // scanned twice because entry expired
    });

    it('LRU eviction keeps cache within maxSize', async () => {
        const { createCache } = makeCache({ scanBuffer: (b) => Promise.resolve(Verdict.Clean) });
        const cache = createCache({ maxSize: 3 });
        for (let i = 0; i < 5; i++) {
            await cache.scanBuffer(Buffer.from(`file${i}`));
        }
        assert.ok(cache.stats().size <= 3);
    });

    it('clear() empties the cache and resets stats', async () => {
        const { createCache } = makeCache({ scanBuffer: () => Promise.resolve(Verdict.Clean) });
        const cache = createCache();
        await cache.scanBuffer(Buffer.from('data'));
        cache.clear();
        assert.equal(cache.stats().size,   0);
        assert.equal(cache.stats().hits,   0);
        assert.equal(cache.stats().misses, 0);
    });

    it('delete() removes a specific entry', async () => {
        const crypto = require('crypto');
        const { createCache } = makeCache({ scanBuffer: () => Promise.resolve(Verdict.Clean) });
        const cache = createCache();
        const buf = Buffer.from('specific');
        await cache.scanBuffer(buf);
        assert.equal(cache.stats().size, 1);
        const sha = crypto.createHash('sha256').update(buf).digest('hex');
        cache.delete(sha);
        assert.equal(cache.stats().size, 0);
    });

    it('hitRate is computed correctly', async () => {
        let calls = 0;
        const { createCache } = makeCache({ scanBuffer: () => { calls++; return Promise.resolve(Verdict.Clean); } });
        const cache = createCache();
        const buf = Buffer.from('rate');
        await cache.scanBuffer(buf); // miss
        await cache.scanBuffer(buf); // hit
        await cache.scanBuffer(buf); // hit
        const s = cache.stats();
        assert.equal(s.misses, 1);
        assert.equal(s.hits,   2);
        assert.ok(Math.abs(s.hitRate - 2/3) < 0.001);
    });
});

// ─── Policy ───────────────────────────────────────────────────────────────────

describe('Policy', () => {
    const { Verdict } = require('../src/verdicts.js');

    function loadPolicy(scanBufferImpl) {
        const targetResolved  = require.resolve('../src/Policy.js');
        delete require.cache[targetResolved];
        const scannerResolved = require.resolve('../src/ClamAVScanner.js');
        const orig = require.cache[scannerResolved] && require.cache[scannerResolved].exports;
        if (require.cache[scannerResolved]) {
            require.cache[scannerResolved].exports = {
                scan:       () => Promise.resolve(Verdict.Clean),
                scanBuffer: scanBufferImpl || (() => Promise.resolve(Verdict.Clean)),
            };
        }
        const mod = require('../src/Policy.js');
        delete require.cache[targetResolved];
        if (orig && require.cache[scannerResolved]) require.cache[scannerResolved].exports = orig;
        return mod;
    }

    it('exports createPolicy function', () => {
        const { createPolicy } = loadPolicy();
        assert.equal(typeof createPolicy, 'function');
    });

    it('allows a clean file with no rules', async () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy();
        const result = await policy.check(Buffer.from('data'), {});
        assert.equal(result.allowed, true);
        assert.equal(result.reason,  null);
    });

    it('rejects file exceeding maxSize', async () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy({ maxSize: 10 });
        const result = await policy.check(Buffer.alloc(20), { size: 20 });
        assert.equal(result.allowed, false);
        assert.equal(result.reason,  'file_too_large');
    });

    it('rejects disallowed MIME type', async () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy({ allowedMimeTypes: ['image/png'] });
        const result = await policy.check(Buffer.from('x'), { mimeType: 'application/exe' });
        assert.equal(result.allowed, false);
        assert.equal(result.reason,  'mime_not_allowed');
    });

    it('allows matching MIME type', async () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy({ allowedMimeTypes: ['image/png'] });
        const result = await policy.check(Buffer.from('x'), { mimeType: 'image/png' });
        assert.equal(result.allowed, true);
    });

    it('rejects disallowed extension', async () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy({ allowedExtensions: ['.pdf', '.jpg'] });
        const result = await policy.check(Buffer.from('x'), { filename: 'malware.exe' });
        assert.equal(result.allowed, false);
        assert.equal(result.reason,  'extension_not_allowed');
    });

    it('allows matching extension', async () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy({ allowedExtensions: ['.pdf'] });
        const result = await policy.check(Buffer.from('x'), { filename: 'doc.pdf' });
        assert.equal(result.allowed, true);
    });

    it('rejects virus-infected buffer when scan option provided', async () => {
        const { createPolicy } = loadPolicy(() => Promise.resolve(Verdict.Malicious));
        const policy = createPolicy({ scan: { host: 'localhost' } });
        const result = await policy.check(Buffer.from('virus'));
        assert.equal(result.allowed, false);
        assert.equal(result.reason,  'virus_detected');
    });

    it('allows clean buffer when scan option provided', async () => {
        const { createPolicy } = loadPolicy(() => Promise.resolve(Verdict.Clean));
        const policy = createPolicy({ scan: { host: 'localhost' } });
        const result = await policy.check(Buffer.from('clean'));
        assert.equal(result.allowed, true);
        assert.equal(result.reason,  null);
    });

    it('onScannerUnavailable:reject returns not-allowed when scan throws', async () => {
        const { createPolicy } = loadPolicy(() => Promise.reject(new Error('clamd down')));
        const policy = createPolicy({ scan: { host: 'localhost' }, onScannerUnavailable: 'reject' });
        const result = await policy.check(Buffer.from('x'));
        assert.equal(result.allowed, false);
        assert.equal(result.reason,  'scanner_unavailable');
    });

    it('onScannerUnavailable:allow returns allowed when scan throws', async () => {
        const { createPolicy } = loadPolicy(() => Promise.reject(new Error('clamd down')));
        const policy = createPolicy({ scan: { host: 'localhost' }, onScannerUnavailable: 'allow' });
        const result = await policy.check(Buffer.from('x'));
        assert.equal(result.allowed, true);
    });

    it('onScannerUnavailable:throw re-throws when scan throws', async () => {
        const { createPolicy } = loadPolicy(() => Promise.reject(new Error('clamd down')));
        const policy = createPolicy({ scan: { host: 'localhost' }, onScannerUnavailable: 'throw' });
        await assert.rejects(() => policy.check(Buffer.from('x')), /clamd down/);
    });

    it('returns middleware function', () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy();
        assert.equal(typeof policy.middleware, 'function');
        assert.equal(typeof policy.middleware(), 'function');
    });

    it('returns nestGuard object', () => {
        const { createPolicy } = loadPolicy();
        const policy = createPolicy();
        const guard = policy.nestGuard();
        assert.equal(typeof guard.canActivate, 'function');
    });
});

// ─── MultiEngine ─────────────────────────────────────────────────────────────

describe('MultiEngine', () => {
    const { Verdict } = require('../src/verdicts.js');

    function loadMultiEngine(overrides = {}) {
        const targetResolved  = require.resolve('../src/MultiEngine.js');
        delete require.cache[targetResolved];
        const scannerResolved = require.resolve('../src/ClamAVScanner.js');
        const orig = require.cache[scannerResolved] && require.cache[scannerResolved].exports;
        if (require.cache[scannerResolved]) {
            require.cache[scannerResolved].exports = {
                scan:       overrides.scan       || (() => Promise.resolve(Verdict.Clean)),
                scanBuffer: overrides.scanBuffer || (() => Promise.resolve(Verdict.Clean)),
            };
        }
        const mod = require('../src/MultiEngine.js');
        delete require.cache[targetResolved];
        if (orig && require.cache[scannerResolved]) require.cache[scannerResolved].exports = orig;
        return mod;
    }

    it('exports createMultiEngine function', () => {
        const { createMultiEngine } = loadMultiEngine();
        assert.equal(typeof createMultiEngine, 'function');
    });

    it('returns scan and scanBuffer methods', () => {
        const { createMultiEngine } = loadMultiEngine();
        const scanner = createMultiEngine({ engines: [] });
        assert.equal(typeof scanner.scan,       'function');
        assert.equal(typeof scanner.scanBuffer, 'function');
    });

    it('consensus:any — Malicious if any engine flags it', async () => {
        const { createMultiEngine } = loadMultiEngine({ scanBuffer: () => Promise.resolve(Verdict.Malicious) });
        const scanner = createMultiEngine({
            engines: [{ type: 'clamav' }],
            consensus: 'any',
        });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.equal(result.verdict, Verdict.Malicious);
        assert.equal(result.consensus, 'any');
    });

    it('consensus:any — Clean if no engine flags it', async () => {
        const { createMultiEngine } = loadMultiEngine({ scanBuffer: () => Promise.resolve(Verdict.Clean) });
        const scanner = createMultiEngine({
            engines: [{ type: 'clamav' }],
            consensus: 'any',
        });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.equal(result.verdict, Verdict.Clean);
    });

    it('consensus:all — Clean if only one of two flags it', async () => {
        let call = 0;
        const { createMultiEngine } = loadMultiEngine({
            scanBuffer: () => {
                call++;
                return Promise.resolve(call === 1 ? Verdict.Malicious : Verdict.Clean);
            },
        });
        const scanner = createMultiEngine({
            engines: [{ type: 'clamav' }, { type: 'clamav' }],
            consensus: 'all',
        });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.equal(result.verdict, Verdict.Clean);
    });

    it('consensus:all — Malicious if all engines flag it', async () => {
        const { createMultiEngine } = loadMultiEngine({ scanBuffer: () => Promise.resolve(Verdict.Malicious) });
        const scanner = createMultiEngine({
            engines: [{ type: 'clamav' }, { type: 'clamav' }],
            consensus: 'all',
        });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.equal(result.verdict, Verdict.Malicious);
    });

    it('consensus:majority — Malicious when majority flag it', async () => {
        let call = 0;
        const { createMultiEngine } = loadMultiEngine({
            scanBuffer: () => {
                call++;
                return Promise.resolve(call <= 2 ? Verdict.Malicious : Verdict.Clean);
            },
        });
        const scanner = createMultiEngine({
            engines: [{ type: 'clamav' }, { type: 'clamav' }, { type: 'clamav' }],
            consensus: 'majority',
        });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.equal(result.verdict, Verdict.Malicious);
    });

    it('engine failure returns ScanError in per-engine results', async () => {
        const { createMultiEngine } = loadMultiEngine({
            scanBuffer: () => Promise.reject(new Error('clamd down')),
        });
        const scanner = createMultiEngine({
            engines: [{ type: 'clamav' }],
            consensus: 'any',
        });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.equal(result.engines[0].verdict, Verdict.ScanError);
    });

    it('includes per-engine breakdown in result', async () => {
        const { createMultiEngine } = loadMultiEngine({ scanBuffer: () => Promise.resolve(Verdict.Clean) });
        const scanner = createMultiEngine({ engines: [{ type: 'clamav' }] });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.ok(Array.isArray(result.engines));
        assert.equal(result.engines.length, 1);
        assert.equal(result.engines[0].name, 'clamav');
    });

    it('virustotal engine without apiKey returns ScanError', async () => {
        const { createMultiEngine } = loadMultiEngine();
        const scanner = createMultiEngine({
            engines: [{ type: 'virustotal' }], // no apiKey
        });
        const result = await scanner.scanBuffer(Buffer.from('x'));
        assert.equal(result.engines[0].verdict, Verdict.ScanError);
        assert.match(result.engines[0].error, /no apiKey/);
    });

    it('rejects if buffer is not a Buffer', async () => {
        const { createMultiEngine } = loadMultiEngine();
        const scanner = createMultiEngine({ engines: [] });
        await assert.rejects(() => scanner.scanBuffer('not-a-buffer'), /buffer must be a Buffer/);
    });
});

// ─── scanDirectory.stream ─────────────────────────────────────────────────────

describe('scanDirectory.stream', () => {
    const fs = require('fs');

    function dirScanner(spawnMock) {
        return load('../src/ClamAVScanner.js', { '../src/spawn.js': { nativeSpawn: spawnMock } });
    }

    it('scanDirectory.stream is a function', () => {
        const { scanDirectory } = dirScanner(spawnClose(0));
        assert.equal(typeof scanDirectory.stream, 'function');
    });

    it('throws if dirPath is not a string', async () => {
        const { scanDirectory } = dirScanner(spawnClose(0));
        const gen = scanDirectory.stream(42);
        await assert.rejects(() => gen.next(), /dirPath must be a string/);
    });

    it('throws if directory does not exist', async (t) => {
        t.mock.method(fs, 'existsSync', () => false);
        const { scanDirectory } = dirScanner(spawnClose(0));
        const gen = scanDirectory.stream('/no-such-dir');
        await assert.rejects(() => gen.next(), /Directory not found/);
    });

    it('emits progress, result, and complete events', async (t) => {
        t.mock.method(fs, 'existsSync',  () => true);
        t.mock.method(fs, 'readdirSync', () => ['a.txt', 'b.txt']);
        t.mock.method(fs, 'statSync',    () => ({ isFile: () => true }));

        const { scanDirectory } = dirScanner(spawnClose(0));
        const events = [];
        for await (const event of scanDirectory.stream('/fake-dir')) {
            events.push(event);
        }

        const types = events.map(e => e.type);
        assert.ok(types.includes('progress'));
        assert.ok(types.includes('result'));
        assert.ok(types.includes('complete'));

        const complete = events.find(e => e.type === 'complete');
        assert.ok(complete && complete.summary);
        assert.ok(Array.isArray(complete.summary.clean));
    });

    it('progress events have correct scanned/total counts', async (t) => {
        t.mock.method(fs, 'existsSync',  () => true);
        t.mock.method(fs, 'readdirSync', () => ['a.txt', 'b.txt', 'c.txt']);
        t.mock.method(fs, 'statSync',    () => ({ isFile: () => true }));

        const { scanDirectory } = dirScanner(spawnClose(0));
        const progressEvents = [];
        for await (const event of scanDirectory.stream('/fake-dir')) {
            if (event.type === 'progress') progressEvents.push(event);
        }

        assert.equal(progressEvents.length, 3);
        assert.equal(progressEvents[0].scanned, 1);
        assert.equal(progressEvents[0].total,   3);
        assert.equal(progressEvents[2].scanned, 3);
    });

    it('result events carry correct verdicts', async (t) => {
        let call = 0;
        const codes = [0, 1];
        const spawnSeq = () => {
            const code = codes[call++ % codes.length];
            const child = new EventEmitter();
            process.nextTick(() => child.emit('close', code, null));
            return child;
        };

        t.mock.method(fs, 'existsSync',  () => true);
        t.mock.method(fs, 'readdirSync', () => ['clean.txt', 'virus.txt']);
        t.mock.method(fs, 'statSync',    () => ({ isFile: () => true }));

        const { scanDirectory, Verdict: V } = dirScanner(spawnSeq);
        const resultEvents = [];
        for await (const event of scanDirectory.stream('/fake-dir')) {
            if (event.type === 'result') resultEvents.push(event);
        }

        assert.equal(resultEvents[0].verdict, Verdict.Clean);
        assert.equal(resultEvents[1].verdict, Verdict.Malicious);
    });
});
