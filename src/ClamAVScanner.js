const { nativeSpawn: spawn } = require('./spawn.js');
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { SCAN_RESULTS }       = require('./config.js');
const { scanViaClamd }       = require('./ClamdScanner.js');
const { scanBufferViaClamd } = require('./BufferScanner.js');

const MESSAGES = {
    FILE_NOT_FOUND:        (filePath) => `File not found: ${filePath}`,
    UNEXPECTED_EXIT_CODE:  (code)     => `Unexpected exit code: ${code}`,
    PROCESS_KILLED:        (signal)   => `Process killed by signal: ${signal}`,
};

function scan(filePath, options = {}) {
    // When a host or port is provided, delegate to the clamd TCP path.
    if (options.host !== undefined || options.port !== undefined) {
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

    if (options.host !== undefined || options.port !== undefined) {
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

module.exports = { scan, scanBuffer };