import type { YaraEngine } from './index';
export interface RemoteEngineOptions {
    endpoint: string;
    headers?: Record<string, string>;
    rulesField?: string;
    fileField?: string;
    mode?: 'multipart' | 'json-base64';
}
export declare function createRemoteEngine(opts: RemoteEngineOptions): Promise<YaraEngine>;
