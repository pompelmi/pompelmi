'use strict';

const net         = require('net');
const { Verdict } = require('./verdicts.js');

const CLAMD_INSTREAM = Buffer.from('zINSTREAM\0');
const CHUNK_SIZE     = 64 * 1024;

function parseClamdResponse(raw) {
    const text = raw.toString('utf8').trim();
    if (text === 'stream: OK')   return Verdict.Clean;
    if (text.endsWith(' FOUND')) return Verdict.Malicious;
    return Verdict.ScanError;
}

/**
 * Scan an in-memory Buffer by streaming it to a running clamd instance over TCP.
 * No data is written to disk.
 *
 * @param {Buffer} buffer
 * @param {object} [options]
 * @param {string} [options.host='127.0.0.1']
 * @param {number} [options.port=3310]
 * @param {number} [options.timeout=15000]
 * @returns {Promise<symbol>}
 */
function scanBufferViaClamd(buffer, { host = '127.0.0.1', port = 3310, timeout = 15_000 } = {}) {
    return new Promise((resolve, reject) => {
        const socket  = net.createConnection({ host, port });
        const chunks  = [];
        let   settled = false;

        function settle(fn, value) {
            if (settled) return;
            settled = true;
            socket.destroy();
            fn(value);
        }

        socket.setTimeout(timeout);
        socket.on('timeout', () =>
            settle(reject, new Error(`clamd connection timed out after ${timeout}ms`))
        );
        socket.on('error', (err) => settle(reject, err));
        socket.on('data',  (chunk) => chunks.push(chunk));
        socket.on('end',   () => settle(resolve, parseClamdResponse(Buffer.concat(chunks))));

        socket.on('connect', () => {
            socket.write(CLAMD_INSTREAM);

            let offset = 0;
            while (offset < buffer.length) {
                const chunk  = buffer.slice(offset, offset + CHUNK_SIZE);
                const header = Buffer.allocUnsafe(4);
                header.writeUInt32BE(chunk.length, 0);
                socket.write(header);
                socket.write(chunk);
                offset += chunk.length;
            }

            socket.write(Buffer.alloc(4)); // terminating zero-length chunk
            socket.end();
        });
    });
}

module.exports = { scanBufferViaClamd };
