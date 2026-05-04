'use strict';

const { EventEmitter } = require('events');
const path = require('path');
const fs   = require('fs');
const { scan } = require('./ClamAVScanner.js');
const { Verdict } = require('./verdicts.js');

/**
 * Returns an EventEmitter-based scanner.
 *
 * Events:
 *   'clean'     (filePath)           — file scanned clean
 *   'malicious' (filePath, viruses)  — virus detected (viruses is always [])
 *   'error'     (err)                — unexpected error (not a scan verdict)
 *   'scanError' (filePath)           — scan returned Verdict.ScanError
 *
 * @param {object} [options] - ScanOptions forwarded to scan()
 * @returns {EventEmitter & { scan(filePath): void, scanDirectory(dirPath): void }}
 */
function createScanner(options = {}) {
    const emitter = new EventEmitter();

    /**
     * Scan a single file and emit the appropriate event.
     * @param {string} filePath
     */
    emitter.scan = function scanFile(filePath) {
        scan(filePath, options)
            .then((verdict) => {
                if (verdict === Verdict.Clean) {
                    emitter.emit('clean', filePath);
                } else if (verdict === Verdict.Malicious) {
                    emitter.emit('malicious', filePath, []);
                } else {
                    emitter.emit('scanError', filePath);
                }
            })
            .catch((err) => {
                emitter.emit('error', err);
            });
    };

    /**
     * Recursively scan every file in dirPath and emit events per file.
     * @param {string} dirPath
     */
    emitter.scanDirectory = function scanDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            emitter.emit('error', new Error(`Directory not found: ${dirPath}`));
            return;
        }

        let files;
        try {
            files = fs.readdirSync(dirPath);
        } catch (err) {
            emitter.emit('error', err);
            return;
        }

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch {
                continue;
            }
            if (stat.isDirectory()) {
                emitter.scanDirectory(fullPath);
            } else {
                emitter.scan(fullPath);
            }
        }
    };

    return emitter;
}

module.exports = { createScanner };
