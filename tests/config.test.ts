import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  CONFIG_PRESETS,
  ConfigManager,
  createConfig,
  getPresetConfig,
} from '../src/config';

describe('DEFAULT_CONFIG', () => {
  it('has a defaultPreset', () => {
    expect(DEFAULT_CONFIG.defaultPreset).toBeDefined();
  });

  it('has performance settings', () => {
    expect(DEFAULT_CONFIG.performance?.enableParallel).toBe(true);
    expect(DEFAULT_CONFIG.performance?.maxConcurrency).toBeGreaterThan(0);
  });

  it('has security settings with a positive maxFileSize', () => {
    expect(DEFAULT_CONFIG.security?.maxFileSize).toBeGreaterThan(0);
  });

  it('has advanced detection enabled by default', () => {
    expect(DEFAULT_CONFIG.advanced?.enablePolyglotDetection).toBe(true);
    expect(DEFAULT_CONFIG.advanced?.enableNestedArchiveAnalysis).toBe(true);
  });

  it('has logging set to info level', () => {
    expect(DEFAULT_CONFIG.logging?.level).toBe('info');
  });
});

describe('CONFIG_PRESETS', () => {
  it('exposes fast, balanced, thorough, production, development presets', () => {
    const keys = Object.keys(CONFIG_PRESETS);
    ['fast', 'balanced', 'thorough', 'production', 'development'].forEach(k => {
      expect(keys).toContain(k);
    });
  });

  it('fast preset disables polyglot detection', () => {
    expect(CONFIG_PRESETS.fast.advanced?.enablePolyglotDetection).toBe(false);
  });

  it('thorough preset enables strict mode', () => {
    expect(CONFIG_PRESETS.thorough.security?.strictMode).toBe(true);
  });

  it('thorough preset uses debug logging', () => {
    expect(CONFIG_PRESETS.thorough.logging?.level).toBe('debug');
  });

  it('production preset enables caching', () => {
    expect(CONFIG_PRESETS.production.performance?.enableCache).toBe(true);
  });

  it('development preset disables cache', () => {
    expect(CONFIG_PRESETS.development.performance?.enableCache).toBe(false);
  });
});

