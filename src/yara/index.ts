export interface YaraMatch {
  rule: string;
  tags?: string[];
}

export interface YaraCompiled {
  scan(data: Uint8Array): Promise<YaraMatch[]>;
}

export interface YaraEngine {
  compile(rulesSource: string): Promise<YaraCompiled>;
}

// Factory: sceglie l'engine a runtime (Node o Browser)
// (Per ora i moduli chiamati lanceranno "non implementato")
export async function createYaraEngine(): Promise<YaraEngine> {
  const isNode = typeof process !== 'undefined' && !!(process as any).versions?.node;
  if (isNode) {
    const { createNodeEngine } = await import('./node');
    return createNodeEngine() as unknown as YaraEngine;
  } else {
    const { createBrowserEngine } = await import('./browser');
    return createBrowserEngine() as unknown as YaraEngine;
  }
}