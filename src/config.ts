/**
 * Advanced configuration system for pompelmi
 * @module config
 */

import type { PresetName, PresetOptions } from './presets';
import type { CacheOptions } from './utils/cache-manager';

export interface ScannerConfig {
  /** Default preset to use */
  defaultPreset?: PresetName;
  
  /** Preset-specific options */
  presetOptions?: PresetOptions;
  
  /** Performance settings */
  performance?: {
    /** Enable caching of scan results */
    enableCache?: boolean;
    /** Cache configuration */
    cacheOptions?: CacheOptions;
    /** Enable performance tracking */
    enablePerformanceTracking?: boolean;
    /** Enable parallel processing */
    enableParallel?: boolean;
    /** Maximum concurrent scans */
    maxConcurrency?: number;
  };
  
  /** Security settings */
  security?: {
    /** Maximum file size to scan (in bytes) */
    maxFileSize?: number;
    /** Enable threat intelligence integration */
    enableThreatIntel?: boolean;
    /** Timeout for individual scans (ms) */
    scanTimeout?: number;
    /** Enable strict mode (reject suspicious files) */
    strictMode?: boolean;
  };
  
  /** Advanced detection */
  advanced?: {
    /** Enable polyglot detection */
    enablePolyglotDetection?: boolean;
    /** Enable obfuscation detection */
    enableObfuscationDetection?: boolean;
    /** Enable nested archive analysis */
    enableNestedArchiveAnalysis?: boolean;
    /** Maximum archive nesting depth */
    maxArchiveDepth?: number;
  };
  
  /** Logging and reporting */
  logging?: {
    /** Enable detailed logging */
    verbose?: boolean;
    /** Log level (debug, info, warn, error) */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** Enable scan statistics */
    enableStats?: boolean;
  };
  
  /** Callbacks */
  callbacks?: {
    /** Called before scan starts */
    onScanStart?: (filename?: string) => void;
    /** Called when scan completes */
    onScanComplete?: (report: any) => void;
    /** Called on scan error */
    onScanError?: (error: Error, filename?: string) => void;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: ScannerConfig = {
  defaultPreset: 'zip-basic',
  
  performance: {
    enableCache: false,
    enablePerformanceTracking: false,
    enableParallel: true,
    maxConcurrency: 5,
    cacheOptions: {
      maxSize: 1000,
      ttl: 3600000, // 1 hour
      enableLRU: true,
      enableStats: false,
    },
  },
  
  security: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    enableThreatIntel: false,
    scanTimeout: 30000, // 30 seconds
    strictMode: false,
  },
  
  advanced: {
    enablePolyglotDetection: true,
    enableObfuscationDetection: true,
    enableNestedArchiveAnalysis: true,
    maxArchiveDepth: 5,
  },
  
  logging: {
    verbose: false,
    level: 'info',
    enableStats: false,
  },
};

/**
 * Configuration presets for common use cases
 */
export const CONFIG_PRESETS = {
  /** Fast scanning with minimal features */
  fast: {
    defaultPreset: 'basic' as PresetName,
    performance: {
      enableCache: true,
      enablePerformanceTracking: false,
      maxConcurrency: 10,
    },
    advanced: {
      enablePolyglotDetection: false,
      enableObfuscationDetection: false,
      enableNestedArchiveAnalysis: false,
    },
  } as Partial<ScannerConfig>,

  /** Balanced scanning (recommended) */
  balanced: DEFAULT_CONFIG,

  /** Thorough scanning with all features */
  thorough: {
    defaultPreset: 'advanced' as PresetName,
    performance: {
      enableCache: true,
      enablePerformanceTracking: true,
      maxConcurrency: 3,
    },
    security: {
      maxFileSize: 500 * 1024 * 1024, // 500MB
      enableThreatIntel: true,
      scanTimeout: 60000, // 60 seconds
      strictMode: true,
    },
    advanced: {
      enablePolyglotDetection: true,
      enableObfuscationDetection: true,
      enableNestedArchiveAnalysis: true,
      maxArchiveDepth: 10,
    },
    logging: {
      verbose: true,
      level: 'debug' as const,
      enableStats: true,
    },
  } as Partial<ScannerConfig>,

  /** Production-ready configuration */
  production: {
    defaultPreset: 'advanced' as PresetName,
    performance: {
      enableCache: true,
      enablePerformanceTracking: true,
      maxConcurrency: 5,
      cacheOptions: {
        maxSize: 5000,
        ttl: 7200000, // 2 hours
        enableLRU: true,
        enableStats: true,
      },
    },
    security: {
      maxFileSize: 200 * 1024 * 1024, // 200MB
      enableThreatIntel: true,
      scanTimeout: 45000,
      strictMode: false,
    },
    advanced: {
      enablePolyglotDetection: true,
      enableObfuscationDetection: true,
      enableNestedArchiveAnalysis: true,
      maxArchiveDepth: 7,
    },
    logging: {
      verbose: false,
      level: 'warn' as const,
      enableStats: true,
    },
  } as Partial<ScannerConfig>,

  /** Development configuration */
  development: {
    defaultPreset: 'basic' as PresetName,
    performance: {
      enableCache: false,
      enablePerformanceTracking: true,
      maxConcurrency: 3,
    },
    security: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      scanTimeout: 15000,
      strictMode: false,
    },
    logging: {
      verbose: true,
      level: 'debug' as const,
      enableStats: true,
    },
  } as Partial<ScannerConfig>,
} as const;

