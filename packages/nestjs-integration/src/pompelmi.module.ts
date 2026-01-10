import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { PompelmiService } from './pompelmi.service.js';
import { PompelmiInterceptor } from './pompelmi.interceptor.js';
import {
  POMPELMI_MODULE_OPTIONS,
  type PompelmiModuleOptions,
  type PompelmiModuleAsyncOptions,
  type PompelmiModuleOptionsFactory,
} from './interfaces.js';

/**
 * Dynamic NestJS module for Pompelmi malware scanner.
 * 
 * Provides:
 * - PompelmiService: Injectable service for programmatic scanning
 * - PompelmiInterceptor: Interceptor for automatic file upload scanning
 * 
 * @example Synchronous configuration:
 * ```typescript
 * @Module({
 *   imports: [
 *     PompelmiModule.forRoot({
 *       failFast: true,
 *       heuristicThreshold: 75,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 * 
 * @example Asynchronous configuration:
 * ```typescript
 * @Module({
 *   imports: [
 *     PompelmiModule.forRootAsync({
 *       imports: [ConfigModule],
 *       inject: [ConfigService],
 *       useFactory: (config: ConfigService) => ({
 *         failFast: config.get('SCAN_FAIL_FAST'),
 *       }),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class PompelmiModule {
  /**
   * Register module with synchronous configuration.
   * 
   * @param options - Module configuration options
   * @returns Dynamic module
   */
  static forRoot(options: PompelmiModuleOptions = {}): DynamicModule {
    return {
      module: PompelmiModule,
      providers: [
        {
          provide: POMPELMI_MODULE_OPTIONS,
          useValue: options,
        },
        PompelmiService,
        PompelmiInterceptor,
      ],
      exports: [PompelmiService, PompelmiInterceptor],
      global: false,
    };
  }

  /**
   * Register module with asynchronous configuration.
   * Allows configuration to be loaded from ConfigService or other async sources.
   * 
   * @param options - Async module configuration options
   * @returns Dynamic module
   */
  static forRootAsync(options: PompelmiModuleAsyncOptions): DynamicModule {
    return {
      module: PompelmiModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        PompelmiService,
        PompelmiInterceptor,
      ],
      exports: [PompelmiService, PompelmiInterceptor],
      global: false,
    };
  }

  /**
   * Create providers for async configuration.
   */
  private static createAsyncProviders(
    options: PompelmiModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: POMPELMI_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: POMPELMI_MODULE_OPTIONS,
          useFactory: async (optionsFactory: PompelmiModuleOptionsFactory) =>
            optionsFactory.createPompelmiOptions(),
          inject: [options.useClass],
        },
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: POMPELMI_MODULE_OPTIONS,
          useFactory: async (optionsFactory: PompelmiModuleOptionsFactory) =>
            optionsFactory.createPompelmiOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    throw new Error(
      'Invalid PompelmiModuleAsyncOptions: must provide useFactory, useClass, or useExisting',
    );
  }
}
