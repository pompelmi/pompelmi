'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const { scan, scanBuffer } = require('./ClamAVScanner.js');

function sha256ofBuffer(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256ofFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

function createCache(options = {}) {
    const ttl      = options.ttl      ?? 3600000;
    const maxSize  = options.maxSize  ?? 1000;
    const storage  = options.storage  || 'memory';
    const filePath = options.filePath || './.pompelmi-cache.json';

    // LRU map: key = sha256, value = { verdict, expiresAt }
    // Insertion order tracks LRU; on hit we re-insert to move to back.
    let store = new Map();
    let hits   = 0;
    let misses = 0;
    let writeTimer = null;

    // ── file storage bootstrap ──────────────────────────────────────────────────
    if (storage === 'file') {
        try {
            const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const now = Date.now();
            for (const [k, v] of Object.entries(raw)) {
                if (v.expiresAt > now) store.set(k, v);
            }
        } catch {
            // file absent or invalid — start with empty cache
        }
    }

    function _persist() {
        if (storage !== 'file') return;
        if (writeTimer) return;
        writeTimer = setTimeout(() => {
            writeTimer = null;
            const obj = {};
            for (const [k, v] of store) obj[k] = v;
            const tmp = filePath + '.tmp';
            try {
                fs.writeFileSync(tmp, JSON.stringify(obj));
                fs.renameSync(tmp, filePath);
            } catch { /* non-fatal */ }
        }, 500);
    }

    function _get(sha) {
        const entry = store.get(sha);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            store.delete(sha);
            return null;
        }
        // Move to end (LRU: most-recently-used = last)
        store.delete(sha);
        store.set(sha, entry);
        return entry.verdict;
    }

    function _set(sha, verdict) {
        if (store.has(sha)) store.delete(sha); // re-insert at end
        if (store.size >= maxSize) {
            // evict oldest (first) entry
            store.delete(store.keys().next().value);
        }
        store.set(sha, { verdict, expiresAt: Date.now() + ttl });
        _persist();
    }

    async function scanWithCache(filePath, opts = {}) {
        const sha = await sha256ofFile(filePath);
        const cached = _get(sha);
        if (cached !== null) { hits++; return cached; }
        misses++;
        const verdict = await scan(filePath, opts);
        _set(sha, verdict);
        return verdict;
    }

    async function scanBufferWithCache(buffer, opts = {}) {
        const sha = sha256ofBuffer(buffer);
        const cached = _get(sha);
        if (cached !== null) { hits++; return cached; }
        misses++;
        const verdict = await scanBuffer(buffer, opts);
        _set(sha, verdict);
        return verdict;
    }

    function stats() {
        const total = hits + misses;
        return {
            hits,
            misses,
            size: store.size,
            hitRate: total === 0 ? 0 : hits / total,
        };
    }

    function clear() {
        store = new Map();
        hits = 0;
        misses = 0;
        _persist();
    }

    function del(sha) {
        store.delete(sha);
        _persist();
    }

    return {
        scan:        scanWithCache,
        scanBuffer:  scanBufferWithCache,
        stats,
        clear,
        delete:      del,
    };
}

module.exports = { createCache };
