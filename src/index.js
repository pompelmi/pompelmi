const { scan, scanBuffer, scanStream, scanDirectory } = require('./ClamAVScanner.js');
const { Verdict }                                     = require('./verdicts.js');
const { middleware }                                  = require('./middleware.js');
const { scanS3 }                                      = require('./S3Scanner.js');
const { createPool }                                  = require('./ClamdPool.js');
const { watch }                                       = require('./Watcher.js');

module.exports = { scan, scanBuffer, scanStream, scanDirectory, Verdict, middleware, scanS3, createPool, watch };