import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanTask } from "../src/utils/batch-scanner";

const task = (name: string): ScanTask => ({
  content: new Uint8Array([1, 2, 3]),
  context: { filename: name, size: 3 },
});

describe("BatchScanner error handling", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("../src/scan");
    vi.restoreAllMocks();
  });

  it("captures failed scans and continues when continueOnError=true", async () => {
    const scanBytes = vi
      .fn()
      .mockRejectedValueOnce("network down")
      .mockResolvedValueOnce({
        ok: true,
        verdict: "clean",
        matches: [],
        durationMs: 3,
      });

    vi.doMock("../src/scan", () => ({
      scanBytes,
    }));

    const { BatchScanner } = await import("../src/utils/batch-scanner");
    const onError = vi.fn();
    const scanner = new BatchScanner({ continueOnError: true, onError });

    const result = await scanner.scanBatch([task("broken.bin"), task("ok.bin")]);

    expect(result.errorCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.reports[0]).toBeNull();
    expect(result.reports[1]).toMatchObject({ verdict: "clean" });
    expect(result.errors[0]).toMatchObject({ index: 0 });
    expect(result.errors[0].error.message).toBe("network down");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 0);
  });

  it("rethrows failed scans when continueOnError=false", async () => {
    const scanBytes = vi.fn().mockRejectedValue(new Error("fatal failure"));

    vi.doMock("../src/scan", () => ({
      scanBytes,
    }));

    const { BatchScanner } = await import("../src/utils/batch-scanner");
    const scanner = new BatchScanner({ continueOnError: false });

    await expect(scanner.scanBatch([task("fatal.bin")])).rejects.toThrow("fatal failure");
  });
});
