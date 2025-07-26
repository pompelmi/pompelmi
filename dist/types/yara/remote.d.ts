import type { YaraEngine } from './index';
export interface RemoteEngineOptions {
    /** Endpoint HTTP POST che esegue la scansione YARA lato server */
    endpoint: string;
    /** Header extra (es. Authorization) */
    headers?: Record<string, string>;
    /**
     * Nome del campo per le regole nel payload.
     * Server-side, il campo corrispondente dovrà essere letto come stringa.
     */
    rulesField?: string;
    /**
     * Nome del campo per i bytes del file nel payload.
     * Se il server accetta multipart/form-data, usare "file".
     */
    fileField?: string;
    /**
     * Payload mode: "multipart" (default) o "json-base64".
     * Scegli in base a come implementeremo l'endpoint Node.
     */
    mode?: 'multipart' | 'json-base64';
}
/**
 * Engine YARA remoto: compila “logicamente” le regole e delega la scan al server via HTTP.
 * In browser NON richiede binari, brew/apt o WASM.
 */
export declare function createRemoteEngine(opts: RemoteEngineOptions): Promise<YaraEngine>;
