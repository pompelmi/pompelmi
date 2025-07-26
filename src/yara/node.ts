// src/yara/node.ts
import type { YaraEngine, YaraCompiled, YaraMatch } from './index';

// Mappa il formato dei match ritornati da @litko/yara-x al tuo tipo YaraMatch
function normalizeMatches(matches: any[]): YaraMatch[] {
  return (matches ?? []).map((m) => ({
    rule: m.ruleIdentifier ?? m.rule ?? 'unknown',
    tags: m.tags ?? [],
  }));
}

export async function createNodeEngine(): Promise<YaraEngine> {
  // Import dinamico per evitare che i bundler browser risolvano il modulo
  const yarax = await import('@litko/yara-x');

  return {
    async compile(rulesSource: string): Promise<YaraCompiled> {
      // Compila le regole da stringa
      const rules = yarax.compile(rulesSource);

      return {
        async scan(data: Uint8Array): Promise<YaraMatch[]> {
          // Per Node abbiamo già un Buffer disponibile
          const buf = Buffer.isBuffer(data) ? (data as Buffer) : Buffer.from(data);
          const matches = rules.scan(buf); // sincrono e veloce
          return normalizeMatches(matches);
        },
      };
    },
  };
}