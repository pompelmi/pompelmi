// scripts/yara-node-smoke.ts
import { createYaraEngine } from '../src/yara/index';

const RULE = `
rule demo_contains_virus_literal {
  strings: $a = "virus" ascii nocase
  condition: $a
}
`;

const SAMPLE = new TextEncoder().encode('Hello VIRUS world!');

const engine = await createYaraEngine();
const compiled = await engine.compile(RULE);
const matches = await compiled.scan(SAMPLE);

console.log('Matches:', matches);