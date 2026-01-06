import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { scanDir } from '../src/node/scanDir';

// ------------------------------------------------------------
// Setup test directory and sample files
// ------------------------------------------------------------
const dir = resolve(process.cwd(), 'tmp-yara-int');
await mkdir(dir, { recursive: true });

// Base files
await writeFile(resolve(dir, 'sample.txt'), 'hello VIRUS world');
await writeFile(resolve(dir, 'clean.txt'), 'just a clean file with nothing suspicious');

// Big file (~2 MiB) with VIRUS in the middle (to test maxFileSizeBytes skip and file-based hit)
const bigHalf = 1024 * 1024; // 1 MiB
const bigContent = 'A'.repeat(bigHalf) + 'VIRUS' + 'B'.repeat(bigHalf);
await writeFile(resolve(dir, 'big.txt'), bigContent);

// Tail-placed virus (to test sampling miss/hit)
const tailContent = 'A'.repeat(4096) + 'VIRUS' + 'C'.repeat(100);
await writeFile(resolve(dir, 'tail_virus.txt'), tailContent);

// Head-placed virus (sampling very small should still catch)
await writeFile(resolve(dir, 'head_virus.txt'), 'VIRUS' + 'X'.repeat(256));

// Binary file containing VIRUS as raw bytes (to test includeExtensions filter)
const binBuf = Buffer.concat([Buffer.alloc(10), Buffer.from('VIRUS'), Buffer.alloc(10)]);
await writeFile(resolve(dir, 'binary.bin'), binBuf);

// Ensure rules file exists
const RULE = `
rule demo_contains_virus_literal {
  strings: $a = "virus" ascii nocase
  condition: $a
}
`;
const rulesDir = resolve(process.cwd(), 'rules');
await mkdir(rulesDir, { recursive: true });
const rulesPath = resolve(rulesDir, 'demo.yar');
await writeFile(rulesPath, RULE);

// Files of interest for reporting/assertions
const TARGET_FILES = new Set([
  'sample.txt',
  'clean.txt',
  'big.txt',
  'tail_virus.txt',
  'head_virus.txt',
  'binary.bin',
]);

type CaseOpts = Parameters<typeof scanDir>[1];
type CaseRow = {
  matches: string[];
  status?: string;
  reason?: string;
  mode?: string;
};

async function collect(caseName: string, opts: CaseOpts) {
  const results: Record<string, CaseRow> = {};
  for await (const entry of scanDir(dir, opts as any)) {
    const name =
      (entry.path && basename(entry.path)) ||
      (entry.absPath && basename(entry.absPath)) ||
      '';
    if (!TARGET_FILES.has(name)) continue;

    results[name] = {
      matches: (entry.yara?.matches ?? []).map((m) => m.rule),
      status: entry.yara?.status,
      reason: entry.yara?.reason,
      mode: entry.yara?.mode,
    };
  }
  return results;
}

function printResults(title: string, results: Record<string, CaseRow>) {
  console.log(`\n===== ${title} =====`);
  console.dir(results, { depth: null });
}

// ------------------------------------------------------------
// Minimal assert helper
// ------------------------------------------------------------
const failures: string[] = [];
function expect(cond: unknown, msg: string) {
  if (!cond) {
    failures.push(msg);
    console.error('❌', msg);
  } else {
    console.log('✅', msg);
  }
}
function get(
  results: Record<string, CaseRow>,
  file: string
): CaseRow & { matches: string[] } {
  const row = results[file];
  if (!row) return { matches: [], status: undefined, reason: undefined, mode: undefined };
  return row;
}
function hasRule(row: CaseRow, rule = 'demo_contains_virus_literal') {
  return !!row.matches?.includes(rule);
}

// ------------------------------------------------------------
// CASES
// ------------------------------------------------------------

// 1) Baseline: rules from PATH + async on
const case1 = await collect('baseline rulesPath + async', {
  enableYara: true,
  yaraRulesPath: rulesPath,
  yaraAsync: true,
});
printResults('1) baseline (rulesPath + async)', case1);
// Assertions
expect(hasRule(get(case1, 'sample.txt')), 'case1: sample.txt should match');
expect(!hasRule(get(case1, 'clean.txt')), 'case1: clean.txt should NOT match');
expect(hasRule(get(case1, 'head_virus.txt')), 'case1: head_virus.txt should match');
expect(hasRule(get(case1, 'tail_virus.txt')), 'case1: tail_virus.txt should match (full file path)');
expect(hasRule(get(case1, 'binary.bin')), 'case1: binary.bin should match');
expect(hasRule(get(case1, 'big.txt')), 'case1: big.txt should match');

// 2) Rules from STRING instead of path
const case2 = await collect('rules from string', {
  enableYara: true,
  yaraRules: RULE,
  yaraAsync: true,
});
printResults('2) rules from string (async)', case2);
// Assertions
expect(hasRule(get(case2, 'sample.txt')), 'case2: sample.txt should match');
expect(!hasRule(get(case2, 'clean.txt')), 'case2: clean.txt should NOT match');

