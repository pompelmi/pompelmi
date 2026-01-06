// src/scan/remote.ts
import { createRemoteEngine } from '../yara/remote';
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
export async function scanFilesWithRemoteYara(
  files: File[],
  rulesSource: string,
  remote: RemoteEngineOptions
): Promise<RemoteScanResult[]> {
  const engine = await createRemoteEngine(remote);
  const compiled = await engine.compile(rulesSource);

  const results: RemoteScanResult[] = [];
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const matches = await compiled.scan(bytes);
      results.push({ file, matches });
    } catch (err: any) {
      console.warn('[remote-yara] scan error for', file.name, err);
      results.push({ file, matches: [], error: String(err?.message ?? err) });
    }
  }
  return results;
}