/**
 * Configuration manager
 */
export class ConfigManager {
  private config: ScannerConfig;

  constructor(initialConfig?: Partial<ScannerConfig>) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, initialConfig || {});
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ScannerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ScannerConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  /**
   * Load a preset configuration
   */
  loadPreset(preset: keyof typeof CONFIG_PRESETS): void {
    const presetConfig = CONFIG_PRESETS[preset];
    this.config = this.mergeConfig(DEFAULT_CONFIG, presetConfig);
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get a specific configuration value
   */
  get<K extends keyof ScannerConfig>(key: K): ScannerConfig[K] {
    return this.config[key];
  }

  /**
   * Set a specific configuration value
   */
  set<K extends keyof ScannerConfig>(key: K, value: ScannerConfig[K]): void {
    this.config[key] = value;
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate performance settings
    if (this.config.performance?.maxConcurrency !== undefined) {
      if (this.config.performance.maxConcurrency < 1) {
        errors.push('maxConcurrency must be at least 1');
      }
      if (this.config.performance.maxConcurrency > 50) {
        errors.push('maxConcurrency should not exceed 50');
      }
    }

    // Validate security settings
    if (this.config.security?.maxFileSize !== undefined) {
      if (this.config.security.maxFileSize < 1024) {
        errors.push('maxFileSize must be at least 1KB');
      }
    }

    if (this.config.security?.scanTimeout !== undefined) {
      if (this.config.security.scanTimeout < 1000) {
        errors.push('scanTimeout must be at least 1000ms');
      }
    }

    // Validate advanced settings
    if (this.config.advanced?.maxArchiveDepth !== undefined) {
      if (this.config.advanced.maxArchiveDepth < 1) {
        errors.push('maxArchiveDepth must be at least 1');
      }
      if (this.config.advanced.maxArchiveDepth > 20) {
        errors.push('maxArchiveDepth should not exceed 20');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(base: ScannerConfig, updates: Partial<ScannerConfig>): ScannerConfig {
    return {
      ...base,
      ...updates,
      performance: {
        ...base.performance,
        ...updates.performance,
        cacheOptions: {
          ...base.performance?.cacheOptions,
          ...updates.performance?.cacheOptions,
        },
      },
      security: {
        ...base.security,
        ...updates.security,
      },
      advanced: {
        ...base.advanced,
        ...updates.advanced,
      },
      logging: {
        ...base.logging,
        ...updates.logging,
      },
      callbacks: {
        ...base.callbacks,
        ...updates.callbacks,
      },
      presetOptions: {
        ...base.presetOptions,
        ...updates.presetOptions,
      },
    };
  }

  /**
   * Export configuration as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Load configuration from JSON
   */
  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.config = this.mergeConfig(DEFAULT_CONFIG, parsed);
    } catch (error) {
      throw new Error(`Failed to parse configuration JSON: ${error}`);
    }
  }
}

/**
 * Create a new configuration manager
 */
export function createConfig(config?: Partial<ScannerConfig>): ConfigManager {
  return new ConfigManager(config);
}

/**
 * Get a preset configuration
 */
export function getPresetConfig(preset: keyof typeof CONFIG_PRESETS): Readonly<ScannerConfig> {
  return { ...DEFAULT_CONFIG, ...CONFIG_PRESETS[preset] };
}
