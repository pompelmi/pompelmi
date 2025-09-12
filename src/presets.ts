import type { Scanner } from './compose';
import { composeScanners } from './compose';
import { createZipBombGuard } from './scanners/zip-bomb-guard';

export type PresetName = 'balanced' | 'strict' | 'zipHeavy';

export interface PresetOptions {
  stopOn?: 'suspicious' | 'malicious';
  timeoutMsPerScanner?: number;
  parallel?: boolean;
  zip?: {
    maxEntries?: number;
    maxTotalUncompressedBytes?: number;
    maxCompressionRatio?: number;
    maxDepth?: number;
  };
  /** Scanners extra, es: [['heuristics', CommonHeuristicsScanner]] */
  extra?: ReadonlyArray<readonly [string, Scanner]>;
}

function deepMerge<T extends object>(...objs: Partial<T>[]): T {
  const out: any = {};
  for (const o of objs) {
    for (const [k, v] of Object.entries(o || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = deepMerge(out[k] || {}, v as any);
      else out[k] = v;
    }
  }
  return out;
}

export function createPresetScanner(preset: PresetName = 'balanced', overrides: PresetOptions = {}) {
  const MB = 1024 * 1024;

  const base: Required<Omit<PresetOptions, 'extra' | 'zip'>> & { zip: Required<NonNullable<PresetOptions['zip']>> } = {
    stopOn: 'suspicious',
    timeoutMsPerScanner: 1500,
    parallel: false,
    zip: { maxEntries: 512, maxTotalUncompressedBytes: 100 * MB, maxCompressionRatio: 12, maxDepth: 3 }
  };

  const variants: Record<PresetName, Partial<PresetOptions>> = {
    balanced: {},
    strict:   { zip: { maxEntries: 256, maxTotalUncompressedBytes: 50 * MB,  maxCompressionRatio: 10, maxDepth: 2 } },
    zipHeavy: { zip: { maxEntries: 1024,maxTotalUncompressedBytes: 200 * MB, maxCompressionRatio: 15, maxDepth: 5 } }
  };

  const cfg = deepMerge(base, variants[preset], overrides);

  const builtins: ReadonlyArray<readonly [string, Scanner]> = [
    ['zipGuard', createZipBombGuard(cfg.zip)]
  ];

  const allScanners = (overrides.extra?.length ? [...builtins, ...overrides.extra] : builtins) as ReadonlyArray<readonly [string, Scanner]>;

  return composeScanners(allScanners, {
    stopOn: cfg.stopOn,
    timeoutMsPerScanner: cfg.timeoutMsPerScanner,
    parallel: cfg.parallel,
    tagSourceName: true
  });
}
