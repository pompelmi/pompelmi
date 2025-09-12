/** Tipi condivisi per Pompelmi */

export type Uint8ArrayLike = Uint8Array;

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Match = {
  /** Regola/etichetta che ha prodotto il match (es: 'zip_eocd_not_found') */
  rule: string;
  /** Severità del match (non confondere con il verdetto finale) */
  severity?: Severity;
  /** Tag opzionali (usati in verdict.ts) */
  tags?: string[];
  /** Metadati addizionali */
  meta?: Record<string, unknown>;
  /** Origine dello scanner, es: "yara" | "heuristics" | "zip" */
  source?: string;
};

export type YaraMatch = Match & {
  namespace?: string;
  description?: string;
};

export type Verdict = 'clean' | 'suspicious' | 'malicious';

export type ScanContext = {
  filename?: string;
  mimeType?: string;
  size?: number;
};

export type ScanFn = (input: Uint8Array, ctx?: ScanContext) => Promise<Match[]> | Match[];

/** Uno scanner può essere una funzione o un oggetto con metodo scan(...) */
export type Scanner = ScanFn | { name?: string; scan: ScanFn };

/** Report aggregato (usato in stream.ts) */
export type ScanReport = {
  file?: { name?: string; mimeType?: string; size?: number; sha256?: string };
  matches: YaraMatch[];
  verdict: Verdict;
  ok?: boolean;          // true se verdict === "clean"
  durationMs?: number;
  error?: string;
};

  matches: YaraMatch[];
  verdict: Verdict;
  durationMs?: number;
  error?: string;
};
