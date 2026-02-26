import type { Scanner, ScanFn, Match, Verdict, DecompilationScanner, AnalysisDepth } from "./types";

export type PresetName = 'basic' | 'advanced' | 'malware-analysis' | 'decompilation-basic' | 'decompilation-deep' | string;

export interface PresetOptions { 
  // YARA options
  yaraRules?: string | string[];
  yaraTimeout?: number;
  
  // Decompilation options
  enableDecompilation?: boolean;
  decompilationEngine?: 'binaryninja-hlil' | 'ghidra-pcode' | 'both';
  decompilationDepth?: AnalysisDepth;
  decompilationTimeout?: number;
  
  // Binary Ninja specific
  binaryNinjaPath?: string;
  pythonPath?: string;
  
  // Ghidra specific  
  ghidraPath?: string;
  analyzeHeadless?: string;
  
  // General options
  timeout?: number;
  [key: string]: unknown;
}

/**
 * A named scanner entry used with the array form of `composeScanners`.
 * The first element is a display name for the scanner (used when
 * `tagSourceName: true`), and the second element is the scanner itself.
 *
 * @example
 * const entry: NamedScanner = ['zipGuard', createZipBombGuard({ ... })];
 */
export type NamedScanner = [name: string, scanner: Scanner];

/**
 * Options for `composeScanners` when using the named-scanner array form.
 */
export interface ComposeScannerOptions {
  /**
   * When `true` scanners run concurrently (Promise.all).
   * When `false` (default) they run sequentially in order.
   */
  parallel?: boolean;
  /**
   * Stop scanning as soon as a match at this severity level (or higher) is
   * found.  Severity order: `'malicious'` > `'suspicious'` > `'clean'`.
   * Only effective when `parallel` is `false`.
   */
  stopOn?: Verdict;
  /** Maximum time in milliseconds to wait for each individual scanner. */
  timeoutMsPerScanner?: number;
  /**
   * When `true`, each match is tagged with the scanner's display name via
   * `match.meta._sourceName`.  Useful for tracing which scanner produced a
   * given result.
   */
  tagSourceName?: boolean;
}

function toScanFn(s: Scanner): (input: any, ctx?: any) => Promise<Match[]> {
  return (typeof s === "function" ? s : s.scan) as (input: any, ctx?: any) => Promise<Match[]>;
}

/** Map a Match's severity field to a Verdict for stopOn comparison. */
function matchToVerdict(m: Match): Verdict {
  const s = m.severity;
  if (s === "critical" || s === "high" || s === "malicious") return "malicious";
  if (s === "medium" || s === "low" || s === "suspicious" || s === "info") return "suspicious";
  return "clean";
}

/** Highest verdict across all matches in the list. */
function highestSeverity(matches: Match[]): Verdict | null {
  if (matches.length === 0) return null;
  if (matches.some((m) => matchToVerdict(m) === "malicious")) return "malicious";
  if (matches.some((m) => matchToVerdict(m) === "suspicious")) return "suspicious";
  return "clean";
}

const SEVERITY_RANK: Record<Verdict, number> = { malicious: 2, suspicious: 1, clean: 0 };

function shouldStop(matches: Match[], stopOn: Verdict | undefined): boolean {
  if (!stopOn) return false;
  const highest = highestSeverity(matches);
  if (!highest) return false;
  return SEVERITY_RANK[highest] >= SEVERITY_RANK[stopOn];
}

async function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number | undefined,
): Promise<T> {
  if (!timeoutMs) return fn();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("scanner timeout")), timeoutMs);
    fn().then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Compose multiple scanners into a single scanner.
 *
 * **Named-scanner array form** (recommended — matches the README examples):
 * ```ts
 * const scanner = composeScanners(
 *   [
 *     ['zipGuard', createZipBombGuard({ maxEntries: 512, maxCompressionRatio: 12 })],
 *     ['heuristics', CommonHeuristicsScanner],
 *   ],
 *   { parallel: false, stopOn: 'malicious', timeoutMsPerScanner: 5000, tagSourceName: true }
 * );
 * ```
 *
 * **Variadic form** (backward-compatible):
 * ```ts
 * const scanner = composeScanners(scannerA, scannerB, scannerC);
 * ```
 */
