import { createPresetScanner, type PresetName } from './presets';
import type { Match, ScanContext, ScanReport, Verdict, YaraMatch } from './types';
import { PerformanceTracker } from './utils/performance-metrics';
import { detectPolyglot, detectObfuscatedScripts, analyzeNestedArchives } from './utils/advanced-detection';
import { getDefaultCache } from './utils/cache-manager';
import type { ScannerConfig } from './config';

/** Mappa veloce estensione -> mime (basic) */
function guessMimeByExt(name?: string): string | undefined {
  if (!name) return;
  const ext = name.toLowerCase().split('.').pop();
  switch (ext) {
    case 'zip': return 'application/zip';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    default: return;
  }
}

/** Heuristica semplice per verdetto */
function computeVerdict(matches: YaraMatch[]): Verdict {
  if (!matches.length) return 'clean';
  // se la regola contiene 'zip_' lo marchiamo "suspicious"
  const anyHigh = matches.some(m => (m.tags ?? []).includes('critical') || (m.tags ?? []).includes('high'));
  return anyHigh ? 'malicious' : 'suspicious';
}

/** Converte i Match (heuristics) in YaraMatch-like per uniformare l'output */
function toYaraMatches(ms: Match[]): YaraMatch[] {
  return ms.map(m => ({
    rule: m.rule,
    namespace: 'heuristics',
    tags: ['heuristics'].concat(m.severity ? [m.severity] : []),
    meta: m.meta,
  }));
}

export type ScanOptions = {
  preset?: PresetName;     // default: 'zip-basic'
  ctx?: ScanContext;       // filename/mime/size ecc.
  enableAdvancedDetection?: boolean; // Enable polyglot & obfuscation detection (default: true)
  enablePerformanceTracking?: boolean; // Track detailed performance metrics (default: false)
  enableCache?: boolean;   // Enable result caching (default: false)
  config?: Partial<ScannerConfig>; // Configuration overrides
};

/** Scan di bytes (browser/node) usando preset (default: zip-basic) */
export async function scanBytes(input: Uint8Array, opts: ScanOptions = {}): Promise<ScanReport> {
  // Check cache first if enabled
  if (opts.enableCache || opts.config?.performance?.enableCache) {
    const cache = getDefaultCache(opts.config?.performance?.cacheOptions);
    const cached = cache.get(input, opts.preset);
    if (cached) {
      return cached;
    }
  }

  const perfTracker = (opts.enablePerformanceTracking || opts.config?.performance?.enablePerformanceTracking) 
    ? new PerformanceTracker() 
    : null;
  perfTracker?.checkpoint('prep_start');
  
  const preset = opts.preset ?? opts.config?.defaultPreset ?? 'zip-basic';
  const ctx: ScanContext = {
    ...opts.ctx,
    mimeType: opts.ctx?.mimeType ?? guessMimeByExt(opts.ctx?.filename),
    size: opts.ctx?.size ?? input.byteLength,
  };

  perfTracker?.checkpoint('prep_end');
  perfTracker?.checkpoint('heuristics_start');

  const scanFn = createPresetScanner(preset);
  const matchesH = await (typeof (scanFn as any) === "function" ? (scanFn as any) : (scanFn as any).scan)(input, ctx);
  let allMatches = [...matchesH];

  perfTracker?.checkpoint('heuristics_end');

  // Advanced detection (enabled by default, can be overridden by config)
  const advancedEnabled = opts.enableAdvancedDetection ?? opts.config?.advanced?.enablePolyglotDetection ?? true;
  if (advancedEnabled) {
    perfTracker?.checkpoint('advanced_start');
    
    // Detect polyglot files
    if (opts.config?.advanced?.enablePolyglotDetection !== false) {
      const polyglotMatches = detectPolyglot(input);
      allMatches.push(...polyglotMatches);
    }

    // Detect obfuscated scripts
    if (opts.config?.advanced?.enableObfuscationDetection !== false) {
      const obfuscatedMatches = detectObfuscatedScripts(input);
      allMatches.push(...obfuscatedMatches);
    }

    // Check for excessive nesting in archives
    if (opts.config?.advanced?.enableNestedArchiveAnalysis !== false) {
      const nestingAnalysis = analyzeNestedArchives(input);
      const maxDepth = opts.config?.advanced?.maxArchiveDepth ?? 5;
      if (nestingAnalysis.hasExcessiveNesting || (nestingAnalysis.depth > maxDepth)) {
        allMatches.push({
          rule: 'excessive_archive_nesting',
          severity: 'high',
          meta: { 
            description: 'Excessive archive nesting detected',
            depth: nestingAnalysis.depth,
            maxAllowed: maxDepth,
          },
        });
      }
    }

    perfTracker?.checkpoint('advanced_end');
  }

  const matches = toYaraMatches(allMatches);
  const verdict = computeVerdict(matches);
  const t0 = perfTracker ? perfTracker.getDuration() : Date.now();
  const durationMs = perfTracker ? perfTracker.getDuration() : 0;

  const report: ScanReport = {
    ok: verdict === 'clean',
    verdict,
    matches,
    reasons: matches.map(m => m.rule),
    file: { name: ctx.filename, mimeType: ctx.mimeType, size: ctx.size },
    durationMs,
    engine: 'heuristics',
    truncated: false,
    timedOut: false,
  };

  // Add performance metrics if tracking enabled
  if (perfTracker && (opts.enablePerformanceTracking || opts.config?.performance?.enablePerformanceTracking)) {
    (report as any).performanceMetrics = perfTracker.getMetrics(input.byteLength);
  }

  // Cache result if enabled
  if (opts.enableCache || opts.config?.performance?.enableCache) {
    const cache = getDefaultCache(opts.config?.performance?.cacheOptions);
    cache.set(input, report, opts.preset);
  }

  // Invoke callbacks if configured
  opts.config?.callbacks?.onScanComplete?.(report);

  return report;
}

/** Scan di un file su disco (Node). Import dinamico per non vincolare il bundle browser. */
export async function scanFile(filePath: string, opts: Omit<ScanOptions, 'ctx'> = {}): Promise<ScanReport> {
  const [{ readFile, stat }, path] = await Promise.all([
    import('fs/promises'),
    import('path'),
  ]);

  const [buf, st] = await Promise.all([readFile(filePath), stat(filePath)]);
  const ctx: ScanContext = {
    filename: path.basename(filePath),
    mimeType: guessMimeByExt(filePath),
    size: st.size,
  };
  return scanBytes(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), { ...opts, ctx });
}

/** Scan multipli File (browser) usando scanBytes + preset di default */
export async function scanFiles(
  files: ArrayLike<File>,
  opts: Omit<ScanOptions, 'ctx'> = {}
): Promise<ScanReport[]> {
  const list = Array.from(files as ArrayLike<File>) as File[];
  const out: ScanReport[] = [];
  for (const f of list) {
    const buf = new Uint8Array(await f.arrayBuffer());
    const rep = await scanBytes(buf, {
      ...opts,
      ctx: { filename: f.name, mimeType: f.type || guessMimeByExt(f.name), size: f.size },
    });
    out.push(rep);
  }
  return out;
}
