import type { Uint8ArrayLike } from '../types';

/**
 * createZipTraversalGuard – guards against path traversal & header spoofing in ZIPs.
 * EXPECTS: caller provides an iterator over entries with metadata (name, isSymlink, target?, from CEN & LFH).
 * Return non-empty array to flag.
 */
export type EntryMeta = {
  nameCEN: string;      // name from Central Directory
  nameLFH: string;      // name from Local File Header
  isSymlink?: boolean;  // if lib exposes this
  linkTarget?: string;  // if available
};

export function createZipTraversalGuard() {
  return {
    id: 'zip-traversal-guard',
    async scan(entries: AsyncIterable<EntryMeta>) {
      const findings: string[] = [];
      const bad = (why:string,n?:string)=>findings.push(`${why}${n?`: ${n}`:''}`);

      const isUnsafePath = (p:string) => {
        if (!p) return true;
        // NUL, absolute paths, drive letters, dot-dot, backslashes
        if (/\0/.test(p)) return true;
        if (/^([A-Za-z]:[\\/]|[\\/]{2}|\/)/.test(p)) return true;
        if (/(^|[\\/])\.\.([\\/]|$)/.test(p)) return true;
        if (p.includes('\\')) return true;
        return false;
      };

      for await (const e of entries) {
        if (e.nameCEN !== e.nameLFH) bad('zip: LFH≠CEN mismatch', `${e.nameLFH} vs ${e.nameCEN}`);
        if (isUnsafePath(e.nameCEN) || isUnsafePath(e.nameLFH)) bad('zip: unsafe path', e.nameCEN);
        if (e.isSymlink && e.linkTarget && isUnsafePath(e.linkTarget)) bad('zip: symlink escapes root', e.linkTarget);
      }
      return findings.map(msg => ({ rule:'zip.traversal', severity:'suspicious' as const, msg }));
    }
  };
}
