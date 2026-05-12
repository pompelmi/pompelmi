'use strict';

const https  = require('https');
const http   = require('http');
const crypto = require('crypto');
const fs     = require('fs');
const { scan, scanBuffer } = require('./ClamAVScanner.js');
const { Verdict }          = require('./verdicts.js');

// ── VirusTotal helpers ──────────────────────────────────────────────────────

function vtRequest(method, urlStr, headers, body) {
    return new Promise((resolve, reject) => {
        const url  = new URL(urlStr);
        const mod  = url.protocol === 'https:' ? https : http;
        const opts = {
            method,
            hostname: url.hostname,
            path:     url.pathname + url.search,
            headers,
        };
        const req = mod.request(opts, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString()));
                } catch {
                    resolve({});
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// Multipart form-data upload for VirusTotal /files endpoint
function vtUpload(apiKey, buffer) {
    return new Promise((resolve, reject) => {
        const boundary = crypto.randomBytes(16).toString('hex');
        const CRLF     = '\r\n';
        const pre  = Buffer.from(
            `--${boundary}${CRLF}` +
            `Content-Disposition: form-data; name="file"; filename="upload"${CRLF}` +
            `Content-Type: application/octet-stream${CRLF}${CRLF}`
        );
        const post = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
        const body = Buffer.concat([pre, buffer, post]);

        const opts = {
            method:   'POST',
            hostname: 'www.virustotal.com',
            path:     '/api/v3/files',
            headers:  {
                'x-apikey':       apiKey,
                'Content-Type':   `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
            },
        };

        const req = https.request(opts, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                catch { resolve({}); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function vtScanBuffer(apiKey, buffer, threshold = 1) {
    try {
        // Upload file
        const upload = await vtUpload(apiKey, buffer);
        const id     = upload && upload.data && upload.data.id;
        if (!id) return { name: 'virustotal', verdict: Verdict.ScanError, detections: 0, error: 'no analysis id' };

        // Poll for result (up to 60s)
        for (let i = 0; i < 12; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const report = await vtRequest('GET',
                `https://www.virustotal.com/api/v3/analyses/${id}`,
                { 'x-apikey': apiKey }, null
            );
            const status = report && report.data && report.data.attributes && report.data.attributes.status;
            if (status === 'completed') {
                const stats      = report.data.attributes.stats || {};
                const detections = (stats.malicious || 0) + (stats.suspicious || 0);
                const verdict    = detections >= threshold ? Verdict.Malicious : Verdict.Clean;
                return { name: 'virustotal', verdict, detections };
            }
        }
        return { name: 'virustotal', verdict: Verdict.ScanError, detections: 0, error: 'timeout' };
    } catch (err) {
        return { name: 'virustotal', verdict: Verdict.ScanError, detections: 0, error: err.message };
    }
}

// ── ClamAV engine wrapper ───────────────────────────────────────────────────

async function clamavScanFile(config, filePath) {
    try {
        const verdict = await scan(filePath, config);
        return { name: 'clamav', verdict };
    } catch (err) {
        return { name: 'clamav', verdict: Verdict.ScanError, error: err.message };
    }
}

async function clamavScanBuffer(config, buffer) {
    try {
        const verdict = await scanBuffer(buffer, config);
        return { name: 'clamav', verdict };
    } catch (err) {
        return { name: 'clamav', verdict: Verdict.ScanError, error: err.message };
    }
}

// ── Consensus logic ─────────────────────────────────────────────────────────

function applyConsensus(results, consensus) {
    const verdicts = results.map(r => r.verdict);
    const malCount = verdicts.filter(v => v === Verdict.Malicious).length;
    const total    = verdicts.length;

    let final;
    if (consensus === 'all') {
        final = malCount === total ? Verdict.Malicious : Verdict.Clean;
    } else if (consensus === 'majority') {
        final = malCount > total / 2 ? Verdict.Malicious : Verdict.Clean;
    } else {
        // 'any' (default)
        final = malCount > 0 ? Verdict.Malicious : Verdict.Clean;
    }

    // If no conclusive result but errors exist, propagate ScanError
    if (final === Verdict.Clean && verdicts.every(v => v === Verdict.ScanError)) {
        final = Verdict.ScanError;
    }

    return final;
}

// ── Public factory ──────────────────────────────────────────────────────────

function createMultiEngine(config = {}) {
    const { engines = [], consensus = 'any' } = config;

    async function _runEnginesOnBuffer(buffer) {
        return Promise.all(engines.map(async (engine) => {
            if (engine.type === 'virustotal') {
                if (!engine.apiKey) return { name: 'virustotal', verdict: Verdict.ScanError, error: 'no apiKey' };
                return vtScanBuffer(engine.apiKey, buffer, engine.threshold ?? 1);
            }
            // clamav
            return clamavScanBuffer(engine, buffer);
        }));
    }

    async function scanMultiBuffer(buffer) {
        if (!Buffer.isBuffer(buffer)) throw new Error('buffer must be a Buffer');
        const engineResults = await _runEnginesOnBuffer(buffer);
        const verdict = applyConsensus(engineResults, consensus);
        return { verdict, consensus, engines: engineResults };
    }

    async function scanMultiFile(filePath) {
        if (typeof filePath !== 'string') throw new Error('filePath must be a string');
        const buffer = fs.readFileSync(filePath);
        const engineResults = await Promise.all(engines.map(async (engine) => {
            if (engine.type === 'virustotal') {
                if (!engine.apiKey) return { name: 'virustotal', verdict: Verdict.ScanError, error: 'no apiKey' };
                return vtScanBuffer(engine.apiKey, buffer, engine.threshold ?? 1);
            }
            return clamavScanFile(engine, filePath);
        }));
        const verdict = applyConsensus(engineResults, consensus);
        return { verdict, consensus, engines: engineResults };
    }

    return { scan: scanMultiFile, scanBuffer: scanMultiBuffer };
}

module.exports = { createMultiEngine };
