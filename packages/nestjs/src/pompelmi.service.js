'use strict';

const { scan, scanBuffer, scanStream, Verdict } = require('pompelmi');

class PompelmiService {
  constructor(options = {}) {
    this.options = options;
  }

  scan(filePath) {
    return scan(filePath, this.options);
  }

  scanBuffer(buffer) {
    return scanBuffer(buffer, this.options);
  }

  scanStream(stream) {
    return scanStream(stream, this.options);
  }

  async isMalware(buffer) {
    const result = await scanBuffer(buffer, this.options);
    return result === Verdict.Malicious;
  }
}

module.exports = { PompelmiService };
