import { describe, it, expect } from 'vitest';

import { composeScanners } from '../packages/engine-heuristics/src/index';
import type { Verdict } from '../src';

type TestScanResult = { verdict: Verdict; tags?: string[] };

const mk = (verdict: Verdict, delay = 0, name?: string) => async (_b: Uint8Array) => {
  await new Promise(r => setTimeout(r, delay));
  return { verdict, tags: name ? [name] : [] } as TestScanResult;
};

describe('composeScanners', () => {
  const bytes = new Uint8Array([0x00]);

  it('sequential stop on suspicious', async () => {
    const scanner = composeScanners(
      [['a', mk('clean')], ['b', mk('suspicious', 0, 'b')], ['c', mk('malicious')]],
      { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
    );
    const out = await scanner(bytes);
    expect(out.verdict).toBe('suspicious');
    expect(out.tags?.some(t => /b/.test(t))).toBe(true);
  });

  it('parallel malicious wins', async () => {
    const scanner = composeScanners(
      [['a', mk('clean', 50)], ['b', mk('malicious', 10)]],
      { parallel: true, stopOn: 'malicious', timeoutMsPerScanner: 1500, tagSourceName: true }
    );
    const out = await scanner(bytes);
    expect(out.verdict).toBe('malicious');
  });

  it('timeouts are tolerated', async () => {
    const slow = mk('clean', 2000);
    const fast = mk('clean', 10);
    const scanner = composeScanners([['slow', slow], ['fast', fast]],
      { parallel: true, timeoutMsPerScanner: 200, tagSourceName: true });
    const out = await scanner(bytes);
    expect(out.verdict).toBe('clean');
  });
});
