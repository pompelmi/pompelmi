// src/zip.ts
import * as unzipper from 'unzipper';

export type ZipBudget = {
  maxEntries: number;
  maxDepth: number;
  maxTotalUncompressed: number;
  maxPerEntryUncompressed: number;
  maxCompressionRatio: number; // e.g., 100:1
};

export type ZipEntry = { path: string; depth: number; data: Uint8Array };

const badPath = (p: string) =>
  p.includes('..') || p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.includes('\0');

export async function* iterateZip(buffer: Uint8Array, budget: ZipBudget, depth = 0): AsyncGenerator<ZipEntry> {
  if (depth > budget.maxDepth) throw new Error('zip_depth_exceeded');
  const directory = await unzipper.Open.buffer(Buffer.from(buffer));
  let count = 0;
  let total = 0;

  for (const entry of directory.files) {
    if (entry.type !== 'File') continue;
    if (badPath(entry.path)) throw new Error('zip_path_traversal');
    count++;
    if (count > budget.maxEntries) throw new Error('zip_entries_exceeded');

    const stream = entry.stream();
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of stream) {
      chunks.push(c as Buffer);
      size += (c as Buffer).length;
      if (size > budget.maxPerEntryUncompressed) throw new Error('zip_entry_too_large');
    }
    total += size;
    if (total > budget.maxTotalUncompressed) throw new Error('zip_total_too_large');

    // crude compression ratio guard, uses compressedSize if provided
    const comp = entry.compressedSize ?? size;
    if (comp && size / comp > budget.maxCompressionRatio) throw new Error('zip_suspicious_ratio');

    const data = new Uint8Array(Buffer.concat(chunks));

    // Recurse ZIP-in-ZIP
    if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4B) {
      yield* iterateZip(data, budget, depth + 1);
    } else {
      yield { path: entry.path, depth, data };
    }
  }
}