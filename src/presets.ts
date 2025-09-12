import { createZipBombGuard } from './scanners/zip-bomb-guard';
import type { Match, ScanFn, Scanner, ScanContext } from './types';

/** Risolve uno Scanner (fn o oggetto con .scan) in una funzione */
function asScanFn(s: Scanner): ScanFn {
  return typeof s === 'function' ? s : s.scan;
}

/** Composizione sequenziale: concatena tutti i match degli scanner */
export function composeScanners(scanners: Scanner[]): ScanFn {
  return async (input: Uint8Array, ctx?: ScanContext): Promise<Match[]> => {
    const out: Match[] = [];
    for (const s of scanners) {
      const res = await Promise.resolve(asScanFn(s)(input, ctx));
      if (Array.isArray(res) && res.length) out.push(...res);
    }
    return out;
  };
}

export type PresetName = 'zip-basic';
export type PresetOptions = {
  /** Futuri flags (placeholder) */
  zip?: { /* es: maxEntries?: number; maxCompressionRatio?: number */ };
};

/** Ritorna uno ScanFn pronto all'uso, oggi con zip-bomb guard */
export function createPresetScanner(_name: PresetName = 'zip-basic', _opts: PresetOptions = {}): ScanFn {
  // Al momento un solo preset "zip-basic"
  const scanners: Scanner[] = [
    createZipBombGuard(), // usa i default interni
  ];
  return composeScanners(scanners);
}
