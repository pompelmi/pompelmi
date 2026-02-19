import { describe, it, expect } from 'vitest';
import { composeScanners, createPresetScanner, PRESET_CONFIGS } from '../src/presets';
import type { Scanner, Match } from '../src/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScanner(matches: Match[]): Scanner {
  return async (_input: Uint8Array) => matches;
}

function makeErrorScanner(): Scanner {
  return async () => { throw new Error('scanner failure'); };
}

const noop = Buffer.alloc(4);

// ─── composeScanners ─────────────────────────────────────────────────────────

describe('composeScanners', () => {
  it('returns empty array when no scanners provided', async () => {
    const scanner = composeScanners();
    const result = await scanner(noop);
    expect(result).toEqual([]);
  });

  it('returns matches from a single scanner', async () => {
    const s = makeScanner([{ rule: 'rule_a', severity: 'suspicious' }]);
    const scanner = composeScanners(s);
    const result = await scanner(noop);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe('rule_a');
  });

  it('concatenates matches from multiple scanners', async () => {
    const s1 = makeScanner([{ rule: 'rule_a' }]);
    const s2 = makeScanner([{ rule: 'rule_b' }]);
    const scanner = composeScanners(s1, s2);
    const result = await scanner(noop);
    expect(result).toHaveLength(2);
    expect(result.map(m => m.rule)).toContain('rule_a');
    expect(result.map(m => m.rule)).toContain('rule_b');
  });

  it('ignores a scanner that throws (does not propagate error)', async () => {
    const s1 = makeScanner([{ rule: 'safe_rule' }]);
    const s2 = makeErrorScanner();
    const scanner = composeScanners(s1, s2);
    const result = await scanner(noop);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe('safe_rule');
  });

  it('ignores scanner returning non-array (null)', async () => {
    const s1: Scanner = async () => null as any;
    const s2 = makeScanner([{ rule: 'ok_rule' }]);
    const scanner = composeScanners(s1, s2);
    const result = await scanner(noop);
    expect(result.some(m => m.rule === 'ok_rule')).toBe(true);
  });

  it('works when all scanners throw', async () => {
    const scanner = composeScanners(makeErrorScanner(), makeErrorScanner());
    const result = await scanner(noop);
    expect(result).toEqual([]);
  });

  it('supports object-style scanners with a .scan() method', async () => {
    const objScanner = {
      scan: async (_input: Uint8Array) => [{ rule: 'from_object' }] as Match[],
    };
    const scanner = composeScanners(objScanner as any);
    const result = await scanner(noop);
    expect(result[0].rule).toBe('from_object');
  });

  it('passes context to scanners', async () => {
    let receivedCtx: any;
    const s: Scanner = async (_input: Uint8Array, ctx?: any) => {
      receivedCtx = ctx;
      return [];
    };
    const scanner = composeScanners(s);
    await scanner(noop, { fileName: 'test.bin' });
    expect(receivedCtx?.fileName).toBe('test.bin');
  });

  it('empty matches from all scanners yields empty result', async () => {
    const s1 = makeScanner([]);
    const s2 = makeScanner([]);
    const scanner = composeScanners(s1, s2);
    expect(await scanner(noop)).toEqual([]);
  });
});

// ─── createPresetScanner ─────────────────────────────────────────────────────

describe('createPresetScanner', () => {
  it('returns a callable scanner for basic preset', async () => {
    const scanner = createPresetScanner('basic');
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns a callable scanner for advanced preset', async () => {
    const scanner = createPresetScanner('advanced');
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns a callable scanner for malware-analysis preset', async () => {
    const scanner = createPresetScanner('malware-analysis');
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns a callable scanner for decompilation-basic preset', async () => {
    const scanner = createPresetScanner('decompilation-basic');
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns a callable scanner for decompilation-deep preset', async () => {
    const scanner = createPresetScanner('decompilation-deep');
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns a callable scanner for unknown preset string', async () => {
    const scanner = createPresetScanner('unknown-preset-xyz');
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('accepts PresetOptions without crashing', async () => {
    const scanner = createPresetScanner('basic', { timeout: 5000 });
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('enableDecompilation option does not throw', async () => {
    const scanner = createPresetScanner('basic', {
      enableDecompilation: true,
      decompilationEngine: 'binaryninja-hlil',
    });
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('decompilationEngine=both does not throw', async () => {
    const scanner = createPresetScanner('decompilation-deep', {
      decompilationEngine: 'both',
    });
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });

  it('decompilationEngine=ghidra-pcode does not throw', async () => {
    const scanner = createPresetScanner('decompilation-basic', {
      decompilationEngine: 'ghidra-pcode',
    });
    const result = await scanner(noop);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── PRESET_CONFIGS ──────────────────────────────────────────────────────────

describe('PRESET_CONFIGS', () => {
  it('exports basic, advanced, malware-analysis configs', () => {
    expect(PRESET_CONFIGS['basic']).toBeDefined();
    expect(PRESET_CONFIGS['advanced']).toBeDefined();
    expect(PRESET_CONFIGS['malware-analysis']).toBeDefined();
  });

  it('basic has a timeout', () => {
    expect(PRESET_CONFIGS['basic'].timeout).toBeGreaterThan(0);
  });

  it('advanced has a timeout', () => {
    expect(PRESET_CONFIGS['advanced'].timeout).toBeGreaterThan(0);
  });
});
