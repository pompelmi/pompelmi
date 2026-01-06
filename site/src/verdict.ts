// src/verdict.ts
import type { YaraMatch, Verdict } from './types';
export function mapMatchesToVerdict(matches: YaraMatch[] = []): Verdict {
  if (!matches.length) return 'clean';
  const malHints = ['trojan','ransom','worm','spy','rootkit','keylog','botnet'];
  const tagSet = new Set(matches.flatMap(m => (m.tags ?? []).map(t => t.toLowerCase())));
  const nameHit = (r: string) => malHints.some(h => r.toLowerCase().includes(h));
  const isMal = matches.some(m => nameHit(m.rule)) || tagSet.has('malware') || tagSet.has('critical');
  return isMal ? 'malicious' : 'suspicious';
}