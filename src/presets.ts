import type { Scanner, Match } from "./types";

export type PresetName = string;
export interface PresetOptions { [key: string]: unknown }

function toScanFn(s: Scanner): (input: any, ctx?: any) => Promise<Match[]> {
  return (typeof s === "function" ? s : s.scan) as (input: any, ctx?: any) => Promise<Match[]>;
}

export function composeScanners(...scanners: Scanner[]): Scanner {
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

export function createPresetScanner(_preset: PresetName, _opts: PresetOptions = {}): Scanner {
  // TODO: wire to real preset registry
  return async (_input: any, _ctx?: any) => {
    void _opts;
    return [] as Match[];
  };
}
