/**
 * Policy Presets for pompelmi
 * 
 * Presets provide safe, production-ready defaults for common scanning scenarios.
 * All options can be overridden by explicitly passing them to scan functions.
 */

import type { ScanOptions } from '../scan.js';

/**
 * Preset names for scanning policies
 */
export type PresetName = 'strict' | 'balanced' | 'fast';

/**
 * Extended scan options with preset support
 */
export interface ScanOptionsWithPreset extends ScanOptions {
  /**
   * Apply a preset configuration before merging explicit options.
   * - 'strict': Maximum security, slower scanning, lower limits
   * - 'balanced': Recommended defaults for most production use
   * - 'fast': Faster scanning with reduced depth, higher limits
   * 
   * Any explicitly provided options override the preset values.
   * 
   * @example
   * ```ts
   * // Use strict preset but allow deeper archives
   * scan(buffer, { preset: 'strict', maxDepth: 5 })
   * ```
   */
  preset?: PresetName;
}

/**
 * Preset configurations
 */
export const PRESETS: Record<PresetName, Required<Pick<ScanOptions, 'maxDepth' | 'heuristicThreshold' | 'maxBufferSize' | 'failFast'>>> = {
  /**
   * Strict preset: Maximum security for high-risk environments
   * - Lower file size limits (5MB buffer)
   * - Shallow archive depth (2 levels)
   * - Lower heuristic threshold (60/100)
   * - Fail-fast enabled
   * 
   * Use when: Handling untrusted uploads, security-critical applications
   */
  strict: {
    maxDepth: 2,
    heuristicThreshold: 60,
    maxBufferSize: 5 * 1024 * 1024, // 5MB
    failFast: true,
  },
  
  /**
   * Balanced preset: Recommended for most production deployments
   * - Moderate file size limits (10MB buffer)
   * - Reasonable archive depth (4 levels)
   * - Standard heuristic threshold (75/100)
   * - Fail-fast disabled for comprehensive scanning
   * 
   * Use when: General purpose file scanning, standard risk tolerance
   */
  balanced: {
    maxDepth: 4,
    heuristicThreshold: 75,
    maxBufferSize: 10 * 1024 * 1024, // 10MB
    failFast: false,
  },
  
  /**
   * Fast preset: Performance-optimized for lower-risk scenarios
   * - Higher file size limits (20MB buffer)
   * - Minimal archive depth (1 level - no recursion)
   * - Higher heuristic threshold (85/100)
   * - Fail-fast enabled for speed
   * 
   * Use when: Trusted sources, performance-critical paths, pre-filtered uploads
   */
  fast: {
    maxDepth: 1,
    heuristicThreshold: 85,
    maxBufferSize: 20 * 1024 * 1024, // 20MB
    failFast: true,
  },
};

/**
 * Apply a preset to scan options.
 * Explicit options override preset values.
 * 
 * @param options - User-provided options
 * @returns Merged options with preset applied
 * 
 * @example
 * ```ts
 * const opts = applyPreset({ preset: 'strict', maxDepth: 5 });
 * // Result: strict preset with maxDepth overridden to 5
 * ```
 */
export function applyPreset(options: ScanOptionsWithPreset = {}): ScanOptions {
  const { preset, ...explicitOptions } = options;
  
  if (!preset) {
    return explicitOptions;
  }
  
  const presetConfig = PRESETS[preset];
  if (!presetConfig) {
    throw new Error(`Invalid preset: ${preset}. Valid presets: ${Object.keys(PRESETS).join(', ')}`);
  }
  
  // Merge: preset defaults < explicit options
  return {
    ...presetConfig,
    ...explicitOptions,
  };
}

/**
 * Get preset configuration for inspection
 */
export function getPreset(name: PresetName): Required<Pick<ScanOptions, 'maxDepth' | 'heuristicThreshold' | 'maxBufferSize' | 'failFast'>> {
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(`Invalid preset: ${name}. Valid presets: ${Object.keys(PRESETS).join(', ')}`);
  }
  return preset;
}

/**
 * List all available preset names
 */
export function listPresets(): PresetName[] {
  return Object.keys(PRESETS) as PresetName[];
}
