/**
 * PolyglotMagicScanner — detects multiple distinct magic headers in the same blob.
 * Not perfect, but useful for quick triage.
 */
type Magic = {name:string; bytes:number[]};
const MAGICS: Magic[] = [
  { name:'pdf',  bytes:[0x25,0x50,0x44,0x46] },             // %PDF
  { name:'zip',  bytes:[0x50,0x4b,0x03,0x04] },             // PK..
  { name:'png',  bytes:[0x89,0x50,0x4e,0x47] },             // \x89PNG
  { name:'jpg',  bytes:[0xff,0xd8,0xff] },                  // JFIF
  { name:'gif',  bytes:[0x47,0x49,0x46,0x38] },             // GIF8
  { name:'bmp',  bytes:[0x42,0x4d] },                       // BM
  { name:'svg',  bytes:[0x3c,0x73,0x76,0x67] },             // "<svg" (rough)
  { name:'exe',  bytes:[0x4d,0x5a] },                       // MZ
];
function hasMagic(buf: Uint8Array, sig:number[]): boolean {
  for (let i=0;i+sig.length<=buf.length && i<65536;i++) {
    let ok=true; for (let j=0;j<sig.length;j++){ if (buf[i+j]!==sig[j]){ ok=false; break; } }
    if (ok) return true;
  }
  return false;
}
export const PolyglotMagicScanner = {
  name: 'polyglot-magic',
  async scan(bytes: Uint8Array) {
    const hits = MAGICS.filter(m => hasMagic(bytes, m.bytes)).map(m=>m.name);
    const uniq = Array.from(new Set(hits));
    if (uniq.length >= 2) {
      return {
        verdict: 'suspicious',
        tags: ['polyglot', ...uniq],
        reason: `Multiple file signatures detected: ${uniq.join(', ')}`
      } as const;
    }
    return { verdict: 'clean', tags: [], reason: '' } as const;
  }
};
