import { describe, it, expect } from 'vitest';
import { createZipBombGuard } from '../src/scanners/zip-bomb-guard';

// ─── ZIP builder ─────────────────────────────────────────────────────────────
// Builds a minimal but spec-valid ZIP buffer with real central directory + EOCD.

interface ZipEntry {
  name: string;
  compSize: number;
  uncSize: number;
  data?: Buffer;
}

function buildZip(entries: ZipEntry[]): Buffer {
  const lfhParts: Buffer[] = [];
  const cdParts: Buffer[] = [];
  let lfhOffset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const data = entry.data ?? Buffer.alloc(entry.compSize);

    // Local File Header (30 bytes + filename + data)
    const lfh = Buffer.alloc(30 + nameBytes.length);
    lfh.writeUInt32LE(0x04034b50, 0);       // LFH signature
    lfh.writeUInt16LE(20, 4);               // version needed
    lfh.writeUInt16LE(0, 6);                // flags
    lfh.writeUInt16LE(0, 8);                // compression (stored)
    lfh.writeUInt16LE(0, 10);               // mod time
    lfh.writeUInt16LE(0, 12);               // mod date
    lfh.writeUInt32LE(0, 14);               // crc32
    lfh.writeUInt32LE(entry.compSize, 18);  // compressed size
    lfh.writeUInt32LE(entry.uncSize, 22);   // uncompressed size
    lfh.writeUInt16LE(nameBytes.length, 26);// filename length
    lfh.writeUInt16LE(0, 28);               // extra length
    nameBytes.copy(lfh, 30);

    // Central Directory entry (46 bytes + filename)
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0);        // CD signature
    cd.writeUInt16LE(20, 4);               // version made by
    cd.writeUInt16LE(20, 6);               // version needed
    cd.writeUInt16LE(0, 8);                // flags
    cd.writeUInt16LE(0, 10);               // compression
    cd.writeUInt16LE(0, 12);               // mod time
    cd.writeUInt16LE(0, 14);               // mod date
    cd.writeUInt32LE(0, 16);               // crc32
    cd.writeUInt32LE(entry.compSize, 20);  // compressed size
    cd.writeUInt32LE(entry.uncSize, 24);   // uncompressed size
    cd.writeUInt16LE(nameBytes.length, 28);// filename length
    cd.writeUInt16LE(0, 30);               // extra field length
    cd.writeUInt16LE(0, 32);               // comment length
    cd.writeUInt16LE(0, 34);               // disk number start
    cd.writeUInt16LE(0, 36);               // internal attrs
    cd.writeUInt32LE(0, 38);               // external attrs
    cd.writeUInt32LE(lfhOffset, 42);       // LFH offset
    nameBytes.copy(cd, 46);

    lfhParts.push(lfh, data);
    lfhOffset += lfh.length + data.length;
    cdParts.push(cd);
  }

  const cdBlock  = Buffer.concat(cdParts);
  const cdOffset = lfhOffset;

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);      // EOCD signature
  eocd.writeUInt16LE(0, 4);               // disk number
  eocd.writeUInt16LE(0, 6);               // disk with CD
  eocd.writeUInt16LE(entries.length, 8);  // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(cdBlock.length, 12); // CD size
  eocd.writeUInt32LE(cdOffset, 16);       // CD offset
  eocd.writeUInt16LE(0, 20);              // comment length

  return Buffer.concat([...lfhParts, cdBlock, eocd]);
}

