export type YaraMatch = { rule: string; tags?: string[]; meta?: Record<string, unknown> };
export interface PompelmiScanner { scan(bytes: Uint8Array): Promise<YaraMatch[]>; }

export * from './scan.js';
export { isMalware } from './isMalware.js';


/**
 * Optional YARA: this placeholder throws until the YARA engine package is provided.
 * For now, pass a `scanner` object to adapters instead of `rules`.
 */
export async function createYaraScannerFromRules(_rules: string): Promise<PompelmiScanner> {
  throw new Error("YARA engine not bundled in 'pompelmi' core (yet). Pass `scanner` to adapters or install the YARA add-on.");
}

/** Minimal stub for a remote engine API (browser usage) */
export async function createRemoteEngine(_opts?: Record<string, unknown>) {
  return {
    async compile(_rules: string) {
      return { async scan(_bytes: Uint8Array): Promise<YaraMatch[]> { return []; } };
    }
  };
}

export const version = "0.11.3";



