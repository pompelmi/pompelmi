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

// Policy and preset composition
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
// Core scan API (browser-safe; disables cache/YARA automatically in browser)
export { type ScanOptions, scanBytes, scanFile, scanFiles } from "./scan";
// Built-in scanners (pure TypeScript, no Node deps)
export { CommonHeuristicsScanner } from "./scanners/common-heuristics";
export { createZipBombGuard } from "./scanners/zip-bomb-guard";
// Core types
export type {
  FileInfo,
  Match,
  ScanContext,
  ScanFn,
  Scanner,
  ScanReport,
  Uint8ArrayLike,
  Verdict,
  YaraMatch,
} from "./types";
// Advanced detection (browser-safe)
export {
  analyzeNestedArchives,
  detectObfuscatedScripts,
  detectPolyglot,
} from "./utils/advanced-detection";
// Export utilities (browser-safe)
export {
  type ExportFormat,
  type ExportOptions,
  exportScanResults,
  ScanResultExporter,
} from "./utils/export";
// Performance tracking (browser-safe)
export {
  aggregateScanStats,
  type PerformanceMetrics,
  PerformanceTracker,
  type ScanStatistics,
} from "./utils/performance-metrics";
// File validation
export { validateFile } from "./validate";
// Verdict helpers
export { mapMatchesToVerdict } from "./verdict";
