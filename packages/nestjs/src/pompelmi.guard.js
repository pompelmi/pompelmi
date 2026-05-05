'use strict';

const { Verdict } = require('pompelmi');

class PompelmiGuard {
  constructor(pompelmiService) {
    this.pompelmiService = pompelmiService;
  }

  async canActivate(context) {
    const request = context.switchToHttp().getRequest();
    const file = request.file || (Array.isArray(request.files) && request.files[0]);
    if (!file) return true;
    const result = await this.pompelmiService.scanBuffer(file.buffer);
    return result !== Verdict.Malicious;
  }
}

module.exports = { PompelmiGuard };
