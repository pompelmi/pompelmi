const { nativeSpawn: spawn }   = require('./spawn.js');
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { Readable }               = require('stream');
const { SCAN_RESULTS }           = require('./config.js');
const { Verdict }                = require('./verdicts.js');
const { scanViaClamd }           = require('./ClamdScanner.js');
const { scanBufferViaClamd }     = require('./BufferScanner.js');
const { scanStreamViaClamd }     = require('./StreamScanner.js');

const MESSAGES = {
    FILE_NOT_FOUND:        (filePath) => `File not found: ${filePath}`,
    UNEXPECTED_EXIT_CODE:  (code)     => `Unexpected exit code: ${code}`,
    PROCESS_KILLED:        (signal)   => `Process killed by signal: ${signal}`,
};

function scan(filePath, options = {}) {
    // When a host, port, or socket path is provided, delegate to the clamd path.
    if (options.host !== undefined || options.port !== undefined || options.socket !== undefined) {
        return scanViaClamd(filePath, options);
    }

    return new Promise((resolve, reject) => {
        if (typeof filePath !== 'string') {
            return reject(new Error('filePath must be a string'));
        }
        if (!fs.existsSync(filePath)) {
            return reject(new Error(MESSAGES.FILE_NOT_FOUND(filePath)));
        }

        const child = spawn('clamscan', ['--no-summary', filePath]);
        child.on('error', (err) => reject(err));
        child.on('close', (code, signal) => {
            if (code === null) return reject(new Error(MESSAGES.PROCESS_KILLED(signal)));
            const result = SCAN_RESULTS[code];
            if (!result) return reject(new Error(MESSAGES.UNEXPECTED_EXIT_CODE(code)));
            resolve(result);
        });
    });
}

async function scanBuffer(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error('buffer must be a Buffer');
    }
    if (buffer.length === 0) {
        throw new Error('buffer is empty');
    }

    if (options.host !== undefined || options.port !== undefined || options.socket !== undefined) {
        return scanBufferViaClamd(buffer, options);
    }

    const tmpPath = path.join(
        os.tmpdir(),
        `pompelmi-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    fs.writeFileSync(tmpPath, buffer);
    try {
        return await scan(tmpPath);
    } finally {
        fs.unlink(tmpPath, () => {});
    }
}

async function scanStream(stream, options = {}) {
    if (!(stream instanceof Readable)) {
        throw new Error('stream must be a Readable');
    }

    if (options.host !== undefined || options.port !== undefined || options.socket !== undefined) {
        return scanStreamViaClamd(stream, options);
    }

    const tmpPath = path.join(
        os.tmpdir(),
        `pompelmi-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    await new Promise((resolve, reject) => {
        let settled = false;
        function settle(err) {
            if (settled) return;
            settled = true;
            if (err) reject(err);
            else resolve();
        }
        const writable = fs.createWriteStream(tmpPath);
        stream.on('error', settle);
        writable.on('error', settle);
        writable.on('finish', () => settle(null));
        stream.pipe(writable);
    });

    try {
        return await scan(tmpPath);
    } finally {
        fs.unlink(tmpPath, () => {});
    }
}

async function scanDirectory(dirPath, options = {}) {
    if (typeof dirPath !== 'string') {
        throw new Error('dirPath must be a string');
    }
    if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
    }

    const entries = fs.readdirSync(dirPath, { recursive: true });
    const files = entries
        .map(entry => path.join(dirPath, entry))
        .filter(fullPath => fs.statSync(fullPath).isFile());

    const results = await Promise.all(
        files.map(async (filePath) => {
            try {
                return { filePath, verdict: await scan(filePath, options) };
            } catch {
                return { filePath, verdict: null };
            }
        })
    );

    const clean = [];
    const malicious = [];
    const errors = [];

    for (const { filePath, verdict } of results) {
        if (verdict === Verdict.Clean)     clean.push(filePath);
        else if (verdict === Verdict.Malicious) malicious.push(filePath);
        else                               errors.push(filePath);
    }

    return { clean, malicious, errors };
}

async function* streamDirectory(dirPath, options = {}) {
    if (typeof dirPath !== 'string') {
        throw new Error('dirPath must be a string');
    }
    if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
    }

    const entries = fs.readdirSync(dirPath, { recursive: true });
    const files = entries
        .map(entry => path.join(dirPath, entry))
        .filter(fullPath => fs.statSync(fullPath).isFile());

    const total   = files.length;
    let   scanned = 0;
    const summary = { clean: [], malicious: [], errors: [] };

    for (const filePath of files) {
        let verdict;
        try {
            verdict = await scan(filePath, options);
        } catch {
            verdict = null;
        }

        scanned++;

        if (verdict === Verdict.Clean)          summary.clean.push(filePath);
        else if (verdict === Verdict.Malicious) summary.malicious.push(filePath);
        else                                    summary.errors.push(filePath);

        yield { type: 'progress', scanned, total, file: filePath };
        yield { type: 'result',   file: filePath, verdict };
    }

    yield { type: 'complete', summary };
}

scanDirectory.stream = streamDirectory;

module.exports = { scan, scanBuffer, scanStream, scanDirectory };