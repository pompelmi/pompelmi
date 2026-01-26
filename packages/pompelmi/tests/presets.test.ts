import { describe, it, expect } from 'vitest';
import { applyPreset, getPreset, listPresets, PRESETS, type PresetName } from '../src/presets/index.js';

describe('Policy Presets', () => {
  describe('listPresets', () => {
    it('should return all preset names', () => {
      const presets = listPresets();
      expect(presets).toEqual(['strict', 'balanced', 'fast']);
    });
  });

  describe('getPreset', () => {
    it('should return strict preset configuration', () => {
      const preset = getPreset('strict');
      expect(preset).toEqual({
        maxDepth: 2,
        heuristicThreshold: 60,
        maxBufferSize: 5 * 1024 * 1024,
        failFast: true,
      });
    });

    it('should return balanced preset configuration', () => {
      const preset = getPreset('balanced');
      expect(preset).toEqual({
        maxDepth: 4,
        heuristicThreshold: 75,
        maxBufferSize: 10 * 1024 * 1024,
        failFast: false,
      });
    });

    it('should return fast preset configuration', () => {
      const preset = getPreset('fast');
      expect(preset).toEqual({
        maxDepth: 1,
        heuristicThreshold: 85,
        maxBufferSize: 20 * 1024 * 1024,
        failFast: true,
      });
    });

    it('should throw for invalid preset name', () => {
      expect(() => getPreset('invalid' as PresetName)).toThrow('Invalid preset');
    });
  });

  describe('applyPreset', () => {
    it('should return empty object when no preset specified', () => {
      const result = applyPreset({});
      expect(result).toEqual({});
    });

    it('should apply strict preset defaults', () => {
      const result = applyPreset({ preset: 'strict' });
      expect(result).toEqual({
        maxDepth: 2,
        heuristicThreshold: 60,
        maxBufferSize: 5 * 1024 * 1024,
        failFast: true,
      });
    });

    it('should apply balanced preset defaults', () => {
      const result = applyPreset({ preset: 'balanced' });
      expect(result).toEqual({
        maxDepth: 4,
        heuristicThreshold: 75,
        maxBufferSize: 10 * 1024 * 1024,
        failFast: false,
      });
    });

    it('should apply fast preset defaults', () => {
      const result = applyPreset({ preset: 'fast' });
      expect(result).toEqual({
        maxDepth: 1,
        heuristicThreshold: 85,
        maxBufferSize: 20 * 1024 * 1024,
        failFast: true,
      });
    });

    it('should allow explicit options to override preset', () => {
      const result = applyPreset({
        preset: 'strict',
        maxDepth: 10,
        failFast: false,
      });
      
      expect(result).toEqual({
        maxDepth: 10, // overridden
        heuristicThreshold: 60, // from preset
        maxBufferSize: 5 * 1024 * 1024, // from preset
        failFast: false, // overridden
      });
    });

    it('should handle partial overrides', () => {
      const result = applyPreset({
        preset: 'balanced',
        maxBufferSize: 50 * 1024 * 1024,
      });
      
      expect(result).toEqual({
        maxDepth: 4,
        heuristicThreshold: 75,
        maxBufferSize: 50 * 1024 * 1024, // overridden
        failFast: false,
      });
    });

    it('should throw for invalid preset name', () => {
      expect(() => applyPreset({ preset: 'invalid' as PresetName })).toThrow('Invalid preset');
    });

    it('should not include preset key in result', () => {
      const result = applyPreset({ preset: 'strict' });
      expect(result).not.toHaveProperty('preset');
    });
  });

  describe('PRESETS constant', () => {
    it('should have strict preset with security-focused defaults', () => {
      expect(PRESETS.strict.maxDepth).toBeLessThan(PRESETS.balanced.maxDepth);
      expect(PRESETS.strict.heuristicThreshold).toBeLessThan(PRESETS.balanced.heuristicThreshold);
      expect(PRESETS.strict.maxBufferSize).toBeLessThan(PRESETS.balanced.maxBufferSize);
      expect(PRESETS.strict.failFast).toBe(true);
    });

    it('should have fast preset with performance-focused defaults', () => {
      expect(PRESETS.fast.maxDepth).toBeLessThan(PRESETS.balanced.maxDepth);
      expect(PRESETS.fast.heuristicThreshold).toBeGreaterThan(PRESETS.balanced.heuristicThreshold);
      expect(PRESETS.fast.maxBufferSize).toBeGreaterThan(PRESETS.balanced.maxBufferSize);
      expect(PRESETS.fast.failFast).toBe(true);
    });

    it('should have balanced preset as middle ground', () => {
      expect(PRESETS.balanced.maxDepth).toBeGreaterThan(PRESETS.strict.maxDepth);
      expect(PRESETS.balanced.maxDepth).toBeGreaterThan(PRESETS.fast.maxDepth);
    });
  });
});
