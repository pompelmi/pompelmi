/**
 * src/browser-index.ts — Browser-safe entry point for Pompelmi.
 *
 * This bundle contains ONLY modules that are safe to use in a browser/bundler
 * environment. It does NOT include:
 *  - HIPAA compliance module (uses Node.js crypto/os/path)
 *  - Cache manager (uses Node.js crypto for content hashing)
 *  - Threat intelligence (uses Node.js crypto)
 *  - ZIP streaming (uses unzipper, a Node.js stream library)
 *  - YARA native bindings
 *  - Batch scanner (Node.js-optimised concurrency)
 *
 * For the full Node.js API (all of the above included), import from 'pompelmi'
 * or 'pompelmi/node'.
 *
 * For the React hook, import from 'pompelmi/react'.
 */

// Core scan API (browser-safe; disables cache/YARA automatically in browser)
export { scanFiles, scanBytes, scanFile, type ScanOptions } from './scan';

// File validation
export { validateFile } from './validate';

// Built-in scanners (pure TypeScript, no Node deps)
export { CommonHeuristicsScanner } from './scanners/common-heuristics';
export { createZipBombGuard } from './scanners/zip-bomb-guard';

// Policy and preset composition
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

// Verdict helpers
export { mapMatchesToVerdict } from './verdict';

// Performance tracking (browser-safe)
export {
  PerformanceTracker,
  aggregateScanStats,
  type PerformanceMetrics,
  type ScanStatistics,
} from './utils/performance-metrics';

// Advanced detection (browser-safe)
export {
  detectPolyglot,
  detectObfuscatedScripts,
  analyzeNestedArchives,
} from './utils/advanced-detection';

// Export utilities (browser-safe)
export {
  ScanResultExporter,
  exportScanResults,
  type ExportFormat,
  type ExportOptions,
} from './utils/export';

// Core types
export type {
  Verdict,
  Match,
  YaraMatch,
  ScanReport,
  ScanContext,
  ScanFn,
  Scanner,
  FileInfo,
  Uint8ArrayLike,
} from './types';
