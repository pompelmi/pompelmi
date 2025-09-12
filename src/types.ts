/** Tipi condivisi per gli scanner */

export type Uint8ArrayLike = Uint8Array;

export type Severity = 'low' | 'medium' | 'high' | 'critical' | 'suspicious';

export type Match = {
  /** Regola/etichetta che ha prodotto il match (es: 'zip_eocd_not_found') */
  rule: string;
  /** Nome/ID dello scanner o sorgente (opzionale) */
  source?: string;
  /** Severità del match */
  severity?: Severity;
  /** Metadati aggiuntivi (liberi) */
  meta?: Record<string, unknown>;
};

export type ScanContext = {
  filename?: string;
  mimeType?: string;
  size?: number;
};

/** Firma della funzione di scansione */
export type ScanFn = (input: Uint8Array, ctx?: ScanContext) => Promise<Match[]> | Match[];

/**
 * Uno scanner può essere:
 * - una funzione (ScanFn)
 * - un oggetto con metodo scan(...)
 */
export type Scanner = ScanFn | { name?: string; scan: ScanFn };
