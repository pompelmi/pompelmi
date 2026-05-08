'use strict';

const fs   = require('fs');
const path = require('path');
const { scan }    = require('./ClamAVScanner.js');
const { Verdict } = require('./verdicts.js');

const DEBOUNCE_MS = 300;

function quarantineFile(filePath, quarantineDir, virus) {
  try {
    fs.mkdirSync(quarantineDir, { recursive: true });
    const basename    = path.basename(filePath);
    const destBase    = path.join(quarantineDir, basename + '.quarantined');
    const destJson    = destBase + '.json';
    const sha256      = (() => { try { return require('crypto').createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); } catch { return ''; } })();

    fs.renameSync(filePath, destBase);

    const sidecar = {
      originalPath: filePath,
      virus: virus || '',
      timestamp: new Date().toISOString(),
      sha256,
    };
    fs.writeFileSync(destJson, JSON.stringify(sidecar, null, 2));

    return destBase;
  } catch {
    return null;
  }
}

/**
 * Watch a directory for new/modified files and scan each one automatically.
 * Uses fs.watch (no dependencies) with a 300 ms debounce.
 *
 * @param {string} dirPath
 * @param {object} [options] - Passed to scan() (host, port, socket, timeout, retries, retryDelay).
 *   Also accepts `quarantine` (string path) to enable auto-quarantine of infected files.
 * @param {{ onClean?: Function, onMalicious?: Function, onError?: Function }} [callbacks]
 * @returns {import('fs').FSWatcher}
 */
function watch(dirPath, options = {}, { onClean, onMalicious, onError } = {}) {
  const { quarantine: quarantineDir, ...scanOptions } = options;
  const timers = new Map();

  if (quarantineDir) {
    fs.mkdirSync(quarantineDir, { recursive: true });
  }

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
        const verdict = await scan(fullPath, scanOptions);
        if (verdict === Verdict.Clean) {
          onClean && onClean(fullPath);
        } else if (verdict === Verdict.Malicious) {
          if (quarantineDir) quarantineFile(fullPath, quarantineDir, '');
          onMalicious && onMalicious(fullPath);
        } else {
          onError && onError(new Error(`ScanError for ${fullPath}`), fullPath);
        }
      } catch (err) {
        onError && onError(err, fullPath);
      }
    }, DEBOUNCE_MS));
  });
}

module.exports = { watch, quarantineFile };
