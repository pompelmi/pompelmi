const { scan }    = require('./ClamAVScanner.js');
const { Verdict } = require('./verdicts.js');

module.exports = { scan, Verdict };