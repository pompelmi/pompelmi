import type { YaraMatch } from '../yara/index';
export interface NodeScanOptions {
    enableYara?: boolean;
    yaraRules?: string;
    yaraRulesPath?: string;
    includeExtensions?: string[];
    yaraAsync?: boolean;
    maxFileSizeBytes?: number;
    yaraSampleBytes?: number;
    yaraPreferBuffer?: boolean;
}
export interface NodeYaraResult {
    matches: YaraMatch[];
    status: 'scanned' | 'skipped' | 'error';
    /** per i 'skipped', perché abbiamo saltato */
    reason?: 'max-size' | 'filtered-ext' | 'not-enabled' | 'engine-missing' | 'error';
    /** come abbiamo scansionato quando status = 'scanned' */
    mode?: 'async' | 'file' | 'buffer' | 'buffer-sampled';
}
export interface NodeFileEntry {
    path: string;
    absPath: string;
    isDir: boolean;
    yara?: NodeYaraResult;
}
/** Scansiona una directory in modo ricorsivo, emettendo le entry e (opzionale) i match YARA. */
export declare function scanDir(root: string, opts?: NodeScanOptions): AsyncGenerator<NodeFileEntry>;
