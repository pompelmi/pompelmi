import { describe, it, expect } from 'vitest';
import { ZipHeaderIntegrityScanner } from '../src/scanners/zip-header-integrity';

function u8(...nums: number[]) { return new Uint8Array(nums); }
function enc(s: string) { return new TextEncoder().encode(s); }

// Build minimal fake ZIP pieces
function lfh(name: string) {
  // PK\x03\x04 + header (30 bytes) then name
  const sig = u8(0x50,0x4b,0x03,0x04);
  const header = new Uint8Array(26); // version..uncomp size fields we don't care
  const nameBytes = enc(name);
  const lens = new Uint8Array(4); // fnameLen, extraLen
  const dv = new DataView(lens.buffer);
  dv.setUint16(0, nameBytes.length, true);
  dv.setUint16(2, 0, true);
  return new Uint8Array([...sig, ...header, ...lens, ...nameBytes]);
}
function cen(name: string, posixModeOct?: number) {
  const sig = u8(0x50,0x4b,0x01,0x02);
  const header = new Uint8Array(42); // up to ext attrs
  const lens = new Uint8Array(6); // nameLen, extraLen, commentLen
  const nameBytes = enc(name);
  const dvh = new DataView(header.buffer);
  // external attrs at offset 38..41 (little-endian). Put posix mode in high 16 bits.
  if (posixModeOct != null) {
    const ext = ((posixModeOct & 0xFFFF) << 16) >>> 0;
    new DataView(header.buffer).setUint32(38, ext, true);
  }
  const dvl = new DataView(lens.buffer);
  dvl.setUint16(0, nameBytes.length, true);
  dvl.setUint16(2, 0, true);
  dvl.setUint16(4, 0, true);
  return new Uint8Array([...sig, ...header, ...lens, ...nameBytes]);
}

async function runScanner(bufs: Uint8Array[]) {
  const all = new Uint8Array(bufs.reduce((a,b)=>a+b.length,0));
  let off = 0; for (const b of bufs) { all.set(b, off); off += b.length; }
  return ZipHeaderIntegrityScanner.scan(all);
}

describe('ZipHeaderIntegrityScanner', () => {
  it('clean when names match and no symlink/traversal', async () => {
    const out = await runScanner([lfh('a.txt'), cen('a.txt')]);
    expect(out.verdict).toBe('clean');
  });
  it('suspicious on LFH≠CEN mismatch', async () => {
    const out = await runScanner([lfh('a.txt'), cen('b.txt')]);
    expect(out.verdict).toBe('suspicious');
    expect(out.reason).toMatch(/mismatch/i);
  });
  it('suspicious on symlink bit', async () => {
    // POSIX symlink 0120000
    const out = await runScanner([lfh('a'), cen('a', 0o120000)]);
    expect(out.verdict).toBe('suspicious');
  });
  it('malicious on traversal', async () => {
    const out = await runScanner([lfh('../etc/passwd'), cen('../etc/passwd')]);
    expect(out.verdict).toBe('malicious');
  });
});
