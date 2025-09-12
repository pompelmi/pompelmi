// src/types.ts
export type Severity = 'low' | 'medium' | 'high';

export type YaraMatch = {
  rule: string;
  tags?: string[];
  meta?: Record<string, string>;
};

export type Verdict = 'clean' | 'suspicious' | 'malicious';

export type ScanReport = {
  ok: boolean;                 // clean?
  verdict: Verdict;
  matches?: YaraMatch[];
  file?: { name?: string; mime?: string; size?: number; sha256?: string };
  durationMs: number;
  truncated?: boolean;         // hit maxBytes/limits
  timedOut?: boolean;          // hit timeoutMs
  engine?: 'yara' | 'regex' | 'multi';
};
export type Uint8ArrayLike = Uint8Array;


/** Minimal shape usata internamente dagli scanner */
export type Match = {
  id: string;
  name?: string;
  source?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  meta?: Record<string, unknown>;
};


/** Contratto di uno scanner: restituisce un array di Match (sync o async) */
export type Scanner = (
  bytes: Uint8Array,
  ctx?: { filename?: string; mimeType?: string; size?: number }
) => Promise<Match[]> | Match[];
