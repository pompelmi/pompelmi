import type { YaraEngine, YaraCompiled, YaraMatch } from './index';

function normalizeMatches(matches: any[]): YaraMatch[] {
  return (matches ?? []).map((m) => ({
    rule: m.ruleIdentifier ?? m.rule ?? 'unknown',
    tags: m.tags ?? [],
  }));
}

export async function createNodeEngine(): Promise<YaraEngine> {
  const yarax = await import('@litko/yara-x'); // { compile, fromFile, ... }

  return {
    async compile(rulesSource: string): Promise<YaraCompiled> {
      const rules = yarax.compile(rulesSource);
      return {
        async scan(data: Uint8Array): Promise<YaraMatch[]> {
          const buf = Buffer.isBuffer(data) ? (data as Buffer) : Buffer.from(data);
          return normalizeMatches(rules.scan(buf));
        },
        async scanFile(filePath: string): Promise<YaraMatch[]> {
          return normalizeMatches(rules.scanFile(filePath));
        },
      };
    },

    async compileFile(rulesPath: string): Promise<YaraCompiled> {
      const rules = yarax.fromFile(rulesPath);
      return {
        async scan(data: Uint8Array): Promise<YaraMatch[]> {
          const buf = Buffer.isBuffer(data) ? (data as Buffer) : Buffer.from(data);
          return normalizeMatches(rules.scan(buf));
        },
        async scanFile(filePath: string): Promise<YaraMatch[]> {
          return normalizeMatches(rules.scanFile(filePath));
        },
      };
    },
  };
}