const { scan, scanBuffer, scanStream } = require('./ClamAVScanner.js');
const { Verdict }                       = require('./verdicts.js');

module.exports = { scan, scanBuffer, scanStream, Verdict };