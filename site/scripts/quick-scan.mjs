import fs from 'node:fs/promises';
import { createHeuristicsScanner, composeScanners } from '../packages/engine-heuristics/dist/index.js';
import { createYaraScanner } from '../packages/engine-yara/dist/index.js';
import { createClamScanner } from '../packages/engine-clamav/dist/index.js';

// Use the safe marker file instead of EICAR
const bytes = await fs.readFile('samples/marker.bin');

const scanner = composeScanners([
  createHeuristicsScanner(),
  createYaraScanner({ rulesGlob: 'rules/**/*.yar' }),         // will match pompelmi_test_marker
  createClamScanner({ socket: '/var/run/clamav/clamd.ctl' }), // optional; safely returns [] if clamscan/clamd missing
]);

const res = await scanner.scan(bytes);
console.log(res);
