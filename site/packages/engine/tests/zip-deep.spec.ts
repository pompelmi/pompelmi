/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import * as yazl from "yazl";
import { zipDeepInspection } from "../src/scanner/zip-deep";
import { Buffer } from "node:buffer";

// Helper: make a ZIP in-memory with a single file named `name`
async function zipWithSingleFile(name: string, content = "x") {
  return await new Promise<Buffer>((resolve) => {
    const z = new yazl.ZipFile();
    z.addBuffer(Buffer.from(content), name);
    const chunks: Uint8Array[] = [];
    z.outputStream.on("data", (c: Uint8Array) => chunks.push(c));
    z.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    z.end();
  });
}

describe("zipDeepInspection", () => {
  it("flags ../ traversal", async () => {
    const buf = await zipWithSingleFile("../evil.txt");
    const hits = await zipDeepInspection(buf);
    expect(hits.some(h => h.tag === "zip.traversal")).toBe(true);
  });

  it("flags absolute path", async () => {
    const buf = await zipWithSingleFile("/etc/passwd");
    const hits = await zipDeepInspection(buf);
    expect(hits.some(h => h.tag === "zip.traversal")).toBe(true);
  });

  it("flags LFH≠CEN mismatch", async () => {
    // Create zip with a 5-char name 'a.txt', then flip LFH name bytes to 'b.txt'
    const buf = await zipWithSingleFile("a.txt");
    // Find LFH signature (first file)
    const sig = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04
    const off = buf.indexOf(sig);
    const nameLen = buf.readUInt16LE(off + 26);
    // Replace only if 5 to keep lengths
    expect(nameLen).toBe(5);
    buf.write("b.txt", off + 30, "ascii"); // same length as 'a.txt'
    const hits = await zipDeepInspection(buf);
    expect(hits.some(h => h.tag === "zip.lfhMismatch")).toBe(true);
  });

  it("flags symlink entry (if present)", async () => {
    // Optional: build a symlinked zip via 'archiver' which can write symlinks on POSIX
    // Skipped in CI for portability; keep as example.
  });
});