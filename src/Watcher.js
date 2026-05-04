'use strict';

const fs   = require('fs');
const path = require('path');
const { scan }    = require('./ClamAVScanner.js');
const { Verdict } = require('./verdicts.js');

const DEBOUNCE_MS = 300;

/**
 * Watch a directory for new/modified files and scan each one automatically.
 * Uses fs.watch (no dependencies) with a 300 ms debounce.
 *
 * @param {string} dirPath
 * @param {object} [options] - Passed to scan() (host, port, socket, timeout, retries, retryDelay)
 * @param {{ onClean?: Function, onMalicious?: Function, onError?: Function }} [callbacks]
 * @returns {import('fs').FSWatcher}
 */
function watch(dirPath, options = {}, { onClean, onMalicious, onError } = {}) {
    const timers = new Map();

    return fs.watch(dirPath, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;

        const fullPath = path.join(dirPath, filename);

        if (timers.has(fullPath)) clearTimeout(timers.get(fullPath));

        timers.set(fullPath, setTimeout(async () => {
            timers.delete(fullPath);

            if (!fs.existsSync(fullPath)) return;

            let stat;
            try { stat = fs.statSync(fullPath); } catch { return; }
            if (!stat.isFile()) return;

            try {
                const verdict = await scan(fullPath, options);
                if (verdict === Verdict.Clean)          onClean     && onClean(fullPath);
                else if (verdict === Verdict.Malicious) onMalicious && onMalicious(fullPath);
                else                                    onError     && onError(new Error(`ScanError for ${fullPath}`), fullPath);
            } catch (err) {
                onError && onError(err, fullPath);
            }
        }, DEBOUNCE_MS));
    });
}

module.exports = { watch };
