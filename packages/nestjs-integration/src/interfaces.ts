import type { ScanOptions } from '@pompelmi/core';

/**
 * Scanner interface compatible with the core scanner.
 */
export interface PompelmiScanner {
  scan(bytes: Uint8Array): Promise<Array<{ rule: string; tags?: string[] }>>;
}

/**
 * Configuration options for the Pompelmi module.
 */
export interface PompelmiModuleOptions extends ScanOptions {
  /**
   * Optional custom scanner instance.
   * If not provided, the default scanner from @pompelmi/core will be used.
   */
  scanner?: PompelmiScanner;
}

/**
 * Options for async module configuration.
 */
export interface PompelmiModuleAsyncOptions {
  /**
   * Modules to import that provide dependencies for the factory.
   */
  imports?: any[];
  
  /**
   * Dependencies to inject into the factory function.
   */
  inject?: any[];
  
  /**
   * Factory function that returns module options.
   */
  useFactory?: (...args: any[]) => Promise<PompelmiModuleOptions> | PompelmiModuleOptions;
  
  /**
   * Class to use for providing options.
   */
  useClass?: new (...args: any[]) => PompelmiModuleOptionsFactory;
  
  /**
   * Existing provider to use for options.
   */
  useExisting?: any;
}

/**
 * Interface for classes that provide module options.
 */
export interface PompelmiModuleOptionsFactory {
  createPompelmiOptions(): Promise<PompelmiModuleOptions> | PompelmiModuleOptions;
}

/**
 * Token for injecting module options.
 */
export const POMPELMI_MODULE_OPTIONS = Symbol('POMPELMI_MODULE_OPTIONS');
