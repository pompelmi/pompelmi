import { afterEach, describe, expect, it, vi } from "vitest";
import { aggregateScanStats, PerformanceTracker } from "../src/utils/performance-metrics";

describe("PerformanceTracker", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes duration from a named checkpoint", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const tracker = new PerformanceTracker();

    vi.setSystemTime(new Date("2024-01-01T00:00:00.100Z"));
    tracker.checkpoint("prep_start");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.325Z"));
    expect(tracker.getDuration("prep_start")).toBe(225);
  });

  it("includes prep and yara durations in metrics when checkpoints exist", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const tracker = new PerformanceTracker();

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    tracker.checkpoint("prep_end");
    tracker.checkpoint("yara_start");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.150Z"));
    tracker.checkpoint("yara_end");

    const metrics = tracker.getMetrics(300);

    expect(metrics.prepDurationMs).toBe(50);
    expect(metrics.yaraDurationMs).toBe(100);
    expect(metrics.bytesScanned).toBe(300);
  });
});

describe("aggregateScanStats", () => {
  it("counts malicious reports separately", () => {
    const stats = aggregateScanStats([
      { verdict: "clean", durationMs: 10, file: { size: 100 } },
      { verdict: "malicious", durationMs: 20, file: { size: 200 } },
    ]);

    expect(stats.cleanCount).toBe(1);
    expect(stats.maliciousCount).toBe(1);
    expect(stats.totalScans).toBe(2);
  });
});
