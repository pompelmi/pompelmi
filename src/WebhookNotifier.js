'use strict';

const https = require('https');
const http  = require('http');
const crypto = require('crypto');
const os     = require('os');
const { URL } = require('url');

/**
 * Send a POST webhook notification when a scan result is available.
 *
 * @param {string} webhookUrl - Destination URL (http or https).
 * @param {object} scanResult - { file, verdict, viruses }
 * @param {object} [options]  - { onlyOnMalicious, secret }
 * @returns {Promise<void>}
 */
function notify(webhookUrl, scanResult, options = {}) {
    const { onlyOnMalicious = true, secret } = options;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
        return Promise.reject(new Error('webhookUrl must be a non-empty string'));
    }
    if (!scanResult || typeof scanResult !== 'object') {
        return Promise.reject(new Error('scanResult must be an object'));
    }

    const verdictDescription =
        scanResult.verdict && typeof scanResult.verdict === 'symbol'
            ? scanResult.verdict.description
            : String(scanResult.verdict ?? 'Unknown');

    const isMalicious = verdictDescription === 'Malicious';

    if (onlyOnMalicious && !isMalicious) {
        return Promise.resolve();
    }

    const payload = JSON.stringify({
        file:      scanResult.file ?? null,
        verdict:   verdictDescription,
        viruses:   scanResult.viruses ?? [],
        timestamp: new Date().toISOString(),
        hostname:  os.hostname(),
    });

    return new Promise((resolve, reject) => {
        let parsed;
        try {
            parsed = new URL(webhookUrl);
        } catch {
            return reject(new Error(`Invalid webhookUrl: ${webhookUrl}`));
        }

        const isHttps = parsed.protocol === 'https:';
        const transport = isHttps ? https : http;

        const headers = {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent':     'pompelmi-webhook/1.0',
        };

        if (secret) {
            const sig = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            headers['X-Pompelmi-Signature'] = `sha256=${sig}`;
        }

        const reqOptions = {
            hostname: parsed.hostname,
            port:     parsed.port || (isHttps ? 443 : 80),
            path:     parsed.pathname + parsed.search,
            method:   'POST',
            headers,
        };

        const req = transport.request(reqOptions, (res) => {
            res.resume(); // drain response body
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error(`Webhook responded with HTTP ${res.statusCode}`));
            }
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

module.exports = { notify };
