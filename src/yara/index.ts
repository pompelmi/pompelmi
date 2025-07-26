export interface YaraMatch {
  rule: string;
  tags?: string[];
}

export interface YaraCompiled {
  scan(data: Uint8Array): Promise<YaraMatch[]>;
  scanFile?: (filePath: string) => Promise<YaraMatch[]>; // Node-only (optional)
  scanFileAsync?: (filePath: string) => Promise<YaraMatch[]>; // Node-only (optional)
}

export interface YaraEngine {
  compile(rulesSource: string): Promise<YaraCompiled>;
  compileFile?: (rulesPath: string) => Promise<YaraCompiled>; // Node-only (optional)
}

// Factory: sceglie l'engine a runtime (Node o Browser)
// (Per ora i moduli chiamati lanceranno "non implementato")
export async function createYaraEngine(): Promise<YaraEngine> {
  const isNode = typeof process !== 'undefined' && !!(process as any).versions?.node;
  const target = isNode ? 'node' : 'browser';
  const mod: any = await import(`./${target}`);
  return isNode
    ? (mod.createNodeEngine() as YaraEngine)
    : (mod.createBrowserEngine() as YaraEngine);
}

export async function createYaraScannerFromRules(rulesSource: string) {
  const engine = await createYaraEngine();
  return engine.compile(rulesSource);
}


export async function createYaraScannerFromFile(rulesPath: string): Promise<YaraCompiled> {
  const engine = await createYaraEngine();
  if (!engine.compileFile) {
    throw new Error('YARA compileFile non disponibile in questo runtime (browser).');
  }
  return engine.compileFile(rulesPath);
}

export { createRemoteEngine } from './remote';