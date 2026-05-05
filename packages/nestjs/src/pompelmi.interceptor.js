'use strict';

const { BadRequestException } = require('@nestjs/common');
const { Verdict } = require('pompelmi');

class PompelmiInterceptor {
  constructor(pompelmiService) {
    this.pompelmiService = pompelmiService;
  }

  async intercept(context, next) {
    const request = context.switchToHttp().getRequest();
    const file = request.file || (Array.isArray(request.files) && request.files[0]);
    if (file) {
      const result = await this.pompelmiService.scanBuffer(file.buffer);
      if (result === Verdict.Malicious) {
        throw new BadRequestException('Malicious file detected');
      }
    }
    return next.handle();
  }
}

module.exports = { PompelmiInterceptor };
