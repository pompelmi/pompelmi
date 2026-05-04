'use strict';

const net  = require('net');
const fs   = require('fs');
const { Verdict } = require('./verdicts.js');

const CLAMD_INSTREAM = Buffer.from('zINSTREAM\0');
const CHUNK_SIZE     = 64 * 1024;

function parseClamdResponse(raw) {
    const text = raw.toString('utf8').replace(/\0/g, '').trim();
    if (text === 'stream: OK')   return Verdict.Clean;
    if (text.endsWith(' FOUND')) return Verdict.Malicious;
    return Verdict.ScanError;
}

// One INSTREAM scan on a persistent socket. Does NOT call sock.end() — connection stays open.
// Detects end-of-response via the null terminator sent by clamd (z-prefix protocol).
function scanOnSocket(sock, sendPayload) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let   done   = false;

        function settle(fn, val) {
            if (done) return;
            done = true;
            sock.removeListener('data',  onData);
            sock.removeListener('end',   onEnd);
            sock.removeListener('error', onError);
            fn(val);
        }

        function onData(chunk) {
            chunks.push(chunk);
            const buf = Buffer.concat(chunks);
            if (buf.includes(0)) settle(resolve, parseClamdResponse(buf));
        }
        function onEnd()      { settle(resolve, parseClamdResponse(Buffer.concat(chunks))); }
        function onError(err) { settle(reject, err); }

        sock.on('data',  onData);
        sock.on('end',   onEnd);
        sock.on('error', onError);

        sock.write(CLAMD_INSTREAM);
        sendPayload(sock, (err) => settle(reject, err));
    });
}

function openConnection(connOpts, timeout) {
    return new Promise((resolve, reject) => {
        const sock = net.createConnection(connOpts);
        let   done = false;
        function settle(err) {
            if (done) return;
            done = true;
            if (err) { sock.destroy(); reject(err); }
            else resolve(sock);
        }
        sock.setTimeout(timeout);
        sock.on('timeout', () => settle(new Error(`clamd connect timed out after ${timeout}ms`)));
        sock.once('error',   (err) => settle(err));
        sock.once('connect', () => { sock.setTimeout(0); settle(null); });
    });
}

/**
 * Create a pool of `size` persistent clamd connections.
 *
 * @param {object} [options]
 * @param {string} [options.host='127.0.0.1']
 * @param {number} [options.port=3310]
 * @param {string} [options.socket]   - UNIX socket path (takes precedence over host/port)
 * @param {number} [options.size=5]   - Maximum number of concurrent connections
 * @param {number} [options.timeout=15000]
 * @returns {{ scan, scanBuffer, scanStream, destroy }}
 */
function createPool({ host = '127.0.0.1', port = 3310, socket: socketPath, size = 5, timeout = 15_000 } = {}) {
    const connOpts = socketPath ? { path: socketPath } : { host, port };
    const slots    = Array.from({ length: size }, () => ({ socket: null, busy: false }));
    const queue    = [];

    function dequeue(slot) {
        slot.busy = false;
        if (queue.length > 0) {
            const { fn, resolve, reject } = queue.shift();
            runOnSlot(slot, fn).then(resolve, reject);
        }
    }

    async function ensureConnected(slot) {
        if (slot.socket && !slot.socket.destroyed && slot.socket.readyState === 'open') return;
        if (slot.socket && !slot.socket.destroyed) slot.socket.destroy();
        slot.socket = await openConnection(connOpts, timeout);
        const sock = slot.socket;
        sock.on('error', () => { if (slot.socket === sock) slot.socket = null; });
    }

    async function runOnSlot(slot, fn) {
        slot.busy = true;
        try {
            await ensureConnected(slot);
            return await fn(slot.socket);
        } catch (err) {
            if (slot.socket) { slot.socket.destroy(); slot.socket = null; }
            throw err;
        } finally {
            dequeue(slot);
        }
    }

    function enqueue(fn) {
        return new Promise((resolve, reject) => {
            const free = slots.find(s => !s.busy);
            if (free) {
                runOnSlot(free, fn).then(resolve, reject);
            } else {
                queue.push({ fn, resolve, reject });
            }
        });
    }

    return {
        scan(filePath) {
            if (typeof filePath !== 'string')
                return Promise.reject(new Error('filePath must be a string'));
            if (!fs.existsSync(filePath))
                return Promise.reject(new Error(`File not found: ${filePath}`));
            return enqueue((sock) => scanOnSocket(sock, (s, onErr) => {
                const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
                stream.on('error', onErr);
                stream.on('data', (chunk) => {
                    const hdr = Buffer.allocUnsafe(4);
                    hdr.writeUInt32BE(chunk.length, 0);
                    s.write(hdr);
                    s.write(chunk);
                });
                stream.on('end', () => s.write(Buffer.alloc(4)));
            }));
        },

        scanBuffer(buffer) {
            return enqueue((sock) => scanOnSocket(sock, (s) => {
                let offset = 0;
                while (offset < buffer.length) {
                    const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
                    const hdr   = Buffer.allocUnsafe(4);
                    hdr.writeUInt32BE(chunk.length, 0);
                    s.write(hdr);
                    s.write(chunk);
                    offset += chunk.length;
                }
                s.write(Buffer.alloc(4));
            }));
        },

        scanStream(stream) {
            return enqueue((sock) => scanOnSocket(sock, (s, onErr) => {
                stream.on('error', onErr);
                stream.on('data', (chunk) => {
                    const hdr = Buffer.allocUnsafe(4);
                    hdr.writeUInt32BE(chunk.length, 0);
                    s.write(hdr);
                    s.write(chunk);
                });
                stream.on('end', () => s.write(Buffer.alloc(4)));
            }));
        },

        destroy() {
            for (const slot of slots) {
                if (slot.socket) { slot.socket.destroy(); slot.socket = null; }
                slot.busy = false;
            }
            while (queue.length > 0) {
                const { reject } = queue.shift();
                reject(new Error('Pool destroyed'));
            }
        },
    };
}

module.exports = { createPool };
