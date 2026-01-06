/**
 * CommonHeuristicsScanner (no EICAR)
 * Lightweight, no-deps heuristics for common risky file patterns.
 * Returns matches as [{ rule, severity?, meta? }].
 */
export type HeuristicMatch = {
  rule: string;
  severity?: 'info' | 'suspicious' | 'malicious';
  meta?: Record<string, unknown>;
};

export interface SimpleScanner {
  scan(bytes: Uint8Array): Promise<HeuristicMatch[]>;
}

function hasAsciiToken(buf: Buffer, token: string): boolean {
  // Use latin1 so we can safely search binary
  return buf.indexOf(token, 0, 'latin1') !== -1;
}
function startsWith(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) if (buf[i] !== bytes[i]) return false;
  return true;
}

function isPDF(buf: Buffer): boolean {
  // %PDF-
  return startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d]);
}
function isOleCfb(buf: Buffer): boolean {
  // D0 CF 11 E0 A1 B1 1A E1
  const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
  return startsWith(buf, sig);
}
function isZipLike(buf: Buffer): boolean {
  // PK\x03\x04
  return startsWith(buf, [0x50, 0x4b, 0x03, 0x04]);
}
function isPeExecutable(buf: Buffer): boolean {
  // "MZ"
  return startsWith(buf, [0x4d, 0x5a]);
}

/** OOXML macro hint via filename token in ZIP container */
function hasOoxmlMacros(buf: Buffer): boolean {
  if (!isZipLike(buf)) return false;
  return hasAsciiToken(buf, 'vbaProject.bin');
}

/** PDF risky features (/JavaScript, /OpenAction, /AA, /Launch) */
function pdfRiskTokens(buf: Buffer): string[] {
  const tokens = ['/JavaScript', '/OpenAction', '/AA', '/Launch'];
  return tokens.filter(t => hasAsciiToken(buf, t));
}

export const CommonHeuristicsScanner: SimpleScanner = {
  async scan(input: Uint8Array) {
    const buf = Buffer.from(input);
    const matches: HeuristicMatch[] = [];

    // Office macros (OLE / OOXML)
    if (isOleCfb(buf)) {
      matches.push({ rule: 'office_ole_container', severity: 'suspicious' });
    }
    if (hasOoxmlMacros(buf)) {
      matches.push({ rule: 'office_ooxml_macros', severity: 'suspicious' });
    }

    // PDF risky tokens
    if (isPDF(buf)) {
      const toks = pdfRiskTokens(buf);
      if (toks.length) {
        matches.push({
          rule: 'pdf_risky_actions',
          severity: 'suspicious',
          meta: { tokens: toks }
        });
      }
    }

    // Executable header
    if (isPeExecutable(buf)) {
      matches.push({ rule: 'pe_executable_signature', severity: 'suspicious' });
    }

    return matches;
  }
};
