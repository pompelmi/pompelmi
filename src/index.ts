/**
 * src/index.ts — Primary Node.js entry point for Pompelmi.
 *
 * This is the full API including Node.js-only modules (HIPAA compliance,
 * crypto-based caching and hashing, ZIP streaming, YARA native bindings).
 *
 * For browser-safe usage, import from 'pompelmi/browser'.
 * For React hooks, import from 'pompelmi/react'.
 */

// ── Configuration ─────────────────────────────────────────────────────────────
export {
  CONFIG_PRESETS,
  ConfigManager,
  createConfig,
  DEFAULT_CONFIG,
  getPresetConfig,
  type ScannerConfig,
} from "./config";
// ── HIPAA compliance (Node.js — uses crypto/os/path) ─────────────────────────
export {
  type AuditEvent,
  createHipaaError,
  getHipaaManager,
  type HipaaConfig,
  HipaaTemp,
  initializeHipaaCompliance,
} from "./hipaa-compliance";
export type { NodeFileEntry, NodeScanOptions } from "./node/scanDir";
// ── Policy and preset composition ─────────────────────────────────────────────
export { DEFAULT_POLICY, definePolicy } from "./policy";
export {
  ARCHIVES,
  CONSERVATIVE_DEFAULT,
  DOCUMENTS_ONLY,
  getPolicyPack,
  IMAGES_ONLY,
  POLICY_PACKS,
  type PolicyPackName,
  STRICT_PUBLIC_UPLOAD,
} from "./policy-packs";
export {
  type ComposeScannerOptions,
  composeScanners,
  createPresetScanner,
  type NamedScanner,
  type PresetName,
  type PresetOptions,
} from "./presets";
// ── Core scan API ─────────────────────────────────────────────────────────────
export { type ScanOptions, scanBytes, scanFile, scanFiles } from "./scan";
export { scanFilesWithRemoteYara } from "./scan/remote";
// ── Built-in scanners ─────────────────────────────────────────────────────────
export { CommonHeuristicsScanner } from "./scanners/common-heuristics";
export { createZipBombGuard } from "./scanners/zip-bomb-guard";
// ── Shared types ──────────────────────────────────────────────────────────────
export * from "./types";
// ── Advanced detection (polyglot, obfuscation) ────────────────────────────────
export {
  analyzeNestedArchives,
  detectObfuscatedScripts,
  detectPolyglot,
} from "./utils/advanced-detection";
// ── Batch scanning ────────────────────────────────────────────────────────────
export {
  BatchScanner,
  type BatchScanOptions,
  type BatchScanResult,
  batchScan,
  type ScanTask,
} from "./utils/batch-scanner";
// ── Cache management (Node.js — uses crypto for content hashing) ──────────────
export {
  type CacheEntry,
  type CacheOptions,
  type CacheStats,
  getDefaultCache,
  resetDefaultCache,
  ScanCacheManager,
} from "./utils/cache-manager";
// ── Export utilities ──────────────────────────────────────────────────────────
export {
  type ExportFormat,
  type ExportOptions,
  exportScanResults,
  ScanResultExporter,
} from "./utils/export";
// ── Performance tracking ──────────────────────────────────────────────────────
export {
  aggregateScanStats,
  type PerformanceMetrics,
  PerformanceTracker,
  type ScanStatistics,
} from "./utils/performance-metrics";

// ── Threat intelligence (Node.js — uses crypto) ───────────────────────────────
export {
  createThreatIntelligence,
  type EnhancedScanReport,
  getFileHash,
  LocalThreatIntelligence,
  type ThreatInfo,
  ThreatIntelligenceAggregator,
  type ThreatIntelligenceSource,
} from "./utils/threat-intelligence";
export { validateFile } from "./validate";
// ── Verdict helpers ───────────────────────────────────────────────────────────
export { mapMatchesToVerdict } from "./verdict";
export type { YaraMatch } from "./yara/index";
