'use strict';

const net         = require('net');
const { Verdict } = require('./verdicts.js');

const CLAMD_INSTREAM = Buffer.from('zINSTREAM\0');

function parseClamdResponse(raw) {
    const text = raw.toString('utf8').trim();
    if (text === 'stream: OK')   return Verdict.Clean;
    if (text.endsWith(' FOUND')) return Verdict.Malicious;
    return Verdict.ScanError;
}

/**
 * Scan a Readable stream by piping it to a running clamd instance over TCP.
 * No data is written to disk.
 *
 * @param {import('stream').Readable} stream
 * @param {object} [options]
 * @param {string} [options.host='127.0.0.1']
 * @param {number} [options.port=3310]
 * @param {number} [options.timeout=15000]
 * @returns {Promise<symbol>}
 */
function scanStreamViaClamd(stream, { host = '127.0.0.1', port = 3310, timeout = 15_000 } = {}) {
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

            stream.on('error', (err) => settle(reject, err));

            stream.on('data', (chunk) => {
                const header = Buffer.allocUnsafe(4);
                header.writeUInt32BE(chunk.length, 0);
                socket.write(header);
                socket.write(chunk);
            });

            stream.on('end', () => {
                socket.write(Buffer.alloc(4)); // terminating zero-length chunk
                socket.end();
            });
        });
    });
}

module.exports = { scanStreamViaClamd };
