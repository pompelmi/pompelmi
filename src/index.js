const { scan, scanBuffer } = require('./ClamAVScanner.js');
const { Verdict }          = require('./verdicts.js');

module.exports = { scan, scanBuffer, Verdict };