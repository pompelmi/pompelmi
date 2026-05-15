try {
  if (process.stderr.isTTY && !process.env.CI) {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const markerDir = path.join(os.homedir(), '.pompelmi');
    const markerFile = path.join(markerDir, '.starred');
    if (!fs.existsSync(markerFile)) {
      process.stderr.write('⭐ Enjoying pompelmi? Star it → https://github.com/pompelmi/pompelmi\n');
      fs.mkdirSync(markerDir, { recursive: true });
      fs.writeFileSync(markerFile, '');
    }
  }
} catch (e) {
  // silently fail — never break existing functionality
}

const { scan, scanBuffer, scanStream, scanDirectory } = require('./ClamAVScanner.js');
const { Verdict }                                     = require('./verdicts.js');
const { middleware }                                  = require('./middleware.js');
const { scanS3 }                                      = require('./S3Scanner.js');
const { createPool }                                  = require('./ClamdPool.js');
const { watch }                                       = require('./Watcher.js');
const { notify }                                      = require('./WebhookNotifier.js');
const { createScanner }                               = require('./ScanEmitter.js');
const { generateDashboard }                           = require('./Dashboard.js');
const { generateShareCard }                           = require('./ShareCard.js');
const { generateScorecard }                           = require('./Scorecard.js');
const { createCache }                                 = require('./ScanCache.js');
const { createPolicy }                                = require('./Policy.js');
const { createMultiEngine }                           = require('./MultiEngine.js');

module.exports = { scan, scanBuffer, scanStream, scanDirectory, Verdict, middleware, scanS3, createPool, watch, notify, createScanner, generateDashboard, generateShareCard, generateScorecard, createCache, createPolicy, createMultiEngine };