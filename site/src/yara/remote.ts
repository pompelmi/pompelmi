// src/yara/remote.ts
import type { YaraEngine, YaraCompiled, YaraMatch } from './index';

export interface RemoteEngineOptions {
  endpoint: string;                 // es. '/api/yara/scan'
  headers?: Record<string, string>; // es. Authorization
  rulesField?: string;              // default: 'rules'
  fileField?: string;               // default: 'file'
  mode?: 'multipart' | 'json-base64'; // default: 'multipart'
  rulesAsBase64?: boolean; // se true e mode='json-base64', invia 'rulesB64'
}

export async function createRemoteEngine(opts: RemoteEngineOptions): Promise<YaraEngine> {
  const {
    endpoint,
    headers = {},
    rulesField = 'rules',
    fileField = 'file',
    mode = 'multipart',
    rulesAsBase64 = false,
  } = opts;

  const engine: YaraEngine = {
    async compile(rulesSource: string): Promise<YaraCompiled> {
      return {
        async scan(data: Uint8Array): Promise<YaraMatch[]> {
          const fetchFn = (globalThis as any).fetch as typeof fetch | undefined;
          if (!fetchFn) throw new Error('[remote-yara] fetch non disponibile in questo ambiente');

          let res: Response;

          if (mode === 'multipart') {
            const FormDataCtor = (globalThis as any).FormData;
            const BlobCtor = (globalThis as any).Blob;
            if (!FormDataCtor || !BlobCtor) {
              throw new Error('[remote-yara] FormData/Blob non disponibili (usa json-base64 oppure esegui in browser)');
            }
            const form = new FormDataCtor();
            form.set(rulesField, new BlobCtor([rulesSource], { type: 'text/plain' }), 'rules.yar');
            form.set(fileField, new BlobCtor([data], { type: 'application/octet-stream' }), 'sample.bin');

            res = await fetchFn(endpoint, { method: 'POST', body: form as any, headers });
          } else {
            const b64 = base64FromBytes(data);
            const payload: any = { [fileField]: b64 };
            if (rulesAsBase64) {
              payload['rulesB64'] = base64FromString(rulesSource);
            } else {
              payload[rulesField] = rulesSource;
            }
            res = await fetchFn(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify(payload),
            });
          }

          if (!res.ok) {
            throw new Error(`[remote-yara] HTTP ${res.status} ${res.statusText}`);
          }
          const json = await res.json().catch(() => null);
          const arr = Array.isArray(json) ? json : (json?.matches ?? []);
          return (arr ?? []).map((m: any) => ({
            rule: m.rule ?? m.ruleIdentifier ?? 'unknown',
            tags: m.tags ?? [],
          })) as YaraMatch[];
        },
      };
    },
  };

  return engine;
}

// Helpers
function base64FromBytes(bytes: Uint8Array): string {
  // usa btoa se disponibile (browser); altrimenti fallback manuale
  const btoaFn = (globalThis as any).btoa as ((s: string) => string) | undefined;
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoaFn ? btoaFn(bin) : Buffer.from(bin, 'binary').toString('base64');
}

function base64FromString(s: string): string {
  const btoaFn = (globalThis as any).btoa as ((s: string) => string) | undefined;
  return btoaFn ? btoaFn(s) : Buffer.from(s, 'utf8').toString('base64');
}