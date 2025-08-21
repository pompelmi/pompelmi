/**
 * ZipHeaderIntegrityScanner
 * - Flags:
 *   - LFH/CEN filename mismatch
 *   - Symlink (POSIX mode 0120000)
 *   - Path traversal (../, ..\, absolute, drive letters)
 *   - Backslashes in names
 *
 * Verdict:
 *   - malicious: traversal/absolute path
 *   - suspicious: symlink or LFH≠CEN mismatch
 */
function le16(dv: DataView, o: number) { return dv.getUint16(o, true); }
function le32(dv: DataView, o: number) { return dv.getUint32(o, true); }

function decodeAsciiOrUtf8(buf: Uint8Array) {
  // Heuristic decode; ZIP names are typically CP437/UTF-8. For heuristics, utf-8 fallback is ok.
  try { return new TextDecoder('utf-8').decode(buf); } catch { return new TextDecoder('latin1').decode(buf); }
}
function norm(name: string) {
  return name.replace(/\\/g, '/'); // normalize separators
}
function isTraversal(name: string) {
  const n = norm(name);
  if (n.startsWith('/')) return true;                 // absolute on unix
  if (/^[A-Za-z]:\//.test(n)) return true;            // windows drive
  if (n.split('/').some(seg => seg === '..')) return true;
  return false;
}

export const ZipHeaderIntegrityScanner = {
  name: 'zip-header-integrity',
  async scan(bytes: Uint8Array) {
    const b = bytes;
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const SIG_LFH = 0x04034b50; // PK\x03\x04
    const SIG_CEN = 0x02014b50; // PK\x01\x02

    const lfhNames: string[] = [];
    const cenNames: string[] = [];
    let hasSymlink = false;
    let hasTraversal = false;

    // Scan LFH entries (collect names)
    for (let i = 0; i + 30 <= b.length; ) {
      const sig = le32(dv, i);
      if (sig !== SIG_LFH) { i++; continue; }
      const nameLen  = le16(dv, i + 26);
      const extraLen = le16(dv, i + 28);
      const nameStart = i + 30;
      const nameEnd = nameStart + nameLen;
      if (nameEnd > b.length) { i++; continue; }
      const name = decodeAsciiOrUtf8(b.subarray(nameStart, nameEnd));
      lfhNames.push(name);
      if (isTraversal(name) || /\\/.test(name)) hasTraversal = true;

      // advance: jump past header + name + extra; do NOT rely on compSize (data descriptor flag may be set)
      i = nameEnd + extraLen;
    }

    // Scan CEN entries (collect names + symlink bit)
    for (let i = 0; i + 46 <= b.length; ) {
      const sig = le32(dv, i);
      if (sig !== SIG_CEN) { i++; continue; }
      const nameLen  = le16(dv, i + 28);
      const extraLen = le16(dv, i + 30);
      const commLen  = le16(dv, i + 32);
      const extAttr  = le32(dv, i + 38);     // external file attributes
      const nameStart = i + 46;
      const nameEnd = nameStart + nameLen;
      if (nameEnd > b.length) { i++; continue; }
      const name = decodeAsciiOrUtf8(b.subarray(nameStart, nameEnd));
      cenNames.push(name);
      if (isTraversal(name) || /\\/.test(name)) hasTraversal = true;

      // POSIX mode is in the high 16 bits when "made by" is Unix; detect symlink 0120000
      const posixMode = (extAttr >>> 16) & 0xffff;
      if ((posixMode & 0o170000) === 0o120000) hasSymlink = true;

      // advance: 46 + name + extra + comment
      i = nameEnd + extraLen + commLen;
    }

    // Compare sets (ignore ordering & case sensitivity is preserved in ZIP; we compare exact strings)
    const setEq = (a: string[], c: string[]) => {
      if (a.length !== c.length) return false;
      const A = new Map<string, number>();
      for (const s of a) A.set(s, (A.get(s) ?? 0) + 1);
      for (const s of c) {
        const v = A.get(s); if (!v) return false; A.set(s, v - 1);
      }
      return Array.from(A.values()).every(v => v === 0);
    };
    const mismatch = lfhNames.length > 0 && cenNames.length > 0 && !setEq(lfhNames, cenNames);

    if (hasTraversal) {
      return {
        verdict: 'malicious',
        tags: ['zip','path-traversal'],
        reason: 'ZIP contains absolute/backslash or traversal path (../ or similar)'
      } as const;
    }
    if (hasSymlink || mismatch) {
      const details = [
        hasSymlink ? 'symlink entry' : null,
        mismatch ? 'LFH≠CEN filename mismatch' : null
      ].filter(Boolean).join(', ');
      return {
        verdict: 'suspicious',
        tags: ['zip','header-integrity'],
        reason: details
      } as const;
    }
    return { verdict: 'clean', tags: ['zip'], reason: '' } as const;
  }
};
