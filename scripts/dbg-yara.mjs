import fs from 'node:fs/promises';
import { createYaraScanner } from '../packages/engine-yara/dist/index.js';

const bytes = await fs.readFile('samples/marker.bin');
const scanner = createYaraScanner({ rulesGlob: 'rules/**/*.yar' });
const res = await scanner.scan(bytes);
console.log('YARA engine result:', res);
