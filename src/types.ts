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