// stream.ts
import { createHash } from "node:crypto";
import { mapMatchesToVerdict } from "./verdict";
import type { ScanReport, YaraMatch } from "./types";

export type ScanOptions = {
  maxBytes?: number;
  timeoutMs?: number;
  detectMime?: boolean;
  computeSha256?: boolean; // default true
  scanChunk?: (chunk: Uint8Array) => Promise<void> | void;
  scanAll: (bytes: Uint8Array) => Promise<YaraMatch[]>;
};

export async function scanStream(
  readable: NodeJS.ReadableStream,
  options: ScanOptions
): Promise<ScanReport> {
  const start = performance.now();
  const max = options.maxBytes ?? 50 * 1024 * 1024;
  const sha = options.computeSha256 === false ? null : createHash("sha256");
  const chunks: Buffer[] = [];
  let size = 0, truncated = false, timedOut = false;

  let timer: NodeJS.Timeout | null = null;
  if (options.timeoutMs && options.timeoutMs > 0) {
    timer = setTimeout(() => { timedOut = true; }, options.timeoutMs);
  }

  try {
    for await (const c of readable as any as AsyncIterable<Buffer>) {
      if (timedOut) break;
      const b = Buffer.isBuffer(c) ? c : Buffer.from(c);
      size += b.length;
      if (sha) sha.update(b);
      await options.scanChunk?.(b);
      if (size > max) { truncated = true; break; }
      chunks.push(b);
    }
  } finally {
    if (timer) clearTimeout(timer);
  }

  const buf = Buffer.concat(chunks, Math.min(size, max));
  let matches: YaraMatch[] = [];
  if (!timedOut) {
    try { matches = await options.scanAll(new Uint8Array(buf)); }
    catch { /* fail-closed handled by adapters; keep matches=[] here */ }
  }

  const verdict = timedOut ? "suspicious" : mapMatchesToVerdict(matches);
  return {
    ok: verdict === "clean",
    verdict,
    matches,
    file: { size, sha256: sha ? sha.digest("hex") : undefined },
    durationMs: Math.round(performance.now() - start),
    truncated,
    timedOut,
    engine: "yara",
  };
}