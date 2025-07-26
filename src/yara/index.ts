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

export async function createYaraScannerFromRules(rulesSource: string) {
  const engine = await createYaraEngine();
  return engine.compile(rulesSource);
}

// aggiungi la possibilità di scansionare file (Node-only)
export interface YaraCompiled {
  scan(data: Uint8Array): Promise<YaraMatch[]>;
  scanFile?: (filePath: string) => Promise<YaraMatch[]>; // Node-only
}

export interface YaraEngine {
  compile(rulesSource: string): Promise<YaraCompiled>;
  compileFile?: (rulesPath: string) => Promise<YaraCompiled>; // Node-only
}

export async function createYaraScannerFromFile(rulesPath: string): Promise<YaraCompiled> {
  const engine = await createYaraEngine();
  if (!engine.compileFile) {
    throw new Error('YARA compileFile non disponibile in questo runtime (browser).');
  }
  return engine.compileFile(rulesPath);
}