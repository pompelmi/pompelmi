// src/yara/remote.ts
import type { YaraEngine, YaraCompiled, YaraMatch } from './index';

export interface RemoteEngineOptions {
  /** Endpoint HTTP POST che esegue la scansione YARA lato server */
  endpoint: string;
  /** Header extra (es. Authorization) */
  headers?: Record<string, string>;
  /**
   * Nome del campo per le regole nel payload.
   * Server-side, il campo corrispondente dovrà essere letto come stringa.
   */
  rulesField?: string; // default: "rules"
  /**
   * Nome del campo per i bytes del file nel payload.
   * Se il server accetta multipart/form-data, usare "file".
   */
  fileField?: string;  // default: "file"
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
export async function createRemoteEngine(opts: RemoteEngineOptions): Promise<YaraEngine> {
  const {
    endpoint,
    headers = {},
    rulesField = 'rules',
    fileField = 'file',
    mode = 'multipart',
  } = opts;

  const engine: YaraEngine = {
    async compile(rulesSource: string): Promise<YaraCompiled> {
      // Manteniamo in memoria le regole da inviare a ogni scan
      return {
        async scan(data: Uint8Array): Promise<YaraMatch[]> {
          let res: Response;

          if (mode === 'multipart') {
            const form = new FormData();
            form.set(rulesField, new Blob([rulesSource], { type: 'text/plain' }), 'rules.yar');
            form.set(fileField, new Blob([data], { type: 'application/octet-stream' }), 'sample.bin');

            res = await fetch(endpoint, {
              method: 'POST',
              body: form,
              headers, // attenzione: non impostare Content-Type manualmente in multipart
            });
          } else {
            // json-base64 (comodo per endpoint serverless)
            const b64 = base64FromBytes(data);
            res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ [rulesField]: rulesSource, [fileField]: b64 }),
            });
          }

          if (!res.ok) {
            throw new Error(`[remote-yara] HTTP ${res.status} ${res.statusText}`);
          }
          const json = await res.json();
          // normalizza in { rule, tags[] }
          const arr = Array.isArray(json) ? json : (json?.matches ?? []);
          return arr.map((m: any) => ({
            rule: m.rule ?? m.ruleIdentifier ?? 'unknown',
            tags: m.tags ?? [],
          }));
        },
      };
    },
  };

  return engine;
}

// Utils
function base64FromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  // btoa è disponibile in browser
  return btoa(bin);
}