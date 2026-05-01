const { scan, scanBuffer, scanStream, scanDirectory } = require('./ClamAVScanner.js');
const { Verdict }                                     = require('./verdicts.js');
const { middleware }                                  = require('./middleware.js');

module.exports = { scan, scanBuffer, scanStream, scanDirectory, Verdict, middleware };