import type { YaraMatch } from '../yara/index';
import type { RemoteEngineOptions } from '../yara/remote';
export interface RemoteScanResult {
    file: File;
    matches: YaraMatch[];
    error?: string;
}
/**
 * Scansiona una lista di File nel browser usando il motore remoto via HTTP.
 * Non richiede WASM né dipendenze native sul client.
 */
export declare function scanFilesWithRemoteYara(files: File[], rulesSource: string, remote: RemoteEngineOptions): Promise<RemoteScanResult[]>;
