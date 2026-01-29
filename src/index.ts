// src/index.ts — Browser / React entry point for pompelmi

// Re-export browser API
export { scanFiles } from './scan';
export { validateFile } from './validate';
export { useFileScanner } from './useFileScanner';

// (If you added the YARA function for browser-side scanning)
// New API: heuristics (magic bytes, SVG/script, JPEG trailer) + optional YARA

// Re-export TYPES (no local redeclaration)
export type { YaraMatch } from './yara/index';
export type { NodeScanOptions, NodeFileEntry } from './node/scanDir'; // optional
export { scanFilesWithRemoteYara } from './scan/remote';

export * from './types';
export { mapMatchesToVerdict } from './verdict';


export { CommonHeuristicsScanner } from './scanners/common-heuristics';

export { createZipBombGuard } from './scanners/zip-bomb-guard';

export { definePolicy, DEFAULT_POLICY } from './policy';

export { createPresetScanner, composeScanners, type PresetName, type PresetOptions } from './presets';

export { scanBytes, scanFile, type ScanOptions } from './scan';
export * from "./presets";

// Export new utilities
export { 
  PerformanceTracker, 
  aggregateScanStats,
  type PerformanceMetrics,
  type ScanStatistics,
} from './utils/performance-metrics';

export {
  detectPolyglot,
  detectObfuscatedScripts,
  analyzeNestedArchives,
} from './utils/advanced-detection';

// Export cache management
export {
  ScanCacheManager,
  getDefaultCache,
  resetDefaultCache,
  type CacheEntry,
  type CacheOptions,
  type CacheStats,
} from './utils/cache-manager';

// Export batch scanning
export {
  BatchScanner,
  batchScan,
  type BatchScanOptions,
  type BatchScanResult,
  type ScanTask,
} from './utils/batch-scanner';

// Export threat intelligence
export {
  ThreatIntelligenceAggregator,
  LocalThreatIntelligence,
  createThreatIntelligence,
  getFileHash,
  type ThreatIntelligenceSource,
  type ThreatInfo,
  type EnhancedScanReport,
} from './utils/threat-intelligence';

// Export export utilities
export {
  ScanResultExporter,
  exportScanResults,
  type ExportFormat,
  type ExportOptions,
} from './utils/export';

// Export configuration
export {
  ConfigManager,
  createConfig,
  getPresetConfig,
  DEFAULT_CONFIG,
  CONFIG_PRESETS,
  type ScannerConfig,
} from './config';
