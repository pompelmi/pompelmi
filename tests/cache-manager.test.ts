import { describe, it, expect, beforeEach } from 'vitest';
import { ScanCacheManager, getDefaultCache, resetDefaultCache } from '../src/utils/cache-manager';
import type { ScanReport } from '../src/types';

// ─── Fixture ─────────────────────────────────────────────────────────────────

function makeReport(verdict: 'clean' | 'suspicious' | 'malicious' = 'clean'): ScanReport {
  return {
    verdict,
    matches: [],
    ok: verdict === 'clean',
    durationMs: 5,
    reasons: verdict === 'clean' ? [] : [`rule_${verdict}`],
  };
}

const content1 = new Uint8Array([1, 2, 3, 4]);
const content2 = new Uint8Array([5, 6, 7, 8]);

// ─── ScanCacheManager ────────────────────────────────────────────────────────

describe('ScanCacheManager', () => {
  describe('basic set / get', () => {
    it('returns null for a cache miss', () => {
      const cache = new ScanCacheManager();
      expect(cache.get(content1)).toBeNull();
    });

    it('returns cached report after set', () => {
      const cache = new ScanCacheManager();
      const report = makeReport();
      cache.set(content1, report);
      expect(cache.get(content1)).toEqual(report);
    });

    it('different content produces cache miss', () => {
      const cache = new ScanCacheManager();
      cache.set(content1, makeReport());
      expect(cache.get(content2)).toBeNull();
    });

    it('preset is part of the cache key (different presets are separate entries)', () => {
      const cache = new ScanCacheManager();
      const reportA = makeReport('clean');
      const reportB = makeReport('suspicious');
      cache.set(content1, reportA, 'basic');
      cache.set(content1, reportB, 'advanced');
      expect(cache.get(content1, 'basic')).toEqual(reportA);
      expect(cache.get(content1, 'advanced')).toEqual(reportB);
    });

    it('no preset and undefined preset hit the same key', () => {
      const cache = new ScanCacheManager();
      const report = makeReport();
      cache.set(content1, report);
      expect(cache.get(content1, undefined)).toEqual(report);
    });
  });

  describe('has()', () => {
    it('returns false when key is absent', () => {
      const cache = new ScanCacheManager();
      expect(cache.has(content1)).toBe(false);
    });

    it('returns true after setting an entry', () => {
      const cache = new ScanCacheManager();
      cache.set(content1, makeReport());
      expect(cache.has(content1)).toBe(true);
    });

    it('returns false for an expired entry', async () => {
      const cache = new ScanCacheManager({ ttl: 1 }); // 1 ms TTL
      cache.set(content1, makeReport());
      await new Promise(r => setTimeout(r, 10));
      expect(cache.has(content1)).toBe(false);
    });
  });

  describe('TTL expiry', () => {
    it('returns null for an expired entry', async () => {
      const cache = new ScanCacheManager({ ttl: 1 }); // 1 ms TTL
      cache.set(content1, makeReport());
      await new Promise(r => setTimeout(r, 10));
      expect(cache.get(content1)).toBeNull();
    });

    it('valid entry within TTL is still retrievable', () => {
      const cache = new ScanCacheManager({ ttl: 60_000 });
      cache.set(content1, makeReport());
      expect(cache.get(content1)).not.toBeNull();
    });
  });

  describe('size', () => {
    it('starts at 0', () => {
      const cache = new ScanCacheManager();
      expect(cache.size).toBe(0);
    });

    it('increments after set', () => {
      const cache = new ScanCacheManager();
      cache.set(content1, makeReport());
      expect(cache.size).toBe(1);
    });

    it('does not increment for the same key', () => {
      const cache = new ScanCacheManager();
      cache.set(content1, makeReport());
      cache.set(content1, makeReport('suspicious'));
      expect(cache.size).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when maxSize is exceeded', () => {
      const cache = new ScanCacheManager({ maxSize: 2, enableLRU: true });
      const c1 = new Uint8Array([1]);
      const c2 = new Uint8Array([2]);
      const c3 = new Uint8Array([3]);
      cache.set(c1, makeReport());
      cache.set(c2, makeReport());
      cache.set(c3, makeReport()); // triggers eviction
      expect(cache.size).toBe(2);
    });

    it('works with LFU eviction (enableLRU: false)', () => {
      const cache = new ScanCacheManager({ maxSize: 2, enableLRU: false });
      const c1 = new Uint8Array([1]);
      const c2 = new Uint8Array([2]);
      const c3 = new Uint8Array([3]);
      cache.set(c1, makeReport());
      // Access c1 to increase its accessCount
      cache.get(c1);
      cache.set(c2, makeReport());
      cache.set(c3, makeReport()); // should evict c2 (lower access count)
      expect(cache.size).toBe(2);
    });
  });

  describe('clear()', () => {
    it('empties the cache', () => {
      const cache = new ScanCacheManager();
      cache.set(content1, makeReport());
      cache.set(content2, makeReport());
      cache.clear();
      expect(cache.size).toBe(0);
    });

    it('get returns null after clear', () => {
      const cache = new ScanCacheManager();
      cache.set(content1, makeReport());
      cache.clear();
      expect(cache.get(content1)).toBeNull();
    });
  });

  describe('prune()', () => {
    it('removes expired entries and returns count', async () => {
      const cache = new ScanCacheManager({ ttl: 1 });
      cache.set(content1, makeReport());
      cache.set(content2, makeReport());
      await new Promise(r => setTimeout(r, 10));
      const removed = cache.prune();
      expect(removed).toBe(2);
      expect(cache.size).toBe(0);
    });

    it('returns 0 when no entries have expired', () => {
      const cache = new ScanCacheManager({ ttl: 60_000 });
      cache.set(content1, makeReport());
      const removed = cache.prune();
      expect(removed).toBe(0);
    });

    it('returns 0 on an empty cache', () => {
      const cache = new ScanCacheManager();
      expect(cache.prune()).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('tracks hits and misses when enableStats: true', () => {
      const cache = new ScanCacheManager({ enableStats: true });
      cache.get(content1); // miss
      cache.set(content1, makeReport());
      cache.get(content1); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('computes hitRate correctly', () => {
      const cache = new ScanCacheManager({ enableStats: true });
      cache.set(content1, makeReport());
      cache.get(content1); // hit
      cache.get(content2); // miss
      const { hitRate } = cache.getStats();
      expect(hitRate).toBe(50);
    });

    it('returns hitRate 0 when no calls made', () => {
      const cache = new ScanCacheManager({ enableStats: true });
      expect(cache.getStats().hitRate).toBe(0);
    });

    it('tracks evictions', () => {
      const cache = new ScanCacheManager({ maxSize: 1, enableStats: true });
      cache.set(new Uint8Array([1]), makeReport());
      cache.set(new Uint8Array([2]), makeReport()); // evicts first
      expect(cache.getStats().evictions).toBe(1);
    });

    it('stats reset after clear()', () => {
      const cache = new ScanCacheManager({ enableStats: true });
      cache.set(content1, makeReport());
      cache.get(content1);
      cache.clear();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('statistics disabled (default)', () => {
    it('getStats returns zeros when enableStats is false', () => {
      const cache = new ScanCacheManager({ enableStats: false });
      cache.set(content1, makeReport());
      cache.get(content1);
      cache.get(content2);
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});

// ─── getDefaultCache / resetDefaultCache ─────────────────────────────────────

describe('getDefaultCache', () => {
  beforeEach(() => {
    resetDefaultCache();
  });

  it('creates a new instance on first call', () => {
    const cache = getDefaultCache();
    expect(cache).toBeInstanceOf(ScanCacheManager);
  });

  it('returns the same instance on subsequent calls', () => {
    const a = getDefaultCache();
    const b = getDefaultCache();
    expect(a).toBe(b);
  });

  it('returns a fresh instance after resetDefaultCache', () => {
    const a = getDefaultCache();
    resetDefaultCache();
    const b = getDefaultCache();
    expect(a).not.toBe(b);
  });

  it('passes options to the created instance', () => {
    const cache = getDefaultCache({ maxSize: 5 });
    for (let i = 0; i < 5; i++) {
      cache.set(new Uint8Array([i]), makeReport());
    }
    expect(cache.size).toBe(5);
    resetDefaultCache();
  });
});
