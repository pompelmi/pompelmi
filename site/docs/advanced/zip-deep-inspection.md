# ZIP deep-inspection

ZIP archives can hide path traversal and name spoofing tricks that bypass naive checks.
This module adds a **deep inspection** step for ZIP files before any extraction or handling.

## Why

Even when libraries validate `../`, ZIPs can still:
- Use **symlinks** to escape the extraction root.
- Set different filenames in the **Local File Header (LFH)** vs the **Central Directory (CEN)**.
- Rely on absolute paths or mixed separators.
- Exploit Unicode/legacy encodings to disguise paths.

## What Pompelmi checks

- **Traversal guard** — normalizes POSIX paths and ensures the final resolved path **stays under** the configured extraction root.
- **Symlink block** — rejects entries that are symlinks (detected via UNIX mode bits in external attributes).
- **LFH ≡ CEN validation** — decodes the LFH filename and requires it to exactly match the CEN filename (Unicode-aware when possible).
- **Entry flood guard** — optional cap on the number of entries (defaults to 5000).

These checks run fast, do not extract, and produce **suspicious** tags so the engine can stop safely.

## Configuration

```ts
// EngineOptions
zipDeep?: {
  enabled?: boolean;   // default: true
  root?: string;       // default: "/"
  maxEntries?: number; // default: 5000
}
```

## Usage (composition example)

```ts
import { composeScanners } from "pompelmi/engine";
import { zipGuard } from "pompelmi/engine/scanners/zip-guard";
import { zipDeepInspection } from "pompelmi/engine"; // exported from './scanner/zip-deep'

export const scanner = composeScanners(
  [
    ["zipGuard", zipGuard], // basic size/ratio/bomb checks
    [
      "zipDeep",
      async (ctx) => {
        if (!ctx.mime?.includes("zip") && !ctx.filename?.endsWith(".zip")) return;
        const buf = await ctx.readAsBuffer();
        const hits = await zipDeepInspection(buf, { root: "/", maxEntries: 5000 });
        for (const h of hits) ctx.tag("suspicious", h.tag, h.details);
      },
    ],
    // ... other scanners
  ],
  { parallel: false, stopOn: "suspicious", timeoutMsPerScanner: 1500, tagSourceName: true }
);
```

## How it works (high level)

### 1) Traversal enforcement
- Reject absolute paths and any `..` segments.
- Compute `finalPath = join(root, name)` using `path.posix`, then require `finalPath.startsWith(root + "/")`.

### 2) Symlink detection
- Inspect the ZIP CEN external file attributes (upper 16 bits = UNIX mode).
- If the mode has `S_IFLNK` (0xA000), the entry is treated as a symlink and rejected.

### 3) LFH vs CEN filename match
- Read the LFH at `relativeOffsetOfLocalHeader` and decode the filename.
- Compare to the decoded CEN filename; a mismatch is flagged (possible spoofing).

### 4) Unicode / legacy handling
- Prefer the **Unicode Path** extra field (0x7075) when present.
- Otherwise respect the UTF‑8 flag in the general purpose bit field; fall back to latin1.
- Normalization uses POSIX separators to keep checks deterministic across platforms.

## Test matrix (covered in unit tests)

- `../evil.txt` (parent traversal)
- `/etc/passwd` (absolute path)
- Symlink entry pointing **outside** the extraction root
- **LFH ≠ CEN** filename mismatch (including same-length tampering)
- Large entry count exceeding `maxEntries`

## Behavior & acceptance

- **Reject symlinks** or anything resolving outside the extraction root.
- **Validate LFH and CEN names are identical** after decoding.
- **Documented** and **unit-tested** with traversal, absolute paths, symlink, and LFH≠CEN cases.

## Notes

- This module performs **no extraction**. It inspects headers and names only.
- Windows tools often dereference or drop symlinks; this scanner relies on the ZIP flags/mode bits, so it remains platform‑independent.
- For perfect legacy decoding (CP437), you can integrate `iconv-lite`; the default latin1 fallback is sufficient for the security checks since both LFH and CEN are decoded consistently before comparing.

---

© pompelmi — ZIP deep-inspection module
