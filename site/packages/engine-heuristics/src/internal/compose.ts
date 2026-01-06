export type Match = { rule: string; severity?: 'low'|'medium'|'high'; meta?: Record<string, any> };
export type AnyScanner = { scan(bytes: Uint8Array): Promise<Match[]|{rule:string}[]> };

export function composeScanners(scanners: AnyScanner[]): AnyScanner {
  return {
    async scan(bytes: Uint8Array) {
      const results = await Promise.allSettled(scanners.map(s => s.scan(bytes)));
      const merged: Match[] = [];
      for (const r of results) if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const m of r.value) merged.push(m as Match);
      }
      return merged;
    }
  };
}
