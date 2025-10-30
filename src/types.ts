/** Shared types for Pompelmi */

export type Verdict = 'clean' | 'suspicious' | 'malicious';

export interface YaraMatch {
  rule: string;
  namespace?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

// Re-export decompilation types
export * from './types/decompilation';

// Re-export HIPAA compliance types
export * from './hipaa-compliance';

export interface Match {
  rule: string;
  // used by zip-bomb-guard etc. We also keep 'suspicious' for compatibility.
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'suspicious';
  meta?: Record<string, unknown>;
}

export interface FileInfo {
  name?: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
}

export type ScanContext = {
  filename?: string;
  mimeType?: string;
  size?: number;
};

export type ScanFn = (input: Uint8Array, ctx?: ScanContext) => Promise<Match[]> | Match[];
export type Scanner = ScanFn | { name?: string; scan: ScanFn };

interface BaseReport {
  verdict: Verdict;
  matches: YaraMatch[];
  reasons?: string[];
  file?: FileInfo;
  durationMs?: number;
  error?: string;
  ok: boolean; // true if verdict === 'clean'

  truncated?: boolean;
  timedOut?: boolean;
  engine?: string;}

export interface NormalScanReport extends BaseReport {}
export interface StreamScanReport extends BaseReport {}

export type ScanReport = NormalScanReport | StreamScanReport;

// alias used by some guards
export type Uint8ArrayLike = Uint8Array | ArrayBufferView;