describe('ConfigManager', () => {
  describe('constructor', () => {
    it('creates with default config when no argument given', () => {
      const mgr = new ConfigManager();
      const cfg = mgr.getConfig();
      expect(cfg.logging?.level).toBe('info');
    });

    it('merges provided partial config over defaults', () => {
      const mgr = new ConfigManager({ logging: { verbose: true, level: 'debug' } });
      const cfg = mgr.getConfig();
      expect(cfg.logging?.verbose).toBe(true);
      expect(cfg.logging?.level).toBe('debug');
    });

    it('keeps default security settings when not overridden', () => {
      const mgr = new ConfigManager({ logging: { level: 'warn' } });
      expect(mgr.getConfig().security?.maxFileSize).toBe(DEFAULT_CONFIG.security?.maxFileSize);
    });
  });

  describe('getConfig', () => {
    it('returns a copy (mutations do not affect internal state)', () => {
      const mgr = new ConfigManager();
      const copy = mgr.getConfig() as any;
      copy.logging = { level: 'error' };
      expect(mgr.getConfig().logging?.level).toBe('info');
    });
  });

  describe('updateConfig', () => {
    it('updates a top-level section', () => {
      const mgr = new ConfigManager();
      mgr.updateConfig({ logging: { verbose: true, level: 'debug' } });
      expect(mgr.getConfig().logging?.verbose).toBe(true);
    });

    it('deep-merges nested objects', () => {
      const mgr = new ConfigManager();
      const original = mgr.getConfig().performance?.maxConcurrency;
      mgr.updateConfig({ security: { strictMode: true } });
      // performance should be unchanged
      expect(mgr.getConfig().performance?.maxConcurrency).toBe(original);
    });

    it('can update callbacks', () => {
      const mgr = new ConfigManager();
      const onStart = () => {};
      mgr.updateConfig({ callbacks: { onScanStart: onStart } });
      expect(mgr.getConfig().callbacks?.onScanStart).toBe(onStart);
    });
  });

  describe('loadPreset', () => {
    it('loads the fast preset', () => {
      const mgr = new ConfigManager();
      mgr.loadPreset('fast');
      expect(mgr.getConfig().advanced?.enablePolyglotDetection).toBe(false);
    });

    it('loads the thorough preset', () => {
      const mgr = new ConfigManager();
      mgr.loadPreset('thorough');
      expect(mgr.getConfig().security?.strictMode).toBe(true);
    });

    it('loads the production preset', () => {
      const mgr = new ConfigManager();
      mgr.loadPreset('production');
      expect(mgr.getConfig().performance?.enableCache).toBe(true);
    });

    it('loads the development preset', () => {
      const mgr = new ConfigManager();
      mgr.loadPreset('development');
      expect(mgr.getConfig().logging?.verbose).toBe(true);
    });

    it('loads the balanced preset', () => {
      const mgr = new ConfigManager();
      mgr.loadPreset('balanced');
      expect(mgr.getConfig().logging?.level).toBe('info');
    });
  });

  describe('reset', () => {
    it('restores to default after updates', () => {
      const mgr = new ConfigManager();
      mgr.updateConfig({ logging: { verbose: true, level: 'error' } });
      mgr.reset();
      expect(mgr.getConfig().logging?.level).toBe('info');
    });

    it('restores to default after loadPreset', () => {
      const mgr = new ConfigManager();
      mgr.loadPreset('thorough');
      mgr.reset();
      expect(mgr.getConfig().security?.strictMode).toBe(DEFAULT_CONFIG.security?.strictMode);
    });
  });

  describe('get / set', () => {
    it('get returns the value for a key', () => {
      const mgr = new ConfigManager();
      const perf = mgr.get('performance');
      expect(perf?.maxConcurrency).toBeGreaterThan(0);
    });

    it('set overrides the value for a key', () => {
      const mgr = new ConfigManager();
      mgr.set('logging', { verbose: true, level: 'debug' });
      expect(mgr.get('logging')?.level).toBe('debug');
    });

    it('set to undefined is accepted', () => {
      const mgr = new ConfigManager();
      mgr.set('callbacks', undefined);
      expect(mgr.get('callbacks')).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('returns valid:true for the default config', () => {
      const mgr = new ConfigManager();
      expect(mgr.validate().valid).toBe(true);
    });

    it('returns error when maxConcurrency < 1', () => {
      const mgr = new ConfigManager({ performance: { maxConcurrency: 0 } });
      const { valid, errors } = mgr.validate();
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('maxConcurrency'))).toBe(true);
    });

    it('returns error when maxConcurrency > 50', () => {
      const mgr = new ConfigManager({ performance: { maxConcurrency: 100 } });
      const { valid, errors } = mgr.validate();
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('maxConcurrency'))).toBe(true);
    });

    it('returns error when maxFileSize < 1024', () => {
      const mgr = new ConfigManager({ security: { maxFileSize: 512 } });
      const { valid, errors } = mgr.validate();
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('maxFileSize'))).toBe(true);
    });

    it('returns error when scanTimeout < 1000', () => {
      const mgr = new ConfigManager({ security: { scanTimeout: 500 } });
      const { valid, errors } = mgr.validate();
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('scanTimeout'))).toBe(true);
    });

    it('returns error when maxArchiveDepth < 1', () => {
      const mgr = new ConfigManager({ advanced: { maxArchiveDepth: 0 } });
      const { valid, errors } = mgr.validate();
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('maxArchiveDepth'))).toBe(true);
    });

    it('returns error when maxArchiveDepth > 20', () => {
      const mgr = new ConfigManager({ advanced: { maxArchiveDepth: 25 } });
      const { valid, errors } = mgr.validate();
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('maxArchiveDepth'))).toBe(true);
    });

    it('accumulates multiple errors', () => {
      const mgr = new ConfigManager({
        performance: { maxConcurrency: 0 },
        security: { maxFileSize: 100 },
      });
      const { valid, errors } = mgr.validate();
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('round-trips configuration through JSON', () => {
      const mgr = new ConfigManager({ logging: { verbose: true, level: 'debug' } });
      const json = mgr.toJSON();
      const mgr2 = new ConfigManager();
      mgr2.fromJSON(json);
      expect(mgr2.getConfig().logging?.verbose).toBe(true);
      expect(mgr2.getConfig().logging?.level).toBe('debug');
    });

    it('toJSON returns valid JSON string', () => {
      const mgr = new ConfigManager();
      expect(() => JSON.parse(mgr.toJSON())).not.toThrow();
    });

    it('fromJSON throws on invalid JSON', () => {
      const mgr = new ConfigManager();
      expect(() => mgr.fromJSON('{invalid json')).toThrow();
    });
  });
});

describe('createConfig', () => {
  it('returns a ConfigManager instance', () => {
    const mgr = createConfig();
    expect(mgr).toBeInstanceOf(ConfigManager);
  });

  it('applies provided options', () => {
    const mgr = createConfig({ logging: { verbose: true, level: 'warn' } });
    expect(mgr.getConfig().logging?.verbose).toBe(true);
  });
});

describe('getPresetConfig', () => {
  it('returns a config object for each preset key', () => {
    const presetKeys = Object.keys(CONFIG_PRESETS) as Array<keyof typeof CONFIG_PRESETS>;
    for (const key of presetKeys) {
      const cfg = getPresetConfig(key);
      expect(cfg).toBeDefined();
      expect(typeof cfg).toBe('object');
    }
  });

  it('fast preset does not have polyglot detection', () => {
    const cfg = getPresetConfig('fast');
    expect(cfg.advanced?.enablePolyglotDetection).toBe(false);
  });

  it('thorough preset has strictMode enabled', () => {
    const cfg = getPresetConfig('thorough');
    expect(cfg.security?.strictMode).toBe(true);
  });
});
