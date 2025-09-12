/** Shared types for Pompelmi */

export type Verdict = 'clean' | 'suspicious' | 'malicious';

export interface YaraMatch {
  rule: string;
  namespace?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface Match {
  rule: string;
  // usato da zip-bomb-guard ecc. Manteniamo anche 'suspicious' per compat.
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
  reasons: string[];
  file?: FileInfo;
  durationMs?: number;
  error?: string;
  ok: boolean; // true se verdict === 'clean'

  truncated?: boolean;}

export interface NormalScanReport extends BaseReport {}
export interface StreamScanReport extends BaseReport {}

export type ScanReport = NormalScanReport | StreamScanReport;

// alias usato da alcuni guard
export type Uint8ArrayLike = Uint8Array | ArrayBufferView;
