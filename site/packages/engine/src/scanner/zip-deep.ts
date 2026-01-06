// packages/engine/src/scanner/zip-deep.ts
import path from "node:path";
import * as yauzl from "yauzl";

// --- Types ---------------------------------------------------------------

type Finding = {
  tag: "zip.traversal" | "zip.symlink" | "zip.lfhMismatch";
  severity: "suspicious" | "malicious";
  details: string;
  entry?: string;
};

// --- Constants -----------------------------------------------------------

const PK_SIG = 0x04034b50; // Local File Header signature

// --- Helpers -------------------------------------------------------------

function normalizeZipPath(p: string) {
  // ZIP spec uses POSIX separators. Strip backslashes to be conservative.
  return p.replace(/\\/g, "/");
}

function isAbsoluteOrDotDot(p: string) {
  // Absolute (/… or C:\… via forwardized), or any .. segment
  return p.startsWith("/") || /^[A-Za-z]:\//.test(p) || p.split("/").some((seg) => seg === "..");
}

// Detect symlink via UNIX mode bits in CEN external attrs (upper 16 bits)
function isSymlinkByMode(externalFileAttributes: number, versionMadeBy: number) {
  // Only meaningful when "made by" OS is Unix (3) or macOS (19)
  const hostOS = (versionMadeBy >> 8) & 0xff;
  if (hostOS !== 3 /*UNIX*/ && hostOS !== 19 /*macOS*/) return false;
  const mode = (externalFileAttributes >>> 16) & 0xffff;
  // S_IFMT mask 0xF000; symlink 0xA000
  return (mode & 0xf000) === 0xa000;
}

// Minimal parser for ZIP Extra Fields: returns array of {id, data}
function parseExtraFields(buf: Buffer): Array<{ id: number; data: Buffer }> {
  const out: Array<{ id: number; data: Buffer }> = [];
  let off = 0;
  while (off + 4 <= buf.length) {
    const id = buf.readUInt16LE(off);
    const size = buf.readUInt16LE(off + 2);
    off += 4;
    if (off + size > buf.length) break;
    out.push({ id, data: buf.subarray(off, off + size) });
    off += size;
  }
  return out;
}

// Decode a ZIP filename from bytes using GPBF + (optionally) Unicode Path extra-field (0x7075)
function decodeZipName(nameBuf: Buffer, gpbFlag: number, extraBuf?: Buffer): string {
  // Prefer Info-ZIP Unicode Path Extra Field if present (0x7075)
  if (extraBuf && extraBuf.length >= 5) {
    const fields = parseExtraFields(extraBuf);
    const uPath = fields.find((f) => f.id === 0x7075);
    if (uPath && uPath.data.length >= 5 && uPath.data[0] === 0x01) {
      // layout: [ver=1][4-byte crc32][utf8 name...]
      const utf8Name = uPath.data.subarray(5).toString("utf8");
      return normalizeZipPath(utf8Name);
    }
  }

  // Otherwise use GPBF bit 11 (0x0800) to decide UTF-8 vs legacy encoding
  const isUtf8 = (gpbFlag & 0x0800) !== 0;
  // We avoid extra deps; for legacy we use latin1 as best-effort (CP437 would need iconv-lite)
  const decoded = isUtf8 ? nameBuf.toString("utf8") : nameBuf.toString("latin1");
  return normalizeZipPath(decoded);
}

// Read **Local File Header** name directly from the ZIP buffer to compare with CEN
function readLFHName(zipBuf: Buffer, lfhOffset: number, gpbFlag: number): string | null {
  if (lfhOffset + 30 > zipBuf.length) return null;
  const sig = zipBuf.readUInt32LE(lfhOffset);
  if (sig !== PK_SIG) return null;
  const fileNameLen = zipBuf.readUInt16LE(lfhOffset + 26);
  const extraLen = zipBuf.readUInt16LE(lfhOffset + 28);
  const nameStart = lfhOffset + 30;
  const nameEnd = nameStart + fileNameLen;
  if (nameEnd > zipBuf.length) return null;
  const nameBuf = zipBuf.subarray(nameStart, nameEnd);
  const extraBuf = zipBuf.subarray(nameEnd, nameEnd + extraLen);
  return decodeZipName(nameBuf, gpbFlag, extraBuf);
}

/**
 * ZipDeepInspectionScanner
 * - Rejects symlinks
 * - Verifies path stays under a virtual extraction root
 * - Verifies LFH name === CEN name
 * Produces "suspicious" findings for engine to stop on.
 */
export async function zipDeepInspection(
  buffer: Buffer,
  opts?: { root?: string; maxEntries?: number },
) {
  const findings: Finding[] = [];
  const root = (opts?.root ?? "/").replace(/\\/g, "/");
  const maxEntries = opts?.maxEntries ?? 5000;

  const zipfile: yauzl.ZipFile = await new Promise((resolve, reject) =>
    yauzl.fromBuffer(
      buffer,
      // decodeStrings: true -> yauzl gives us entry.fileName as decoded string
      { lazyEntries: true, decodeStrings: true, strictFileNames: true },
      (err, zf) => (err || !zf ? reject(err) : resolve(zf)),
    ),
  );

  let count = 0;
  return await new Promise<Finding[]>((resolve, reject) => {
    zipfile.readEntry();

    zipfile.on("entry", (entry: yauzl.Entry) => {
      count++;
      if (count > maxEntries) {
        findings.push({
          tag: "zip.traversal",
          severity: "suspicious",
          details: `Too many entries (> ${maxEntries}).`,
        });
        zipfile.close();
        return resolve(findings);
      }

      // 0) CEN name (decoded by yauzl) -> normalize for checks
      const cenName = normalizeZipPath((entry.fileName as unknown as string) || "");

      // 1) Traversal / absolute path checks
      if (isAbsoluteOrDotDot(cenName)) {
        findings.push({
          tag: "zip.traversal",
          severity: "suspicious",
          details: `Illegal path in CEN: ${cenName}`,
          entry: cenName,
        });
      } else {
        // enforce it would stay under the extraction root (posix)
        const finalPath = path.posix.normalize(path.posix.join(root, cenName));
        if (!finalPath.startsWith(root.endsWith("/") ? root : root + "/")) {
          findings.push({
            tag: "zip.traversal",
            severity: "suspicious",
            details: `Resolved path escapes root: ${cenName} -> ${finalPath}`,
            entry: cenName,
          });
        }
      }

      // 2) Symlink detection through external file attributes
      if (isSymlinkByMode(entry.externalFileAttributes ?? 0, entry.versionMadeBy ?? 0)) {
        findings.push({
          tag: "zip.symlink",
          severity: "suspicious",
          details: `Symlink entry rejected: ${cenName}`,
          entry: cenName,
        });
      }

      // 3) LFH vs CEN filename mismatch
      const lfhOffset = (entry as any).relativeOffsetOfLocalHeader ?? (entry as any).relativeOffset ?? null;
      if (lfhOffset != null) {
        const lfhName = readLFHName(buffer, lfhOffset, entry.generalPurposeBitFlag);
        if (lfhName && lfhName !== cenName) {
          findings.push({
            tag: "zip.lfhMismatch",
            severity: "suspicious",
            details: `LFH≠CEN: LFH="${lfhName}" CEN="${cenName}"`,
            entry: cenName,
          });
        }
      }

      zipfile.readEntry();
    });

    zipfile.on("end", () => {
      zipfile.close();
      resolve(findings);
    });

    zipfile.on("error", (e) => reject(e));
  });
}