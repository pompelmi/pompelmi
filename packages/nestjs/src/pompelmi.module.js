'use strict';

const { PompelmiService } = require('./pompelmi.service');

const POMPELMI_OPTIONS = 'POMPELMI_OPTIONS';

class PompelmiModule {
  static forRoot(options = {}) {
    return {
      module: PompelmiModule,
      providers: [
        { provide: POMPELMI_OPTIONS, useValue: options },
        {
          provide: PompelmiService,
          useFactory: (opts) => new PompelmiService(opts),
          inject: [POMPELMI_OPTIONS],
        },
      ],
      exports: [PompelmiService],
    };
  }

  static forRootAsync(asyncOptions = {}) {
    const asyncProviders = [];
    if (asyncOptions.useFactory) {
      asyncProviders.push({
        provide: POMPELMI_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject || [],
      });
    }
    return {
      module: PompelmiModule,
      imports: asyncOptions.imports || [],
      providers: [
        ...asyncProviders,
        {
          provide: PompelmiService,
          useFactory: (opts) => new PompelmiService(opts),
          inject: [POMPELMI_OPTIONS],
        },
      ],
      exports: [PompelmiService],
    };
  }
}

module.exports = { PompelmiModule, POMPELMI_OPTIONS };
