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
export declare function createYaraEngine(): Promise<YaraEngine>;
export declare function createYaraScannerFromRules(rulesSource: string): Promise<YaraCompiled>;
export interface YaraCompiled {
    scan(data: Uint8Array): Promise<YaraMatch[]>;
    scanFile?: (filePath: string) => Promise<YaraMatch[]>;
}
export interface YaraEngine {
    compile(rulesSource: string): Promise<YaraCompiled>;
    compileFile?: (rulesPath: string) => Promise<YaraCompiled>;
}
export declare function createYaraScannerFromFile(rulesPath: string): Promise<YaraCompiled>;
