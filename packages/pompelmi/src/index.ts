export type YaraMatch = { rule: string; tags?: string[]; meta?: Record<string, unknown> };
export interface PompelmiScanner {
  scan(bytes: Uint8Array): Promise<YaraMatch[]>;
}

export { isMalware } from "./isMalware.js";
export type {
  MagicBytesResult,
  MagicBytesSignature,
  PolyglotResult,
} from "./magicBytes/index.js";
// Magic bytes detection & polyglot analysis
export {
  analyzeSecurityRisks,
  DEFAULT_SIGNATURES,
  defaultDetector,
  detectFormat,
  detectPolyglot,
  MagicBytesDetector,
} from "./magicBytes/index.js";
export type { PresetName, ScanOptionsWithPreset } from "./presets/index.js";

// Presets
export { applyPreset, getPreset, listPresets, PRESETS } from "./presets/index.js";
export type { Finding, ReasonCodeInfo } from "./reasonCodes.js";

// Reason Codes
export {
  getReasonCodeInfo,
  inferReasonCode,
  REASON_CODE_METADATA,
  ReasonCode,
} from "./reasonCodes.js";
export * from "./scan.js";
export type { StreamScanOptions } from "./scanStream.js";
export { scanStream, scanStreamFromBuffer } from "./scanStream.js";

/**
 * Optional YARA: this placeholder throws until the YARA engine package is provided.
 * For now, pass a `scanner` object to adapters instead of `rules`.
 *
 * @throws {Error} When called without the YARA engine package installed
 */
export async function createYaraScannerFromRules(_rules: string): Promise<PompelmiScanner> {
  throw new Error(
    "YARA engine not bundled in 'pompelmi' core. " +
      "Pass 'scanner' to adapters or install '@pompelmi/engine-yara' package.",
  );
}

/** Minimal stub for a remote engine API (browser usage) */
export async function createRemoteEngine(_opts?: Record<string, unknown>) {
  return {
    async compile(_rules: string) {
      return {
        async scan(_bytes: Uint8Array): Promise<YaraMatch[]> {
          return [];
        },
      };
    },
  };
}

export const version = "0.26.0";

export { createProductionScannerFactory } from "./presets/production";
export { scanPolyglot } from "./scanners/polyglotDetector";
export { scanTar } from "./scanners/tarGuard";
export { createZipTraversalGuard } from "./scanners/zipTraversalGuard";
export type { PerformanceMetrics } from "./utils/performance.js";
// Performance monitoring utilities
export {
  createPerformanceMonitor,
  formatPerformanceMetrics,
} from "./utils/performance.js";