/** ZIP with EOCD claiming more entries than the CD actually contains. */
function buildTruncatedZip(realEntries: ZipEntry[], claimedTotal: number): Buffer {
  const full = buildZip(realEntries);
  // patch the "total entries" field in the EOCD (always last 22 bytes)
  const eocdStart = full.length - 22;
  full.writeUInt16LE(claimedTotal, eocdStart + 10);
  return full;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createZipBombGuard', () => {

  describe('non-ZIP input', () => {
    it('returns no matches for empty buffer', async () => {
      const scanner = createZipBombGuard();
      const matches = await scanner.scan(Buffer.alloc(0));
      expect(matches).toEqual([]);
    });

    it('returns no matches for plain text', async () => {
      const scanner = createZipBombGuard();
      const matches = await scanner.scan(Buffer.from('hello world'));
      expect(matches).toEqual([]);
    });

    it('returns no matches for a PNG header', async () => {
      const scanner = createZipBombGuard();
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const matches = await scanner.scan(png);
      expect(matches).toEqual([]);
    });
  });

  describe('valid minimal ZIP', () => {
    it('returns no matches for a single clean entry', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: 'readme.txt', compSize: 100, uncSize: 100 }]);
      const matches = await scanner.scan(zip);
      expect(matches).toEqual([]);
    });

    it('returns no matches for multiple clean entries', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([
        { name: 'a.txt', compSize: 500, uncSize: 1000 },
        { name: 'b.txt', compSize: 200, uncSize: 400 },
      ]);
      const matches = await scanner.scan(zip);
      expect(matches).toEqual([]);
    });
  });

  describe('malformed ZIP', () => {
    it('flags ZIP with no EOCD signature', async () => {
      const scanner = createZipBombGuard();
      // Starts with PK\x03\x04 (looks like ZIP) but has no valid EOCD
      const buf = Buffer.alloc(100);
      buf[0] = 0x50; buf[1] = 0x4b; buf[2] = 0x03; buf[3] = 0x04;
      const matches = await scanner.scan(buf);
      expect(matches.some(m => m.rule === 'zip_eocd_not_found')).toBe(true);
    });

    it('flags ZIP with CD offset out of bounds', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: 'a.txt', compSize: 10, uncSize: 10 }]);
      // Corrupt the CD offset in EOCD to point past the buffer
      const eocdStart = zip.length - 22;
      zip.writeUInt32LE(9999999, eocdStart + 16);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_cd_out_of_bounds')).toBe(true);
    });

    it('flags ZIP where central directory is truncated', async () => {
      const scanner = createZipBombGuard();
      const zip = buildTruncatedZip(
        [{ name: 'a.txt', compSize: 10, uncSize: 10 }],
        5 // claim 5 entries but only 1 exists
      );
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_cd_truncated')).toBe(true);
    });
  });

  describe('path traversal', () => {
    it('flags ../relative path traversal', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: '../etc/passwd', compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_path_traversal_entry')).toBe(true);
    });

    it('flags absolute path starting with /', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: '/etc/passwd', compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_path_traversal_entry')).toBe(true);
    });

    it('flags Windows drive letter path (C:\\...)', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: 'C:\\Windows\\system32\\cmd.exe', compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_path_traversal_entry')).toBe(true);
    });

    it('flags Windows ..\\back traversal', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: 'foo\\..\\..\\evil', compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_path_traversal_entry')).toBe(true);
    });

    it('clean relative path produces no traversal match', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: 'subdir/file.txt', compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_path_traversal_entry')).toBe(false);
    });
  });

  describe('entry name too long', () => {
    it('flags entry name exceeding default 255 chars', async () => {
      const scanner = createZipBombGuard();
      const longName = 'a'.repeat(300);
      const zip = buildZip([{ name: longName, compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_entry_name_too_long')).toBe(true);
    });

    it('respects custom maxEntryNameLength', async () => {
      const scanner = createZipBombGuard({ maxEntryNameLength: 10 });
      const zip = buildZip([{ name: 'toolongname.txt', compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_entry_name_too_long')).toBe(true);
    });

    it('does not flag a name exactly at the limit', async () => {
      const scanner = createZipBombGuard({ maxEntryNameLength: 10 });
      const zip = buildZip([{ name: 'exactly10c', compSize: 10, uncSize: 10 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_entry_name_too_long')).toBe(false);
    });
  });

  describe('too many entries', () => {
    it('flags archive exceeding maxEntries', async () => {
      const scanner = createZipBombGuard({ maxEntries: 3 });
      const entries = Array.from({ length: 5 }, (_, i) => ({
        name: `file${i}.txt`, compSize: 10, uncSize: 10,
      }));
      const zip = buildZip(entries);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_too_many_entries')).toBe(true);
    });

    it('does not flag archive at exactly maxEntries', async () => {
      const scanner = createZipBombGuard({ maxEntries: 3 });
      const entries = Array.from({ length: 3 }, (_, i) => ({
        name: `file${i}.txt`, compSize: 10, uncSize: 10,
      }));
      const zip = buildZip(entries);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_too_many_entries')).toBe(false);
    });
  });

  describe('total uncompressed size', () => {
    it('flags archive exceeding maxTotalUncompressedBytes', async () => {
      const scanner = createZipBombGuard({ maxTotalUncompressedBytes: 500 });
      const zip = buildZip([
        { name: 'a.bin', compSize: 100, uncSize: 300 },
        { name: 'b.bin', compSize: 100, uncSize: 300 },
      ]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_total_uncompressed_too_large')).toBe(true);
    });
  });

  describe('suspicious compression ratio', () => {
    it('flags high compression ratio exceeding maxCompressionRatio', async () => {
      const scanner = createZipBombGuard({ maxCompressionRatio: 10 });
      // 1 byte compressed → 100 bytes uncompressed = ratio 100 > 10
      const zip = buildZip([{ name: 'bomb.txt', compSize: 1, uncSize: 100 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_suspicious_ratio')).toBe(true);
    });

    it('flags zero compSize with non-zero uncSize (infinite ratio)', async () => {
      const scanner = createZipBombGuard({ maxCompressionRatio: 1000 });
      const zip = buildZip([{ name: 'zero.txt', compSize: 0, uncSize: 1000 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_suspicious_ratio')).toBe(true);
    });

    it('does not flag ratio below the limit', async () => {
      const scanner = createZipBombGuard({ maxCompressionRatio: 10 });
      const zip = buildZip([{ name: 'ok.txt', compSize: 100, uncSize: 500 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_suspicious_ratio')).toBe(false);
    });

    it('does not flag zero compSize AND zero uncSize', async () => {
      const scanner = createZipBombGuard({ maxCompressionRatio: 10 });
      const zip = buildZip([{ name: 'empty.txt', compSize: 0, uncSize: 0 }]);
      const matches = await scanner.scan(zip);
      expect(matches.some(m => m.rule === 'zip_suspicious_ratio')).toBe(false);
    });
  });

  describe('custom options', () => {
    it('uses all default options when none provided', async () => {
      const scanner = createZipBombGuard();
      const zip = buildZip([{ name: 'ok.txt', compSize: 100, uncSize: 100 }]);
      expect(await scanner.scan(zip)).toEqual([]);
    });

    it('can be called with an empty options object', async () => {
      const scanner = createZipBombGuard({});
      const zip = buildZip([{ name: 'ok.txt', compSize: 100, uncSize: 100 }]);
      expect(await scanner.scan(zip)).toEqual([]);
    });
  });
});
