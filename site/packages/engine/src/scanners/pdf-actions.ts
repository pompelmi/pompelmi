/**
 * PdfActionScanner — flags PDFs with auto-actions, JS, or embedded files.
 */
function containsCI(hay: Uint8Array, needleAscii: string): boolean {
  const n = new TextDecoder('latin1').decode(hay.slice(0, Math.min(hay.length, 1_000_000)));
  return n.toLowerCase().includes(needleAscii.toLowerCase());
}
export const PdfActionScanner = {
  name: 'pdf-actions',
  async scan(bytes: Uint8Array) {
    // Quick PDF signature
    const isPdf = bytes[0]===0x25 && bytes[1]===0x50 && bytes[2]===0x44 && bytes[3]===0x46; // %PDF
    if (!isPdf) return { verdict: 'clean', tags: [], reason: '' } as const;

    const bad = [
      ['/OpenAction','auto-open action'],
      ['/AA','additional-actions'],
      ['/JS','embedded JavaScript'],
      ['/JavaScript','embedded JavaScript'],
      ['/EmbeddedFile','embedded file']
    ].filter(([kw]) => containsCI(bytes, String(kw)));

    if (bad.length) {
      return {
        verdict: 'suspicious',
        tags: ['pdf','active-content', ...bad.map(([,t])=>t)],
        reason: `PDF contains risky entries: ${bad.map(([k])=>k).join(', ')}`
      } as const;
    }
    return { verdict: 'clean', tags: ['pdf'], reason: '' } as const;
  }
};
