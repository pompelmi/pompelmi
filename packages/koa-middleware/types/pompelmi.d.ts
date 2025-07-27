declare module 'pompelmi' {
  export type YaraMatch = { rule: string; tags?: string[]; meta?: Record<string, unknown>; };
  export interface PompelmiScanner { scan(bytes: Uint8Array): Promise<YaraMatch[]>; }
  export function createYaraScannerFromRules(rules: string): Promise<PompelmiScanner>;
}