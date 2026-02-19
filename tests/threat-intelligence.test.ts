/**
 * Tests for src/utils/threat-intelligence.ts
 * Covers: LocalThreatIntelligence, ThreatIntelligenceAggregator,
 *         createThreatIntelligence, getFileHash
 */

import { describe, it, expect } from 'vitest';
import {
  LocalThreatIntelligence,
  ThreatIntelligenceAggregator,
  createThreatIntelligence,
  getFileHash,
  type ThreatInfo,
  type ThreatIntelligenceSource,
} from '../src/utils/threat-intelligence';

// ─── getFileHash ─────────────────────────────────────────────────────────────

describe('getFileHash', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = getFileHash(new Uint8Array([1, 2, 3]));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const data = new Uint8Array([10, 20, 30]);
    expect(getFileHash(data)).toBe(getFileHash(data));
  });

  it('returns different hashes for different inputs', () => {
    expect(getFileHash(new Uint8Array([0]))).not.toBe(getFileHash(new Uint8Array([1])));
  });

  it('returns known hash for empty input', () => {
    // SHA-256 of empty buffer
    const hash = getFileHash(new Uint8Array([]));
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

// ─── LocalThreatIntelligence ──────────────────────────────────────────────────

describe('LocalThreatIntelligence', () => {
  it('exposes name property', () => {
    const db = new LocalThreatIntelligence();
    expect(db.name).toBe('Local Database');
  });

  it('knows the EICAR hash by default', async () => {
    const db = new LocalThreatIntelligence();
    const eicarHash = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';
    const info = await db.checkHash(eicarHash);
    expect(info).not.toBeNull();
    expect(info!.category).toBe('test-malware');
    expect(info!.threatLevel).toBe(100);
  });

  it('returns null for unknown hash', async () => {
    const db = new LocalThreatIntelligence();
    const result = await db.checkHash('a'.repeat(64));
    expect(result).toBeNull();
  });

  it('is case-insensitive for hash lookup', async () => {
    const db = new LocalThreatIntelligence();
    const eicarHash = '275A021BBFB6489E54D471899F7DB9D1663FC695EC2FE2A2C4538AABF651FD0F';
    const info = await db.checkHash(eicarHash);
    expect(info).not.toBeNull();
  });

  describe('addThreat / removeThreat / getAllThreats', () => {
    it('addThreat makes hash detectable', async () => {
      const db = new LocalThreatIntelligence();
      const hash = 'deadbeef'.repeat(8);
      const info: ThreatInfo = { threatLevel: 80, category: 'ransomware', source: 'test' };
      db.addThreat(hash, info);
      const result = await db.checkHash(hash);
      expect(result).toEqual(info);
    });

    it('addThreat normalises hash to lower-case', async () => {
      const db = new LocalThreatIntelligence();
      const hash = 'ABCD1234'.padEnd(64, '0');
      db.addThreat(hash.toUpperCase(), { threatLevel: 50, category: 'trojan', source: 'test' });
      expect(await db.checkHash(hash.toLowerCase())).not.toBeNull();
    });

    it('removeThreat returns true and removes entry', async () => {
      const db = new LocalThreatIntelligence();
      const hash = 'cafe'.repeat(16);
      db.addThreat(hash, { threatLevel: 60, category: 'adware', source: 'test' });
      expect(db.removeThreat(hash)).toBe(true);
      expect(await db.checkHash(hash)).toBeNull();
    });

    it('removeThreat returns false for unknown hash', () => {
      const db = new LocalThreatIntelligence();
      expect(db.removeThreat('unknown'.padEnd(64, '0'))).toBe(false);
    });

    it('getAllThreats returns a copy of the map', () => {
      const db = new LocalThreatIntelligence();
      const map = db.getAllThreats();
      expect(map).toBeInstanceOf(Map);
      // The EICAR test entry must be in the map
      expect(map.size).toBeGreaterThanOrEqual(1);
      // Map is a copy — mutating it does not affect internal state
      map.clear();
      expect(db.getAllThreats().size).toBeGreaterThanOrEqual(1);
    });
  });
});

// ─── ThreatIntelligenceAggregator ─────────────────────────────────────────────

describe('ThreatIntelligenceAggregator', () => {
  it('constructs with default local source', async () => {
    const agg = new ThreatIntelligenceAggregator();
    // Unknown hash should return empty array
    const results = await agg.checkHash('a'.repeat(64));
    expect(results).toEqual([]);
  });

  it('constructs with custom sources', async () => {
    const mockSource: ThreatIntelligenceSource = {
      name: 'Mock',
      checkHash: async (_hash: string) => ({
        threatLevel: 55,
        category: 'test',
        source: 'mock',
      }),
    };
    const agg = new ThreatIntelligenceAggregator([mockSource]);
    const results = await agg.checkHash('whatever'.padEnd(64, '0'));
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('test');
  });

  it('addSource incorporates new source in future checks', async () => {
    const agg = new ThreatIntelligenceAggregator([]);
    expect(await agg.checkHash('x'.padEnd(64, '0'))).toHaveLength(0);

    const mockSource: ThreatIntelligenceSource = {
      name: 'Added',
      checkHash: async () => ({ threatLevel: 10, category: 'info', source: 'added' }),
    };
    agg.addSource(mockSource);
    expect(await agg.checkHash('x'.padEnd(64, '0'))).toHaveLength(1);
  });

  it('ignores rejected sources (Promise.allSettled)', async () => {
    const errorSource: ThreatIntelligenceSource = {
      name: 'Broken',
      checkHash: async () => { throw new Error('network error'); },
    };
    const agg = new ThreatIntelligenceAggregator([errorSource]);
    const results = await agg.checkHash('a'.repeat(64));
    expect(results).toEqual([]);
  });

  describe('enhanceScanReport', () => {
    it('adds fileHash and riskScore to report', async () => {
      const agg = createThreatIntelligence();
      const report = {
        ok: true,
        verdict: 'clean' as const,
        matches: [],
        reasons: [],
        durationMs: 0,
        engine: 'heuristics',
        truncated: false,
        timedOut: false,
      };
      const enhanced = await agg.enhanceScanReport(new Uint8Array([1, 2, 3]), report);
      expect(enhanced.fileHash).toHaveLength(64);
      expect(typeof enhanced.riskScore).toBe('number');
      expect(enhanced.riskScore).toBeGreaterThanOrEqual(0);
      expect(enhanced.riskScore).toBeLessThanOrEqual(100);
    });

    it('riskScore is 0 for a clean report with no threats', async () => {
      const agg = new ThreatIntelligenceAggregator([]); // no sources
      const report = {
        ok: true,
        verdict: 'clean' as const,
        matches: [],
        reasons: [],
        durationMs: 0,
        engine: 'heuristics',
        truncated: false,
        timedOut: false,
      };
      const enhanced = await agg.enhanceScanReport(new Uint8Array([5, 6, 7]), report);
      expect(enhanced.riskScore).toBe(0);
    });

    it('riskScore is 70 for malicious verdict', async () => {
      const agg = new ThreatIntelligenceAggregator([]);
      const report = {
        ok: false,
        verdict: 'malicious' as const,
        matches: [],
        reasons: [],
        durationMs: 0,
        engine: 'heuristics',
        truncated: false,
        timedOut: false,
      };
      const enhanced = await agg.enhanceScanReport(new Uint8Array([99]), report);
      expect(enhanced.riskScore).toBe(70);
    });

    it('riskScore is 40 for suspicious verdict', async () => {
      const agg = new ThreatIntelligenceAggregator([]);
      const report = {
        ok: false,
        verdict: 'suspicious' as const,
        matches: [],
        reasons: [],
        durationMs: 0,
        engine: 'heuristics',
        truncated: false,
        timedOut: false,
      };
      const enhanced = await agg.enhanceScanReport(new Uint8Array([99]), report);
      expect(enhanced.riskScore).toBe(40);
    });

    it('riskScore adds 5 per match (capped at +20)', async () => {
      const agg = new ThreatIntelligenceAggregator([]);
      const matches = Array.from({ length: 10 }, (_, i) => ({
        rule: `rule_${i}`,
        tags: [],
        namespace: 'h',
      }));
      const report = {
        ok: false,
        verdict: 'suspicious' as const,
        matches,
        reasons: [],
        durationMs: 0,
        engine: 'heuristics',
        truncated: false,
        timedOut: false,
      };
      const enhanced = await agg.enhanceScanReport(new Uint8Array([1]), report);
      // suspicious(40) + capped_matches(20) = 60
      expect(enhanced.riskScore).toBe(60);
    });

    it('threat intel overrides score if higher', async () => {
      const highThreatSource: ThreatIntelligenceSource = {
        name: 'High',
        checkHash: async () => ({ threatLevel: 95, category: 'worm', source: 'test' }),
      };
      const agg = new ThreatIntelligenceAggregator([highThreatSource]);
      const report = {
        ok: false,
        verdict: 'suspicious' as const,
        matches: [],
        reasons: [],
        durationMs: 0,
        engine: 'heuristics',
        truncated: false,
        timedOut: false,
      };
      const enhanced = await agg.enhanceScanReport(new Uint8Array([1]), report);
      expect(enhanced.riskScore).toBe(95);
      expect(enhanced.threatIntel).toHaveLength(1);
    });

    it('threatIntel is undefined when none found', async () => {
      const agg = new ThreatIntelligenceAggregator([]);
      const report = {
        ok: true,
        verdict: 'clean' as const,
        matches: [],
        reasons: [],
        durationMs: 0,
        engine: 'heuristics',
        truncated: false,
        timedOut: false,
      };
      const enhanced = await agg.enhanceScanReport(new Uint8Array([1]), report);
      expect(enhanced.threatIntel).toBeUndefined();
    });
  });
});

// ─── createThreatIntelligence ─────────────────────────────────────────────────

describe('createThreatIntelligence', () => {
  it('returns a ThreatIntelligenceAggregator instance', () => {
    const agg = createThreatIntelligence();
    expect(agg).toBeInstanceOf(ThreatIntelligenceAggregator);
  });

  it('returned instance can check hashes', async () => {
    const agg = createThreatIntelligence();
    const results = await agg.checkHash('b'.repeat(64));
    expect(Array.isArray(results)).toBe(true);
  });
});
