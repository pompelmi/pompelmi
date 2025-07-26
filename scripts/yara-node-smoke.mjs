// scripts/yara-node-smoke.mjs
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Import runtime della tua facciata (userà l’engine Node)
import { createYaraEngine } from '../src/yara/index';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RULE = `
rule demo_contains_virus_literal {
  meta:
    author = "local-file-scanner"
  strings:
    $s1 = "virus" ascii nocase
  condition:
    any of them
}
`;

const SAMPLE = new TextEncoder().encode('Hello VIRUS world!');

const engine = await createYaraEngine();
const compiled = await engine.compile(RULE);
const matches = await compiled.scan(SAMPLE);

console.log('Matches:', matches);