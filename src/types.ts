/** Severità standard per i match */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** Rilevazione generica prodotta da uno scanner (heuristics, YARA, zip, ecc.) */
export type Match = {
  rule: string;
  severity?: Severity;
  tags?: string[];
  meta?: Record<string, unknown>;
  /** quale motore l'ha prodotta, es: "yara" | "heuristics" | "zip" */
  source?: string;
};

/** Rilevazione in stile YARA (estende Match) */
export type YaraMatch = Match & {
  namespace?: string;
  description?: string;
};

/** Verdettto finale attribuito a file/entry */
export type Verdict = 'clean' | 'suspicious' | 'malicious';

/** Contesto facoltativo passato agli scanner */
export type ScanContext = {
  filename?: string;
  mimeType?: string;
  size?: number;
};

/** Firma di una funzione di scan */
export type ScanFn = (input: Uint8Array, ctx?: ScanContext) => Promise<Match[]> | Match[];

/** Contratto Scanner: funzione oppure oggetto { scan(...) } */
export type Scanner = ScanFn | { name?: string; scan: ScanFn };

/** Alias utile in alcuni guard */
export type Uint8ArrayLike = Uint8Array | ArrayBufferView;

/** Report usato nello stream/adapter */
export type ScanReport = {
  file?: { name?: string; mimeType?: string; size?: number };
  matches: YaraMatch[];
  verdict: Verdict;
  durationMs?: number;
  error?: string;
};
