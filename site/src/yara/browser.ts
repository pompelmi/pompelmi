// src/yara/browser.ts
import type { YaraEngine, YaraCompiled, YaraMatch } from './index';

/**
 * Engine YARA lato browser — NO WASM.
 * È un no-op sicuro: non produce match e non richiede dipendenze native.
 * Se vuoi YARA in browser senza WASM, userai un adapter remoto (vedi step successivo).
 */
export async function createBrowserEngine(): Promise<YaraEngine> {
  console.warn('[yara] Browser engine: YARA disabilitato (no WASM).');
  return {
    async compile(_rulesSource: string): Promise<YaraCompiled> {
      return {
        async scan(_data: Uint8Array): Promise<YaraMatch[]> {
          return []; // nessun match lato browser
        }
      };
    }
  };
}