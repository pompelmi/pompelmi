// Tipi minimi per usare pompelmi nel middleware.
// Quando il pacchetto "pompelmi" esporrà tipi ufficiali, potremo rimuovere questo file.
declare module 'pompelmi' {
  export type YaraMatch = {
    rule: string;
    tags?: string[];
    meta?: Record<string, unknown>;
  };

  export interface PompelmiScanner {
    scan(bytes: Uint8Array): Promise<YaraMatch[]>;
  }

  /** Compila le regole YARA e restituisce uno scanner con .scan() */
  export function createYaraScannerFromRules(rules: string): Promise<PompelmiScanner>;
}