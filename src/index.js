const { scan, scanBuffer, scanStream, scanDirectory } = require('./ClamAVScanner.js');
const { Verdict }                                     = require('./verdicts.js');

module.exports = { scan, scanBuffer, scanStream, scanDirectory, Verdict };