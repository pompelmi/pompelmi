'use strict';

const path = require('path');
const { scanBuffer } = require('./ClamAVScanner.js');
const { Verdict }    = require('./verdicts.js');

const REASONS = {
    FILE_TOO_LARGE:      'file_too_large',
    MIME_NOT_ALLOWED:    'mime_not_allowed',
    EXT_NOT_ALLOWED:     'extension_not_allowed',
    ENCRYPTED:           'encrypted_archive',
    VIRUS_DETECTED:      'virus_detected',
    SCANNER_UNAVAILABLE: 'scanner_unavailable',
};

// Minimal magic-byte check for encrypted ZIP (central directory encrypted flag)
function looksEncrypted(buffer) {
    // ZIP local file header signature: 50 4B 03 04
    // General-purpose bit flag word at offset 6; bit 0 = encryption
    if (buffer.length < 8) return false;
    if (buffer[0] === 0x50 && buffer[1] === 0x4B &&
        buffer[2] === 0x03 && buffer[3] === 0x04) {
        const flags = buffer.readUInt16LE(6);
        return (flags & 0x01) !== 0;
    }
    return false;
}

function createPolicy(rules = {}) {
    const {
        scan: scanOpts           = undefined,
        maxSize                  = null,
        allowedMimeTypes         = null,
        allowedExtensions        = null,
        rejectEncrypted          = false,
        onScannerUnavailable     = 'reject',
    } = rules;

    async function check(buffer, meta = {}) {
        const { filename = null, mimeType = null, size = buffer.length } = meta;
        const details = { size, mimeType, extension: null, virusName: null };

        if (filename) {
            details.extension = path.extname(filename).toLowerCase();
        }

        // 1. Size check
        if (maxSize !== null && size > maxSize) {
            return { allowed: false, reason: REASONS.FILE_TOO_LARGE, verdict: Verdict.ScanError, details };
        }

        // 2. MIME type check
        if (allowedMimeTypes && mimeType) {
            if (!allowedMimeTypes.includes(mimeType)) {
                return { allowed: false, reason: REASONS.MIME_NOT_ALLOWED, verdict: Verdict.ScanError, details };
            }
        }

        // 3. Extension check
        if (allowedExtensions && details.extension) {
            if (!allowedExtensions.includes(details.extension)) {
                return { allowed: false, reason: REASONS.EXT_NOT_ALLOWED, verdict: Verdict.ScanError, details };
            }
        }

        // 4. Encrypted archive check
        if (rejectEncrypted && looksEncrypted(buffer)) {
            return { allowed: false, reason: REASONS.ENCRYPTED, verdict: Verdict.ScanError, details };
        }

        // 5. Virus scan
        if (scanOpts !== undefined) {
            let verdict;
            try {
                verdict = await scanBuffer(buffer, scanOpts);
            } catch (err) {
                if (onScannerUnavailable === 'allow') {
                    return { allowed: true, reason: null, verdict: Verdict.ScanError, details };
                }
                if (onScannerUnavailable === 'throw') {
                    throw err;
                }
                // 'reject'
                return { allowed: false, reason: REASONS.SCANNER_UNAVAILABLE, verdict: Verdict.ScanError, details };
            }

            if (verdict === Verdict.Malicious) {
                return { allowed: false, reason: REASONS.VIRUS_DETECTED, verdict: Verdict.Malicious, details };
            }

            return { allowed: true, reason: null, verdict, details };
        }

        return { allowed: true, reason: null, verdict: Verdict.Clean, details };
    }

    function middleware() {
        return async function policyMiddleware(req, res, next) {
            let file = null;
            if (req.file) {
                file = req.file;
            } else if (req.files) {
                const files = Array.isArray(req.files)
                    ? req.files
                    : Object.values(req.files).flat();
                file = files[0] || null;
            }

            if (!file) return next();

            const buffer   = file.buffer;
            const filename = file.originalname || null;
            const mimeType = file.mimetype || null;
            const size     = buffer ? buffer.length : (file.size || 0);

            try {
                const result = await check(buffer || Buffer.alloc(0), { filename, mimeType, size });
                if (!result.allowed) {
                    return res.status(403).json({ error: result.reason });
                }
                next();
            } catch (err) {
                next(err);
            }
        };
    }

    function nestGuard() {
        return {
            canActivate: async (context) => {
                const req    = context.switchToHttp().getRequest();
                const res    = context.switchToHttp().getResponse();
                const file   = req.file || (req.files && (Array.isArray(req.files) ? req.files[0] : Object.values(req.files).flat()[0]));
                if (!file) return true;

                const buffer   = file.buffer;
                const filename = file.originalname || null;
                const mimeType = file.mimetype || null;
                const size     = buffer ? buffer.length : (file.size || 0);

                const result = await check(buffer || Buffer.alloc(0), { filename, mimeType, size });
                if (!result.allowed) {
                    res.status(403).json({ error: result.reason });
                    return false;
                }
                return true;
            },
        };
    }

    return { check, middleware, nestGuard };
}

module.exports = { createPolicy };
