/**
 * Regression tests for GitHub issue #100:
 * "Usage examples result in errors"
 *
 * Verifies that the named-scanner array form of composeScanners —
 * exactly as shown in the README — compiles and runs correctly.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CommonHeuristicsScanner,
  type ComposeScannerOptions,
  composeScanners,
  createZipBombGuard,
  type NamedScanner,
} from "../src/index";
import type { Scanner } from "../src/types";

// ── helpers ──────────────────────────────────────────────────────────────────
const noopScanner: Scanner = async () => [];
const suspiciousScanner: Scanner = async () => [
  { rule: "test_rule", severity: "suspicious" as const },
];
const maliciousScanner: Scanner = async () => [{ rule: "eicar", severity: "critical" as const }];
const slowScanner: Scanner = () =>
  new Promise((resolve) => setTimeout(() => resolve([{ rule: "slow" }]), 2000));

const BYTES = new Uint8Array([1, 2, 3]);

// ── Issue #100 — exact README / issue-comment code ────────────────────────────
describe("composeScanners — named-scanner array form (issue #100)", () => {
  it("compiles and returns a callable Scanner (exact issue code)", async () => {
    // This is the snippet from pavi2410's comment in issue #100 — it must compile
    // with no TS errors and execute without throwing.
    const scanner = composeScanners(
      [
        [
          "zipGuard",
          createZipBombGuard({
            maxEntries: 512,
            maxTotalUncompressedBytes: 200 * 1024 * 1024,
            maxCompressionRatio: 12,
          }),
        ],
        ["heuristics", CommonHeuristicsScanner],
      ],
      {
        parallel: false,
        stopOn: "malicious",
        timeoutMsPerScanner: 5000,
        tagSourceName: true,
      },
    );

    expect(typeof scanner).toBe("function");
    const result = await scanner(BYTES);
    expect(Array.isArray(result)).toBe(true);
  });

  it("compiles and returns a callable Scanner (README step-1 code)", async () => {
    const scanner = composeScanners(
      [
        [
          "zipGuard",
          createZipBombGuard({
            maxEntries: 512,
            maxTotalUncompressedBytes: 100 * 1024 * 1024,
            maxCompressionRatio: 12,
          }),
        ],
        ["heuristics", CommonHeuristicsScanner],
      ],
      { parallel: false, stopOn: "suspicious", timeoutMsPerScanner: 1500, tagSourceName: true },
    );
    expect(typeof scanner).toBe("function");
    const result = await scanner(BYTES);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── Functional correctness ────────────────────────────────────────────────────
describe("composeScanners — functional behaviour", () => {
  it("returns empty array when all scanners return no matches", async () => {
    const scanner = composeScanners([
      ["a", noopScanner],
      ["b", noopScanner],
    ]);
    const result = await scanner(BYTES);
    expect(result).toEqual([]);
  });

  it("collects matches from all scanners sequentially", async () => {
    const scanner = composeScanners([
      ["suspicious", suspiciousScanner],
      ["malicious", maliciousScanner],
    ]);
    const result = await scanner(BYTES);
    expect(result).toHaveLength(2);
  });

  it("stopOn: malicious — stops after finding a malicious match", async () => {
    let secondRan = false;
    const second: Scanner = async () => {
      secondRan = true;
      return [];
    };

    const scanner = composeScanners(
      [
        ["malicious", maliciousScanner],
        ["second", second],
      ],
      { stopOn: "malicious" },
    );
    await scanner(BYTES);
    expect(secondRan).toBe(false);
  });

  it("stopOn: suspicious — does NOT stop on clean-only results", async () => {
    let secondRan = false;
    const second: Scanner = async () => {
      secondRan = true;
      return [];
    };

    const scanner = composeScanners(
      [
        ["noop", noopScanner],
        ["second", second],
      ],
      { stopOn: "suspicious" },
    );
    await scanner(BYTES);
    expect(secondRan).toBe(true);
  });

  it("tagSourceName — tags each match with meta._sourceName", async () => {
    const scanner = composeScanners([["myScanner", suspiciousScanner]], { tagSourceName: true });
    const result = await scanner(BYTES);
    expect(result[0]?.meta?._sourceName).toBe("myScanner");
  });

  it("parallel: true — runs all scanners and collects results", async () => {
    const scanner = composeScanners(
      [
        ["a", suspiciousScanner],
        ["b", suspiciousScanner],
      ],
      { parallel: true },
    );
    const result = await scanner(BYTES);
    expect(result).toHaveLength(2);
  });

  it("parallel + tagSourceName tags fulfilled results with their source name", async () => {
    const scanner = composeScanners(
      [
        ["a", suspiciousScanner],
        ["b", suspiciousScanner],
      ],
      { parallel: true, tagSourceName: true },
    );
    const result = await scanner(BYTES);

    expect(result[0]?.meta?._sourceName).toBe("a");
    expect(result[1]?.meta?._sourceName).toBe("b");
  });

  it("timeoutMsPerScanner — skips scanners that exceed the timeout", async () => {
    const scanner = composeScanners(
      [
        ["slow", slowScanner],
        ["fast", suspiciousScanner],
      ],
      { timeoutMsPerScanner: 50 },
    );
    const result = await scanner(BYTES);
    // slow scanner timed out, only the fast scanner result should be present
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("test_rule");
  }, 5000);

  it("timeoutMsPerScanner handles scanner rejections through the timeout wrapper", async () => {
    const fastFailure: Scanner = async () => {
      throw new Error("fast failure");
    };
    const scanner = composeScanners(
      [
        ["fail", fastFailure],
        ["ok", suspiciousScanner],
      ],
      { timeoutMsPerScanner: 100 },
    );

    const result = await scanner(BYTES);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("test_rule");
  });

  it("empty array — returns empty result without throwing", async () => {
    const scanner = composeScanners([], {});
    const result = await scanner(BYTES);
    expect(result).toEqual([]);
  });

  it("individual scanner failures are non-fatal", async () => {
    const boom: Scanner = async () => {
      throw new Error("boom");
    };
    const scanner = composeScanners([
      ["boom", boom],
      ["ok", suspiciousScanner],
    ]);
    const result = await scanner(BYTES);
    expect(result).toHaveLength(1);
  });

  it("stopOn: suspicious stops after a suspicious match", async () => {
    let secondRan = false;
    const second: Scanner = async () => {
      secondRan = true;
      return [];
    };

    const scanner = composeScanners(
      [
        ["suspicious", suspiciousScanner],
        ["second", second],
      ],
      { stopOn: "suspicious" },
    );

    await scanner(BYTES);
    expect(secondRan).toBe(false);
  });

  it("stopOn: clean treats matches without severity as clean and stops", async () => {
    let secondRan = false;
    const cleanMatch: Scanner = async () => [{ rule: "no_severity" }];
    const second: Scanner = async () => {
      secondRan = true;
      return [];
    };

    const scanner = composeScanners(
      [
        ["cleanish", cleanMatch],
        ["second", second],
      ],
      { stopOn: "clean" },
    );

    const result = await scanner(BYTES);
    expect(result[0].rule).toBe("no_severity");
    expect(secondRan).toBe(false);
  });
});

// ── Backward-compatible variadic form ────────────────────────────────────────
describe("composeScanners — variadic form (backward compat)", () => {
  it("accepts plain Scanner arguments", async () => {
    const scanner = composeScanners(suspiciousScanner, noopScanner);
    const result = await scanner(BYTES);
    expect(result).toHaveLength(1);
  });

  it("accepts a single scanner", async () => {
    const scanner = composeScanners(suspiciousScanner);
    const result = await scanner(BYTES);
    expect(result).toHaveLength(1);
  });
});

// ── Type-level check: explicit NamedScanner / ComposeScannerOptions types ────
describe("composeScanners — TypeScript type exports", () => {
  it("NamedScanner and ComposeScannerOptions are usable as explicit types", async () => {
    const entries: NamedScanner[] = [["s1", noopScanner]];
    const opts: ComposeScannerOptions = {
      parallel: false,
      stopOn: "clean",
      timeoutMsPerScanner: 100,
      tagSourceName: false,
    };
    const scanner = composeScanners(entries, opts);
    expect(typeof scanner).toBe("function");
  });
});

describe("createPresetScanner — dynamic decompilation imports", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("configures Binary Ninja and Ghidra scanners when dynamic imports resolve", async () => {
    const createBinaryNinjaScanner = vi.fn(() => async () => [
      { rule: "binja", severity: "suspicious" as const },
    ]);
    const createGhidraScanner = vi.fn(() => async () => [
      { rule: "ghidra", severity: "suspicious" as const },
    ]);

    function MockFunction(this: unknown) {
      return (specifier: string) => {
        if (specifier === "@pompelmi/engine-binaryninja") {
          return Promise.resolve({ createBinaryNinjaScanner });
        }
        if (specifier === "@pompelmi/engine-ghidra") {
          return Promise.resolve({ createGhidraScanner });
        }
        return Promise.reject(new Error(`unexpected import: ${specifier}`));
      };
    }

    vi.stubGlobal("Function", MockFunction as unknown as FunctionConstructor);

    const { createPresetScanner } = await import("../src/presets");
    const scanner = createPresetScanner("malware-analysis", {
      decompilationTimeout: 1234,
      binaryNinjaPath: "/Applications/Binary Ninja.app",
      pythonPath: "/usr/bin/python3",
      ghidraPath: "/opt/ghidra",
      analyzeHeadless: "/opt/ghidra/support/analyzeHeadless",
    });

    expect(typeof scanner).toBe("function");

    await Promise.resolve();
    await Promise.resolve();
    const result = await scanner(BYTES);

    expect(createBinaryNinjaScanner).toHaveBeenCalledWith({
      timeout: 1234,
      depth: "deep",
      pythonPath: "/usr/bin/python3",
      binaryNinjaPath: "/Applications/Binary Ninja.app",
    });
    expect(createGhidraScanner).toHaveBeenCalledWith({
      timeout: 1234,
      depth: "deep",
      ghidraPath: "/opt/ghidra",
      analyzeHeadless: "/opt/ghidra/support/analyzeHeadless",
    });
    expect(result).toEqual(
      expect.arrayContaining([
        { rule: "binja", severity: "suspicious" },
        { rule: "ghidra", severity: "suspicious" },
      ]),
    );
  });

  it("silently skips decompilation imports when the Function constructor is unavailable", async () => {
    function ThrowingFunction() {
      throw new Error("disabled");
    }

    vi.stubGlobal("Function", ThrowingFunction as unknown as FunctionConstructor);

    const { createPresetScanner } = await import("../src/presets");
    const scanner = createPresetScanner("malware-analysis");

    expect(typeof scanner).toBe("function");
    await expect(scanner(BYTES)).resolves.toEqual([]);
  });
});
