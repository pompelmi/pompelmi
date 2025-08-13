// src/risk.ts
import { sniff, hasSuspiciousJpegTrailer } from './magic';

export type Severity = 'clean'|'suspicious'|'malicious';
export type Match = { rule: string; meta?: Record<string, any> };
export type Verdict = { severity: Severity; reasons: string[]; matches: Match[]; mime?: string };

export type Policy = {
  includeExtensions: string[];
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  denyScriptableSvg?: boolean;
};

export function prefilter(bytes: Uint8Array, origName: string, policy: Policy): Verdict {
  const reasons: string[] = [];
  const ext = (origName.split('.').pop() ?? '').toLowerCase();

  if (!policy.includeExtensions.includes(ext)) reasons.push(`ext_denied:${ext}`);

  const s = sniff(bytes);
  if (s && !policy.allowedMimeTypes.includes(s.mime)) reasons.push(`mime_denied:${s.mime}`);
  if (!s) reasons.push('mime_unknown');

  if (s?.extHint && ext && s.extHint !== ext) reasons.push(`ext_mismatch:${ext}->${s.extHint}`);

  if (s?.mime === 'image/jpeg' && hasSuspiciousJpegTrailer(bytes)) reasons.push('jpeg_trailer_payload');

  if (s?.mime === 'image/svg+xml' && policy.denyScriptableSvg !== false) {
    const text = Buffer.from(bytes).toString('utf8').toLowerCase();
    if (text.includes('<script') || text.includes('onload=') || text.includes('href="javascript:')) {
      reasons.push('svg_script');
    }
  }

  const sev: Severity = reasons.length ? 'suspicious' : 'clean';
  return { severity: sev, reasons, matches: [], mime: s?.mime };
}