export function composeScanners(namedScanners: NamedScanner[], opts?: ComposeScannerOptions): ScanFn;
export function composeScanners(...scanners: Scanner[]): ScanFn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function composeScanners(...args: any[]): Scanner {
  const first: NamedScanner[] | Scanner = args[0];
  const rest: Array<Scanner | ComposeScannerOptions> = args.slice(1);
  // ── Named-scanner array form ──────────────────────────────────────────────
  if (
    Array.isArray(first) &&
    (first.length === 0 || (Array.isArray(first[0]) && typeof first[0][0] === "string"))
  ) {
    const entries = first as NamedScanner[];
    const opts: ComposeScannerOptions =
      rest.length > 0 && !Array.isArray(rest[0]) && typeof rest[0] !== "function" &&
      !(typeof rest[0] === "object" && rest[0] !== null && "scan" in (rest[0] as object))
        ? (rest[0] as ComposeScannerOptions)
        : {};

    return async (input: any, ctx?: any) => {
      const all: Match[] = [];

      if (opts.parallel) {
        // Parallel execution — collect all results then return
        const results = await Promise.allSettled(
          entries.map(([name, scanner]) =>
            runWithTimeout(() => toScanFn(scanner)(input, ctx), opts.timeoutMsPerScanner),
          ),
        );
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === "fulfilled" && Array.isArray(result.value)) {
            const matches = opts.tagSourceName
              ? result.value.map((m: Match) => ({
                  ...m,
                  meta: { ...m.meta, _sourceName: entries[i][0] },
                }))
              : result.value;
            all.push(...matches);
          }
        }
      } else {
        // Sequential execution with optional stopOn short-circuit
        for (const [name, scanner] of entries) {
          try {
            const out = await runWithTimeout(
              () => toScanFn(scanner)(input, ctx),
              opts.timeoutMsPerScanner,
            );
            if (Array.isArray(out)) {
              const matches = opts.tagSourceName
                ? out.map((m: Match) => ({ ...m, meta: { ...m.meta, _sourceName: name } }))
                : out;
              all.push(...matches);
              if (shouldStop(all, opts.stopOn)) break;
            }
          } catch {
            // individual scanner failure is non-fatal
          }
        }
      }

      return all;
    };
  }

  // ── Variadic form (backward-compatible) ───────────────────────────────────
  const scanners = [first as Scanner, ...(rest as Scanner[])].filter(Boolean);
  return async (input: any, ctx?: any) => {
    const all: Match[] = [];
    for (const s of scanners) {
      try {
        const out = await toScanFn(s)(input, ctx);
        if (Array.isArray(out)) all.push(...out);
      } catch {
        // ignore individual scanner failures
      }
    }
    return all;
  };
}

export function createPresetScanner(preset: PresetName, opts: PresetOptions = {}): Scanner {
  const scanners: Scanner[] = [];
  
  // Add decompilation scanners based on preset
  if (preset === 'decompilation-basic' || preset === 'decompilation-deep' || 
      preset === 'malware-analysis' || opts.enableDecompilation) {
    
    const depth = preset === 'decompilation-deep' ? 'deep' : 
                  preset === 'decompilation-basic' ? 'basic' : 
                  opts.decompilationDepth || 'basic';
    
    if (!opts.decompilationEngine || opts.decompilationEngine === 'binaryninja-hlil' || opts.decompilationEngine === 'both') {
      try {
        // Dynamic import to avoid bundling issues - using Function to bypass TypeScript type checking
        const importModule = new Function('specifier', 'return import(specifier)');
        importModule('@pompelmi/engine-binaryninja').then((mod: any) => {
          const binjaScanner = mod.createBinaryNinjaScanner({
            timeout: opts.decompilationTimeout || opts.timeout || 30000,
            depth,
            pythonPath: opts.pythonPath,
            binaryNinjaPath: opts.binaryNinjaPath
          });
          scanners.push(binjaScanner);
        }).catch(() => {
          // Binary Ninja engine not available
        });
      } catch {
        // Engine not installed
      }
    }
    
    if (!opts.decompilationEngine || opts.decompilationEngine === 'ghidra-pcode' || opts.decompilationEngine === 'both') {
      try {
        // Dynamic import for Ghidra engine (when implemented) - using Function to bypass TypeScript type checking
        const importModule = new Function('specifier', 'return import(specifier)');
        importModule('@pompelmi/engine-ghidra').then((mod: any) => {
          const ghidraScanner = mod.createGhidraScanner({
            timeout: opts.decompilationTimeout || opts.timeout || 30000,
            depth,
            ghidraPath: opts.ghidraPath,
            analyzeHeadless: opts.analyzeHeadless
          });
          scanners.push(ghidraScanner);
        }).catch(() => {
          // Ghidra engine not available
        });
      } catch {
        // Engine not installed
      }
    }
  }
  
  // Add other scanners for advanced presets
  if (preset === 'advanced' || preset === 'malware-analysis') {
    // Add heuristics scanner
    try {
      const { CommonHeuristicsScanner } = require('./scanners/common-heuristics');
      scanners.push(new CommonHeuristicsScanner());
    } catch {
      // Heuristics not available
    }
  }
  
  if (scanners.length === 0) {
    // Fallback scanner that returns no matches
    return async (_input: any, _ctx?: any) => {
      return [] as Match[];
    };
  }
  
  return composeScanners(...scanners);
}

// Preset configurations
export const PRESET_CONFIGS: Record<string, PresetOptions> = {
  'basic': {
    timeout: 10000
  },
  'advanced': {
    timeout: 30000,
    enableDecompilation: false
  },
  'malware-analysis': {
    timeout: 60000,
    enableDecompilation: true,
    decompilationEngine: 'both',
    decompilationDepth: 'deep'
  },
  'decompilation-basic': {
    timeout: 30000,
    enableDecompilation: true,
    decompilationDepth: 'basic'
  },
  'decompilation-deep': {
    timeout: 120000,
    enableDecompilation: true,
    decompilationDepth: 'deep'
  }
};
