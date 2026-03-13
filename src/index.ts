/**
 * src/index.ts — Primary Node.js entry point for Pompelmi.
 *
 * This is the full API including Node.js-only modules (HIPAA compliance,
 * crypto-based caching and hashing, ZIP streaming, YARA native bindings).
 *
 * For browser-safe usage, import from 'pompelmi/browser'.
 * For React hooks, import from 'pompelmi/react'.
 */

// ── Core scan API ─────────────────────────────────────────────────────────────
export { scanFiles, scanBytes, scanFile, type ScanOptions } from './scan';
export { validateFile } from './validate';
export { scanFilesWithRemoteYara } from './scan/remote';

// ── Built-in scanners ─────────────────────────────────────────────────────────
export { CommonHeuristicsScanner } from './scanners/common-heuristics';
export { createZipBombGuard } from './scanners/zip-bomb-guard';

// ── Policy and preset composition ─────────────────────────────────────────────
export { definePolicy, DEFAULT_POLICY } from './policy';
export {
  POLICY_PACKS,
  DOCUMENTS_ONLY,
  IMAGES_ONLY,
  STRICT_PUBLIC_UPLOAD,
  CONSERVATIVE_DEFAULT,
  ARCHIVES,
  getPolicyPack,
  type PolicyPackName,
} from './policy-packs';
export {
  composeScanners,
  createPresetScanner,
  type PresetName,
  type PresetOptions,
  type NamedScanner,
  type ComposeScannerOptions,
} from './presets';

// ── Verdict helpers ───────────────────────────────────────────────────────────
export { mapMatchesToVerdict } from './verdict';

// ── Shared types ──────────────────────────────────────────────────────────────
export * from './types';
export type { YaraMatch } from './yara/index';
export type { NodeScanOptions, NodeFileEntry } from './node/scanDir';

// ── Performance tracking ──────────────────────────────────────────────────────
export {
  PerformanceTracker,
  aggregateScanStats,
  type PerformanceMetrics,
  type ScanStatistics,
} from './utils/performance-metrics';

// ── Advanced detection (polyglot, obfuscation) ────────────────────────────────
export {
  detectPolyglot,
  detectObfuscatedScripts,
  analyzeNestedArchives,
} from './utils/advanced-detection';

// ── Cache management (Node.js — uses crypto for content hashing) ──────────────
export {
  ScanCacheManager,
  getDefaultCache,
  resetDefaultCache,
  type CacheEntry,
  type CacheOptions,
  type CacheStats,
} from './utils/cache-manager';

// ── Batch scanning ────────────────────────────────────────────────────────────
export {
  BatchScanner,
  batchScan,
  type BatchScanOptions,
  type BatchScanResult,
  type ScanTask,
} from './utils/batch-scanner';

// ── Threat intelligence (Node.js — uses crypto) ───────────────────────────────
export {
  ThreatIntelligenceAggregator,
  LocalThreatIntelligence,
  createThreatIntelligence,
  getFileHash,
  type ThreatIntelligenceSource,
  type ThreatInfo,
  type EnhancedScanReport,
} from './utils/threat-intelligence';

// ── Export utilities ──────────────────────────────────────────────────────────
export {
  ScanResultExporter,
  exportScanResults,
  type ExportFormat,
  type ExportOptions,
} from './utils/export';

// ── Configuration ─────────────────────────────────────────────────────────────
export {
  ConfigManager,
  createConfig,
  getPresetConfig,
  DEFAULT_CONFIG,
  CONFIG_PRESETS,
  type ScannerConfig,
} from './config';

// ── HIPAA compliance (Node.js — uses crypto/os/path) ─────────────────────────
export {
  initializeHipaaCompliance,
  getHipaaManager,
  createHipaaError,
  HipaaTemp,
  type HipaaConfig,
  type AuditEvent,
} from './hipaa-compliance';

