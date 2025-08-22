function indexOfBytes(hay: Uint8Array, pat: number[], from = 0) {
  outer: for (let i = from; i <= hay.length - pat.length; i++) {
    for (let j = 0; j < pat.length; j++) {
      if (hay[i + j] !== pat[j]) continue outer;
    }
    return i;
  }
  return -1;
}

const SECOND_MAGICS = [
  { tag: 'MZ', bytes: [0x4D, 0x5A] },
  { tag: 'ELF', bytes: [0x7F, 0x45, 0x4C, 0x46] },
  { tag: 'PK', bytes: [0x50, 0x4B, 0x03, 0x04] },
];

const ACTIVE_TOKENS = [
  '<script', '<iframe', '<?php', '<?=', '<svg', 'onload=', 'onerror=', 'javascript:'
];

export async function scanPolyglot(buf: Uint8Array) {
  const findings: { rule: string; severity: 'suspicious' | 'warning'; msg: string }[] = [];

  for (const m of SECOND_MAGICS) {
    const first = indexOfBytes(buf, m.bytes, 0);
    if (first > 0) {
      findings.push({ rule: 'polyglot.magic.second', severity: 'suspicious', msg: m.tag });
    }
  }

  const lower = new TextDecoder('utf-8', { fatal: false }).decode(buf).toLowerCase();
  for (const t of ACTIVE_TOKENS) {
    const i = lower.indexOf(t);
    if (i > 1024) {
      findings.push({ rule: 'polyglot.trailing.payload', severity: 'suspicious', msg: t });
    }
  }

  return findings;
}