// 3) includeExtensions: only .txt => binary.bin should be marked skipped/filtered-ext
const case3 = await collect('includeExtensions .txt only', {
  enableYara: true,
  yaraRules: RULE,
  yaraAsync: true,
  includeExtensions: ['.txt'],
});
printResults('3) includeExtensions=[".txt"]', case3);
// Assertions
{
  const bin = get(case3, 'binary.bin');
  expect(bin.status === 'skipped' && bin.reason === 'filtered-ext', 'case3: binary.bin should be skipped with reason=filtered-ext');
  const txt = get(case3, 'sample.txt');
  expect(txt.status === 'scanned', 'case3: sample.txt should be scanned');
}

// 4) maxFileSizeBytes small -> big.txt, head_virus.txt, tail_virus.txt should be skipped
const case4 = await collect('maxFileSizeBytes=100', {
  enableYara: true,
  yaraRules: RULE,
  yaraAsync: true,
  maxFileSizeBytes: 100,
});
printResults('4) maxFileSizeBytes=100 (big/head/tail skipped)', case4);
// Assertions
['big.txt', 'head_virus.txt', 'tail_virus.txt'].forEach((f) => {
  const row = get(case4, f);
  expect(row.status === 'skipped' && row.reason === 'max-size', `case4: ${f} should be skipped with reason=max-size`);
});
expect(hasRule(get(case4, 'sample.txt')), 'case4: sample.txt should still match');
expect(hasRule(get(case4, 'binary.bin')), 'case4: binary.bin should still match');

// 5) Sampling too small (force buffer): should MISS tail_virus.txt, HIT head_virus.txt
const case5 = await collect('sample too small', {
  enableYara: true,
  yaraRules: RULE,
  yaraSampleBytes: 16, // too small to reach "VIRUS" at offset ~4096
  yaraPreferBuffer: true, // force buffer path to activate sampling
});
printResults('5) yaraSampleBytes=16 (tail_virus miss atteso)', case5);
// Assertions
{
  const tail = get(case5, 'tail_virus.txt');
  expect(tail.status === 'scanned' && tail.mode === 'buffer-sampled', 'case5: tail_virus.txt should be scanned via buffer-sampled');
  expect(!hasRule(tail), 'case5: tail_virus.txt should NOT match with 16-byte sampling');

  const head = get(case5, 'head_virus.txt');
  expect(head.status === 'scanned' && head.mode === 'buffer-sampled', 'case5: head_virus.txt should be scanned via buffer-sampled');
  expect(hasRule(head), 'case5: head_virus.txt SHOULD match (virus at head of file)');

  const big = get(case5, 'big.txt');
  expect(big.status === 'scanned' && big.mode === 'buffer-sampled', 'case5: big.txt should be scanned via buffer-sampled');
  expect(!hasRule(big), 'case5: big.txt should NOT match with small sampling');
}

// 6) Sampling large enough (force buffer): should HIT tail_virus.txt, big.txt still miss (token at ~1MiB)
const case6 = await collect('sample large enough', {
  enableYara: true,
  yaraRules: RULE,
  yaraSampleBytes: 8192, // enough to include the "VIRUS" in tail_virus.txt
  yaraPreferBuffer: true, // force buffer path to activate sampling
});
printResults('6) yaraSampleBytes=8192 (tail_virus hit atteso)', case6);
// Assertions
{
  const tail = get(case6, 'tail_virus.txt');
  expect(tail.status === 'scanned' && tail.mode === 'buffer-sampled', 'case6: tail_virus.txt should be scanned via buffer-sampled');
  expect(hasRule(tail), 'case6: tail_virus.txt SHOULD match with 8192-byte sampling');

  const big = get(case6, 'big.txt');
  expect(big.status === 'scanned' && big.mode === 'buffer-sampled', 'case6: big.txt should be scanned via buffer-sampled');
  expect(!hasRule(big), 'case6: big.txt should NOT match with 8192-byte sampling');
}

// 6b) No sampling (file-based): big.txt should HIT
const case6b = await collect('no sampling (file-based)', {
  enableYara: true,
  yaraRules: RULE,
  yaraAsync: true,
  // no yaraPreferBuffer, no yaraSampleBytes -> file/async path
});
printResults('6b) file-based (big.txt hit atteso)', case6b);
// Assertions
{
  const big = get(case6b, 'big.txt');
  expect(hasRule(big), 'case6b: big.txt SHOULD match (file/async path)');
  expect(['async', 'file'].includes(big.mode ?? ''), 'case6b: big.txt mode should be async or file');
}

// 7) Sync fallback (no async): big.txt should HIT (file path)
const case7 = await collect('sync fallback', {
  enableYara: true,
  yaraRules: RULE,
  yaraAsync: false, // force non-async path
});
printResults('7) sync fallback (yaraAsync=false)', case7);
// Assertions
{
  const big = get(case7, 'big.txt');
  expect(hasRule(big), 'case7: big.txt SHOULD match (sync fallback)');
  // Most implementations will use 'file' here; accept also 'buffer' if file-based not available
  expect(['file', 'buffer', 'buffer-sampled'].includes(big.mode ?? ''), 'case7: big.txt mode should be file/buffer/buffer-sampled');
}

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log('\n✅ All assertions passed.');
}