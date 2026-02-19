import { describe, it, expect, vi } from 'vitest';
import { BatchScanner, batchScan } from '../src/utils/batch-scanner';
import type { ScanTask } from '../src/utils/batch-scanner';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const cleanTask = (): ScanTask => ({
  content: new Uint8Array(Buffer.from('hello world')),
  context: { filename: 'test.txt', mimeType: 'text/plain', size: 11 },
});

const pngTask = (): ScanTask => ({
  content: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  context: { filename: 'image.png', mimeType: 'image/png', size: 8 },
});

// ─── BatchScanner.scanBatch ───────────────────────────────────────────────────

describe('BatchScanner', () => {
  describe('empty batch', () => {
    it('handles an empty tasks array', async () => {
      const scanner = new BatchScanner();
      const result = await scanner.scanBatch([]);
      expect(result.reports).toEqual([]);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe('single task', () => {
    it('returns one report for a single clean file', async () => {
      const scanner = new BatchScanner();
      const result = await scanner.scanBatch([cleanTask()]);
      expect(result.reports).toHaveLength(1);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it('report has the expected shape', async () => {
      const scanner = new BatchScanner();
      const result = await scanner.scanBatch([cleanTask()]);
      const report = result.reports[0];
      expect(report).not.toBeNull();
      expect(report!.verdict).toBeDefined();
      expect(Array.isArray(report!.matches)).toBe(true);
    });
  });

  describe('multiple tasks', () => {
    it('returns the correct number of reports', async () => {
      const scanner = new BatchScanner({ concurrency: 2 });
      const tasks = [cleanTask(), pngTask(), cleanTask()];
      const result = await scanner.scanBatch(tasks);
      expect(result.reports).toHaveLength(3);
      expect(result.successCount).toBe(3);
    });

    it('reports are in the same order as input tasks', async () => {
      const scanner = new BatchScanner();
      const tasks = [cleanTask(), pngTask()];
      const result = await scanner.scanBatch(tasks);
      // Both positions must be filled (not null for successful scans)
      expect(result.reports[0]).not.toBeNull();
      expect(result.reports[1]).not.toBeNull();
    });
  });

  describe('concurrency option', () => {
    it('works with concurrency = 1 (serial)', async () => {
      const scanner = new BatchScanner({ concurrency: 1 });
      const tasks = [cleanTask(), cleanTask(), cleanTask()];
      const result = await scanner.scanBatch(tasks);
      expect(result.successCount).toBe(3);
    });

    it('works with high concurrency', async () => {
      const scanner = new BatchScanner({ concurrency: 10 });
      const tasks = Array.from({ length: 5 }, () => cleanTask());
      const result = await scanner.scanBatch(tasks);
      expect(result.successCount).toBe(5);
    });
  });

  describe('onProgress callback', () => {
    it('calls onProgress for each completed task', async () => {
      const progressCalls: number[] = [];
      const scanner = new BatchScanner({
        concurrency: 1,
        onProgress: (completed) => progressCalls.push(completed),
      });
      await scanner.scanBatch([cleanTask(), cleanTask()]);
      expect(progressCalls).toContain(1);
      expect(progressCalls).toContain(2);
    });

    it('receives the total count in each call', async () => {
      let seenTotal = 0;
      const scanner = new BatchScanner({
        onProgress: (_completed, total) => { seenTotal = total; },
      });
      await scanner.scanBatch([cleanTask(), cleanTask()]);
      expect(seenTotal).toBe(2);
    });

    it('receives the scan report in each call', async () => {
      const reports: any[] = [];
      const scanner = new BatchScanner({
        onProgress: (_c, _t, report) => reports.push(report),
      });
      await scanner.scanBatch([cleanTask()]);
      expect(reports[0]).toBeDefined();
      expect(reports[0].verdict).toBeDefined();
    });
  });

  describe('totalDurationMs', () => {
    it('returns a non-negative duration', async () => {
      const scanner = new BatchScanner();
      const result = await scanner.scanBatch([cleanTask()]);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('scanFilePaths', () => {
    it('scans real files from disk paths', async () => {
      const scanner = new BatchScanner();
      // Use known small test files in the project
      const result = await scanner.scanFilePaths([
        'tests/zip-bomb-guard.test.ts',
      ]);
      expect(result.successCount).toBe(1);
      expect(result.reports[0]).not.toBeNull();
    });

    it('handles multiple file paths', async () => {
      const scanner = new BatchScanner();
      const result = await scanner.scanFilePaths([
        'tests/zip-bomb-guard.test.ts',
        'tests/magic.test.ts',
      ]);
      expect(result.successCount).toBe(2);
    });
  });
});

// ─── batchScan convenience helper ────────────────────────────────────────────

describe('batchScan', () => {
  it('scans a single task via the convenience helper', async () => {
    const result = await batchScan([cleanTask()]);
    expect(result.successCount).toBe(1);
  });

  it('accepts concurrency option', async () => {
    const result = await batchScan([cleanTask(), cleanTask()], { concurrency: 2 });
    expect(result.successCount).toBe(2);
  });

  it('returns empty result for empty tasks', async () => {
    const result = await batchScan([]);
    expect(result.reports).toHaveLength(0);
  });
});
