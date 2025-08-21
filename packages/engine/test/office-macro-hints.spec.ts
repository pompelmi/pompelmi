import { describe, it, expect } from 'vitest';
import { OfficeMacroHintsScanner } from '../src/scanners/office-macro-hints';

function enc(s: string) { return new TextEncoder().encode(s); }
function u8(...n: number[]) { return new Uint8Array(n); }

// Helpers per costruire ZIP minimi con CEN (basta per le nostre euristiche)
function lfh(name: string) {
  const sig = u8(0x50,0x4b,0x03,0x04);
  const header = new Uint8Array(26);
  const nameBytes = enc(name);
  const lens = new Uint8Array(4);
  new DataView(lens.buffer).setUint16(0, nameBytes.length, true);
  new DataView(lens.buffer).setUint16(2, 0, true);
  return new Uint8Array([...sig, ...header, ...lens, ...nameBytes]);
}
function cen(name: string) {
  const sig = u8(0x50,0x4b,0x01,0x02);
  const header = new Uint8Array(42);
  const lens = new Uint8Array(6);
  const nameBytes = enc(name);
  new DataView(lens.buffer).setUint16(0, nameBytes.length, true);
  new DataView(lens.buffer).setUint16(2, 0, true);
  new DataView(lens.buffer).setUint16(4, 0, true);
  return new Uint8Array([...sig, ...header, ...lens, ...nameBytes]);
}

async function run(bufs: Uint8Array[]) {
  const total = bufs.reduce((a,b)=>a+b.length,0);
  const out = new Uint8Array(total);
  let off=0; for (const b of bufs){ out.set(b, off); off+=b.length; }
  return OfficeMacroHintsScanner.scan(out);
}

describe('OfficeMacroHintsScanner', () => {
  it('clean for non-zip', async () => {
    const res = await OfficeMacroHintsScanner.scan(enc('hello'));
    expect(res.verdict).toBe('clean');
  });

  it('clean for OOXML without macro hints', async () => {
    const res = await run([
      lfh('[Content_Types].xml'), cen('[Content_Types].xml'),
      lfh('xl/workbook.xml'), cen('xl/workbook.xml'),
      lfh('xl/worksheets/sheet1.xml'), cen('xl/worksheets/sheet1.xml'),
    ]);
    expect(res.verdict).toBe('clean');
  });

  it('suspicious when vbaProject.bin present', async () => {
    const res = await run([
      lfh('[Content_Types].xml'), cen('[Content_Types].xml'),
      lfh('xl/workbook.xml'), cen('xl/workbook.xml'),
      lfh('xl/vbaProject.bin'), cen('xl/vbaProject.bin'),
    ]);
    expect(res.verdict).toBe('suspicious');
    expect(res.tags).toContain('macro-hints');
  });

  it('suspicious when macrosheets present', async () => {
    const res = await run([
      lfh('[Content_Types].xml'), cen('[Content_Types].xml'),
      lfh('xl/macrosheets/sheet1.xml'), cen('xl/macrosheets/sheet1.xml'),
    ]);
    expect(res.verdict).toBe('suspicious');
  });
});
