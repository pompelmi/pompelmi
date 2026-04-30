'use strict';

const net            = require('net');
const fs             = require('fs');
const { Verdict }    = require('./verdicts.js');

// ClamAV INSTREAM protocol:
//   1. Send "zINSTREAM\0"
//   2. Send N chunks, each prefixed with a 4-byte big-endian length
//   3. Terminate with four zero bytes
//   4. Read response line: "stream: OK", "stream: <name> FOUND", or an error
const CLAMD_INSTREAM = Buffer.from('zINSTREAM\0');
const CHUNK_SIZE     = 64 * 1024;  // 64 KB — well within clamd's default StreamMaxLength

function parseClamdResponse(raw) {
    const text = raw.toString('utf8').trim();
    if (text === 'stream: OK')    return Verdict.Clean;
    if (text.endsWith(' FOUND'))  return Verdict.Malicious;
    return Verdict.ScanError;
}

/**
 * Scan a file by streaming it to a running clamd instance over TCP or a UNIX socket.
 *
 * @param {string} filePath   - Absolute or relative path to the file to scan.
 * @param {object} [options]
 * @param {string} [options.socket]          - Path to a clamd UNIX domain socket (e.g. '/run/clamav/clamd.sock').
 *                                             When set, takes precedence over host/port.
 * @param {string} [options.host='127.0.0.1']
 * @param {number} [options.port=3310]
 * @param {number} [options.timeout=15000]  - Socket idle timeout in ms.
 * @returns {Promise<'Clean'|'Malicious'|'ScanError'>}
 */
function scanViaClamd(filePath, { host = '127.0.0.1', port = 3310, socket: socketPath, timeout = 15_000 } = {}) {
    return new Promise((resolve, reject) => {
        if (typeof filePath !== 'string') {
            return reject(new Error('filePath must be a string'));
        }
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }

        const connOpts   = socketPath ? { path: socketPath } : { host, port };
        const conn       = net.createConnection(connOpts);
        const chunks     = [];
        let   settled    = false;

        function settle(fn, value) {
            if (settled) return;
            settled = true;
            conn.destroy();
            fn(value);
        }

        conn.setTimeout(timeout);
        conn.on('timeout', () =>
            settle(reject, new Error(`clamd connection timed out after ${timeout}ms`))
        );
        conn.on('error', (err) => settle(reject, err));
        conn.on('data',  (chunk) => chunks.push(chunk));
        conn.on('end',   () => settle(resolve, parseClamdResponse(Buffer.concat(chunks))));

        conn.on('connect', () => {
            conn.write(CLAMD_INSTREAM);

            const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

            fileStream.on('error', (err) => settle(reject, err));

            fileStream.on('data', (chunk) => {
                const header = Buffer.allocUnsafe(4);
                header.writeUInt32BE(chunk.length, 0);
                conn.write(header);
                conn.write(chunk);
            });

            fileStream.on('end', () => {
                conn.write(Buffer.alloc(4)); // terminating zero-length chunk
                conn.end();
            });
        });
    });
}

module.exports = { scanViaClamd };
