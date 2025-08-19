import { type Match, type Scanner } from './compose';

export type ZipBombGuardOptions = {
  maxEntries?: number;                 // default 1000
  maxTotalUncompressedBytes?: number;  // default 500 * 1024 * 1024 (500MB)
  maxEntryNameLength?: number;         // default 255
  maxCompressionRatio?: number;        // default 1000 (uncompressed/ compressed)
  // Search window for EOCD; ZIP spec says comment <= 65535 bytes.
  eocdSearchWindow?: number;           // default 70_000
};

const SIG_LFH = 0x04034b50; // not used (we parse CD)
const SIG_CEN = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const DEFAULTS: Required<ZipBombGuardOptions> = {
  maxEntries: 1000,
  maxTotalUncompressedBytes: 500 * 1024 * 1024,
  maxEntryNameLength: 255,
  maxCompressionRatio: 1000,
  eocdSearchWindow: 70_000,
};

function r16(buf: Buffer, off: number) {
  return buf.readUInt16LE(off);
}
function r32(buf: Buffer, off: number) {
  return buf.readUInt32LE(off);
}
function isZipLike(buf: Buffer) {
  // local file header at start is common
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

function lastIndexOfEOCD(buf: Buffer, window: number): number {
  const sig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const start = Math.max(0, buf.length - window);
  return buf.lastIndexOf(sig, buf.length - 1, start);
}

function hasTraversal(name: string): boolean {
  return name.includes('../') || name.includes('..\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name);
}

export function createZipBombGuard(opts: ZipBombGuardOptions = {}): Scanner {
  const cfg = { ...DEFAULTS, ...opts };

  return {
    async scan(input: Uint8Array): Promise<Match[]> {
      const buf = Buffer.from(input);
      const matches: Match[] = [];

      if (!isZipLike(buf)) return matches;

      // Find EOCD near the end
      const eocdPos = lastIndexOfEOCD(buf, cfg.eocdSearchWindow);
      if (eocdPos < 0 || eocdPos + 22 > buf.length) {
        // ZIP but no EOCD — malformed or polyglot → suspicious
        matches.push({ rule: 'zip_eocd_not_found', severity: 'suspicious' });
        return matches;
      }

      const totalEntries = r16(buf, eocdPos + 10);
      const cdSize = r32(buf, eocdPos + 12);
      const cdOffset = r32(buf, eocdPos + 16);

      // Bounds check
      if (cdOffset + cdSize > buf.length) {
        matches.push({ rule: 'zip_cd_out_of_bounds', severity: 'suspicious' });
        return matches;
      }

      // Iterate central directory entries
      let ptr = cdOffset;
      let seen = 0;
      let sumComp = 0;
      let sumUnc = 0;

      while (ptr + 46 <= cdOffset + cdSize && seen < totalEntries) {
        const sig = r32(buf, ptr);
        if (sig !== SIG_CEN) break; // stop if structure breaks

        const compSize = r32(buf, ptr + 20);
        const uncSize  = r32(buf, ptr + 24);
        const fnLen    = r16(buf, ptr + 28);
        const exLen    = r16(buf, ptr + 30);
        const cmLen    = r16(buf, ptr + 32);

        const nameStart = ptr + 46;
        const nameEnd = nameStart + fnLen;
        if (nameEnd > buf.length) break;

        const name = buf.toString('utf8', nameStart, nameEnd);

        sumComp += compSize;
        sumUnc  += uncSize;
        seen++;

        if (name.length > cfg.maxEntryNameLength) {
          matches.push({ rule: 'zip_entry_name_too_long', severity: 'suspicious', meta: { name, length: name.length } });
        }
        if (hasTraversal(name)) {
          matches.push({ rule: 'zip_path_traversal_entry', severity: 'suspicious', meta: { name } });
        }

        // move to next entry
        ptr = nameEnd + exLen + cmLen;
      }

      if (seen !== totalEntries) {
        // central dir truncated/odd, still report what we found
        matches.push({ rule: 'zip_cd_truncated', severity: 'suspicious', meta: { seen, totalEntries } });
      }

      // Heuristics thresholds
      if (seen > cfg.maxEntries) {
        matches.push({ rule: 'zip_too_many_entries', severity: 'suspicious', meta: { seen, limit: cfg.maxEntries } });
      }
      if (sumUnc > cfg.maxTotalUncompressedBytes) {
        matches.push({
          rule: 'zip_total_uncompressed_too_large',
          severity: 'suspicious',
          meta: { totalUncompressed: sumUnc, limit: cfg.maxTotalUncompressedBytes }
        });
      }

      if (sumComp === 0 && sumUnc > 0) {
        matches.push({ rule: 'zip_suspicious_ratio', severity: 'suspicious', meta: { ratio: Infinity } });
      } else if (sumComp > 0) {
        const ratio = sumUnc / Math.max(1, sumComp);
        if (ratio >= cfg.maxCompressionRatio) {
          matches.push({ rule: 'zip_suspicious_ratio', severity: 'suspicious', meta: { ratio, limit: cfg.maxCompressionRatio } });
        }
      }

      return matches;
    }
  };
}
