import { createPresetScanner, type PresetName } from './presets';
import type { Match, ScanContext, ScanReport, Verdict, YaraMatch } from './types';

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
};

/** Scan di bytes (browser/node) usando preset (default: zip-basic) */
export async function scanBytes(input: Uint8Array, opts: ScanOptions = {}): Promise<ScanReport> {
  const t0 = Date.now();
  const preset = opts.preset ?? 'zip-basic';
  const ctx: ScanContext = {
    ...opts.ctx,
    mimeType: opts.ctx?.mimeType ?? guessMimeByExt(opts.ctx?.filename),
    size: opts.ctx?.size ?? input.byteLength,
  };

  const scanFn = createPresetScanner(preset);
  const matchesH = await scanFn(input, ctx);
  const matches = toYaraMatches(matchesH);

  const verdict = computeVerdict(matches);
  const durationMs = Date.now() - t0;

  return {
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
