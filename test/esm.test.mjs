import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import pompelmi, {
  scan,
  scanBuffer,
  scanStream,
  scanDirectory,
  scanS3,
  createPool,
  watch,
  middleware,
  createScanner,
  generateDashboard,
  generateShareCard,
  notify,
  Verdict,
} from '../src/index.mjs';

describe('ESM import', () => {
  it('named exports are all functions or objects', () => {
    assert.strictEqual(typeof scan, 'function');
    assert.strictEqual(typeof scanBuffer, 'function');
    assert.strictEqual(typeof scanStream, 'function');
    assert.strictEqual(typeof scanDirectory, 'function');
    assert.strictEqual(typeof scanS3, 'function');
    assert.strictEqual(typeof createPool, 'function');
    assert.strictEqual(typeof watch, 'function');
    assert.strictEqual(typeof middleware, 'function');
    assert.strictEqual(typeof createScanner, 'function');
    assert.strictEqual(typeof generateDashboard, 'function');
    assert.strictEqual(typeof generateShareCard, 'function');
    assert.strictEqual(typeof notify, 'function');
    assert.strictEqual(typeof Verdict, 'object');
  });

  it('Verdict symbols match CJS require', async () => {
    const { createRequire } = await import('module');
    const req = createRequire(import.meta.url);
    const cjsVerdicts = req('../src/verdicts.js');
    assert.strictEqual(Verdict.Clean, cjsVerdicts.Verdict.Clean);
    assert.strictEqual(Verdict.Malicious, cjsVerdicts.Verdict.Malicious);
    assert.strictEqual(Verdict.ScanError, cjsVerdicts.Verdict.ScanError);
  });

  it('default export contains all named exports', () => {
    assert.strictEqual(pompelmi.scan, scan);
    assert.strictEqual(pompelmi.scanBuffer, scanBuffer);
    assert.strictEqual(pompelmi.Verdict, Verdict);
  });
});
