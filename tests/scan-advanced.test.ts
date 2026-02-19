/**
 * Additional tests for src/scan.ts — covers advanced options:
 *   enableCache, enablePerformanceTracking, enableAdvancedDetection,
 *   config overrides, callbacks, scanFile (Node), scanFiles (browser-like)
 */

import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { scanBytes, scanFile } from '../src/scan';

// ─── tiny valid inputs ────────────────────────────────────────────────────────

const CLEAN_TXT = new TextEncoder().encode('hello world, nothing malicious here');
const CLEAN_PNG_HDR = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);

// ─── basic scanBytes (ensure existing tests still pass) ───────────────────────

describe('scanBytes basics', () => {
  it('returns a ScanReport for clean text', async () => {
    const report = await scanBytes(CLEAN_TXT);
    expect(report).toHaveProperty('verdict');
    expect(report).toHaveProperty('matches');
    expect(report.ok).toBe(true);
  });

  it('includes durationMs', async () => {
    const report = await scanBytes(CLEAN_TXT);
    expect(typeof report.durationMs).toBe('number');
  });

  it('respects ctx.filename', async () => {
    const report = await scanBytes(CLEAN_TXT, { ctx: { filename: 'test.txt' } });
    expect(report.file?.name).toBe('test.txt');
  });
});

// ─── enableCache ─────────────────────────────────────────────────────────────

describe('scanBytes enableCache', () => {
  it('returns a result when cache is enabled', async () => {
    const report = await scanBytes(CLEAN_TXT, { enableCache: true });
    expect(report.verdict).toBe('clean');
  });

  it('returns the same report on second call (cache hit)', async () => {
    const data = new TextEncoder().encode('cache-test-content-unique-' + Math.random());
    const r1 = await scanBytes(data, { enableCache: true });
    const r2 = await scanBytes(data, { enableCache: true });
    expect(r2.durationMs).toBe(r1.durationMs);
    expect(r2.verdict).toBe(r1.verdict);
  });
});

// ─── enablePerformanceTracking ────────────────────────────────────────────────

describe('scanBytes enablePerformanceTracking', () => {
  it('includes performanceMetrics when enabled', async () => {
    const report = await scanBytes(CLEAN_TXT, { enablePerformanceTracking: true }) as any;
    expect(report.performanceMetrics).toBeDefined();
  });

  it('does NOT include performanceMetrics when disabled (default)', async () => {
    const report = await scanBytes(CLEAN_TXT) as any;
    expect(report.performanceMetrics).toBeUndefined();
  });
});

// ─── enableAdvancedDetection ──────────────────────────────────────────────────

describe('scanBytes enableAdvancedDetection', () => {
  it('succeeds when advanced detection is explicitly disabled', async () => {
    const report = await scanBytes(CLEAN_TXT, { enableAdvancedDetection: false });
    expect(report.verdict).toBe('clean');
  });

  it('succeeds when advanced detection is explicitly enabled', async () => {
    const report = await scanBytes(CLEAN_TXT, { enableAdvancedDetection: true });
    expect(report.verdict).toBe('clean');
  });
});

// ─── config overrides ─────────────────────────────────────────────────────────

describe('scanBytes with config overrides', () => {
  it('respects config.defaultPreset fallback', async () => {
    const report = await scanBytes(CLEAN_TXT, {
      config: { defaultPreset: 'zip-basic' },
    });
    expect(report.verdict).toBeDefined();
  });

  it('respects config.advanced.enablePolyglotDetection = false', async () => {
    const report = await scanBytes(CLEAN_TXT, {
      config: {
        advanced: {
          enablePolyglotDetection: false,
          enableObfuscationDetection: false,
          enableNestedArchiveAnalysis: false,
        },
      },
    });
    expect(report.verdict).toBe('clean');
  });

  it('respects config.advanced.maxArchiveDepth', async () => {
    // Small plain text is unlikely to trigger nesting, just verify no crash
    const report = await scanBytes(CLEAN_TXT, {
      config: {
        advanced: {
          enableNestedArchiveAnalysis: true,
          maxArchiveDepth: 1,
        },
      },
    });
    expect(report).toHaveProperty('verdict');
  });

  it('fires callbacks.onScanComplete when provided', async () => {
    const spy = vi.fn();
    await scanBytes(CLEAN_TXT, {
      config: { callbacks: { onScanComplete: spy } },
    });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toHaveProperty('verdict');
  });

  it('config.performance.enableCache works like enableCache flag', async () => {
    const data = new TextEncoder().encode('cfg-cache-' + Math.random());
    const r1 = await scanBytes(data, {
      config: { performance: { enableCache: true } },
    });
    const r2 = await scanBytes(data, {
      config: { performance: { enableCache: true } },
    });
    expect(r1.verdict).toBe(r2.verdict);
  });

  it('config.performance.enablePerformanceTracking adds metrics', async () => {
    const report = await scanBytes(CLEAN_TXT, {
      config: { performance: { enablePerformanceTracking: true } },
    }) as any;
    expect(report.performanceMetrics).toBeDefined();
  });
});

// ─── presets ─────────────────────────────────────────────────────────────────

describe('scanBytes presets', () => {
  it('accepts preset = "images"', async () => {
    const report = await scanBytes(CLEAN_PNG_HDR, { preset: 'images' });
    expect(report).toHaveProperty('verdict');
  });

  it('accepts preset = "documents"', async () => {
    const report = await scanBytes(CLEAN_TXT, { preset: 'documents' });
    expect(report).toHaveProperty('verdict');
  });

  it('accepts preset = "full"', async () => {
    const report = await scanBytes(CLEAN_TXT, { preset: 'full' });
    expect(report).toHaveProperty('verdict');
  });
  it('triggers excessive_archive_nesting match when maxArchiveDepth is 0', async () => {
    // ZIP magic bytes → analyzeNestedArchives returns depth=1; with maxArchiveDepth:0, 1>0 triggers match
    const zipHeader = new Uint8Array([0x50, 0x4B, 0x03, 0x04, ...Array(20).fill(0x00)]);
    const report = await scanBytes(zipHeader, {
      config: {
        advanced: {
          enableNestedArchiveAnalysis: true,
          maxArchiveDepth: 0,
        },
      },
    });
    const hasNestingMatch = report.reasons?.includes('excessive_archive_nesting');
    expect(hasNestingMatch).toBe(true);
  });
});

// ─── scanFile (Node.js) ───────────────────────────────────────────────────────

describe('scanFile', () => {
  let tmpPath: string;

  beforeAll(() => {
    tmpPath = path.join(os.tmpdir(), `scanfile-test-${Date.now()}.txt`);
    fs.writeFileSync(tmpPath, 'clean file content for testing');
  });

  afterAll(() => {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  });

  it('scans a real file on disk', async () => {
    const report = await scanFile(tmpPath);
    expect(report.verdict).toBe('clean');
    expect(report.file?.name).toBe(path.basename(tmpPath));
  });

  it('sets file size from stat', async () => {
    const report = await scanFile(tmpPath);
    expect(report.file?.size).toBeGreaterThan(0);
  });

  it('accepts scan options', async () => {
    const spy = vi.fn();
    await scanFile(tmpPath, { config: { callbacks: { onScanComplete: spy } } });
    expect(spy).toHaveBeenCalledOnce();
  });
});
