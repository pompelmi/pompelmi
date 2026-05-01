'use strict';

const { scanBuffer, Verdict } = require('./ClamAVScanner.js');

function middleware(opts = {}) {
    const field = opts.uploadField || 'file';

    return async function pompelmiMiddleware(req, res, next) {
        let buffers = [];

        if (req.file) {
            buffers = [req.file.buffer];
        } else if (req.files) {
            const files = Array.isArray(req.files)
                ? req.files
                : (req.files[field] || Object.values(req.files).flat());
            buffers = files.map(f => f.buffer).filter(Boolean);
        }

        if (buffers.length === 0) return next();

        try {
            for (const buf of buffers) {
                const verdict = await scanBuffer(buf, opts);
                if (verdict === Verdict.Malicious) {
                    return res.status(403).json({ error: 'Malicious file detected' });
                }
            }
            next();
        } catch (err) {
            next(err);
        }
    };
}

module.exports = { middleware };
