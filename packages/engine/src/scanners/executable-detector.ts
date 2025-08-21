/**
 * ExecutableDetector — flags PE/ELF/Mach-O by magic bytes.
 * Contract: ({ scan(bytes) }) -> { verdict, tags, reason }
 */
export const ExecutableDetector = {
  name: 'executable',
  async scan(bytes: Uint8Array) {
    const b = bytes;
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const u32 = (o:number)=> (o+4<=b.byteLength? dv.getUint32(o,false):0);

    const isMZ   = b[0]===0x4d && b[1]===0x5a; // "MZ"
    const isELF  = b[0]===0x7f && b[1]===0x45 && b[2]===0x4c && b[3]===0x46; // "\x7FELF"
    const MACHO_BE_32 = 0xFEEDFACE, MACHO_BE_64 = 0xFEEDFACF, MACHO_LE_64 = 0xCFFAEDFE;
    const isMachO = [MACHO_BE_32, MACHO_BE_64, MACHO_LE_64].includes(u32(0));

    if (isMZ || isELF || isMachO) {
      return {
        verdict: 'malicious',
        tags: ['binary','executable'],
        reason: 'Executable magic detected (PE/ELF/Mach-O)'
      } as const;
    }
    return { verdict: 'clean', tags: [], reason: '' } as const;
  }
};
