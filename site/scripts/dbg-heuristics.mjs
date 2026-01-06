import fs from 'node:fs/promises';
import { createHeuristicsScanner } from '../packages/engine-heuristics/dist/index.js';
const bytes = await fs.readFile('samples/php_rfi_test.php');
const res = await createHeuristicsScanner().scan(bytes);
console.log('Heuristics (marker.bin):', res);
