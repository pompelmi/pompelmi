export type EntryMeta = {
  nameCEN: string;
  nameLFH: string;
  isSymlink?: boolean;
  linkTarget?: string;
};

function isUnsafePath(p: string) {
  if (!p) return true;
  if (/\0/.test(p)) return true;                          // NUL
  if (/^([A-Za-z]:[\\/]|[\\/]{2}|\/)/.test(p)) return true; // abs path / UNC / drive
  if (/(^|[\\/])\.\.([\\/]|$)/.test(p)) return true;        // dot-dot
  if (p.includes('\\')) return true;                        // backslashes
  return false;
}

export function createZipTraversalGuard() {
  return {
    id: 'zip-traversal-guard',
    async scan(entries: AsyncIterable<EntryMeta> | Iterable<EntryMeta>) {
      const findings: { rule: string; severity: 'suspicious'; msg: string }[] = [];
      const iter = (async function* () {
        if ((entries as any)[Symbol.asyncIterator]) {
          for await (const e of entries as AsyncIterable<EntryMeta>) yield e;
        } else {
          for (const e of entries as Iterable<EntryMeta>) yield e;
        }
      })();

      for await (const e of iter) {
        if (e.nameCEN !== e.nameLFH) {
          findings.push({ rule: 'zip.traversal', severity: 'suspicious', msg: `LFH≠CEN: ${e.nameLFH} vs ${e.nameCEN}` });
        }
        if (isUnsafePath(e.nameCEN) || isUnsafePath(e.nameLFH)) {
          findings.push({ rule: 'zip.traversal', severity: 'suspicious', msg: `unsafe path: ${e.nameCEN}` });
        }
        if (e.isSymlink && e.linkTarget && isUnsafePath(e.linkTarget)) {
          findings.push({ rule: 'zip.traversal', severity: 'suspicious', msg: `symlink escapes: ${e.linkTarget}` });
        }
      }
      return findings;
    }
  };
}
