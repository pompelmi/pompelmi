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

module.exports = { scan, scanBuffer, scanStream, scanDirectory, Verdict, middleware, scanS3, createPool, watch, notify, createScanner, generateDashboard, generateShareCard };