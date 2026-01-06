// src/yara/node.ts
import type { YaraEngine, YaraCompiled, YaraMatch } from './index';

function normalizeMatches(matches: any[]): YaraMatch[] {
  return (matches ?? []).map((m) => ({
    rule: m.ruleIdentifier ?? m.rule ?? 'unknown',
    tags: m.tags ?? [],
  }));
}

export async function createNodeEngine(): Promise<YaraEngine> {
  const yarax = await import('@litko/yara-x'); // { compile, fromFile, ... }

  function wrapRules(rules: any): YaraCompiled {
    return {
      async scan(data: Uint8Array): Promise<YaraMatch[]> {
        const buf = Buffer.isBuffer(data) ? (data as Buffer) : Buffer.from(data);
        return normalizeMatches(rules.scan(buf));
      },
      async scanFile(filePath: string): Promise<YaraMatch[]> {
        return normalizeMatches(rules.scanFile(filePath));
      },
      // 👇 opzionale/feature: usa l’API async se presente
      async scanFileAsync(filePath: string): Promise<YaraMatch[]> {
        if (typeof rules.scanFileAsync === 'function') {
          const res = await rules.scanFileAsync(filePath);
          return normalizeMatches(res);
        }
        // fallback se non disponibile
        return normalizeMatches(rules.scanFile(filePath));
      },
    } as unknown as YaraCompiled;
  }

  return {
    async compile(rulesSource: string): Promise<YaraCompiled> {
      const rules = yarax.compile(rulesSource);
      return wrapRules(rules);
    },

    async compileFile(rulesPath: string): Promise<YaraCompiled> {
      const rules = yarax.fromFile(rulesPath);
      return wrapRules(rules);
    },
  };
}