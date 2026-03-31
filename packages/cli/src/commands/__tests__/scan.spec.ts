import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ScanOptions, scanCommand } from "../scan.js";

describe("scan command", () => {
  let testDir: string;

  const baseOptions: ScanOptions = {
    recursive: false,
    format: "json",
    ext: [],
    maxSize: 10 * 1024 * 1024,
    failOn: "never",
    quiet: true,
    color: false,
    stream: false,
  };

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "pompelmi-cli-scan-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  function mockExit() {
    return vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit:${code ?? ""}`);
    }) as never;
  }

  it("exits with code 2 for a missing path", async () => {
    mockExit();
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(scanCommand(join(testDir, "missing.txt"), baseOptions)).rejects.toThrow(
      "process.exit:2",
    );
  });

  it("exits with code 0 for a clean file", async () => {
    const filePath = join(testDir, "clean.txt");
    await writeFile(filePath, "Hello World");

    mockExit();
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(scanCommand(filePath, baseOptions)).rejects.toThrow("process.exit:0");
  });
});
