import fs from 'node:fs/promises';
import { createClamScanner } from '../packages/engine-clamav/dist/index.js';
const bytes = await fs.readFile('samples/marker.bin');
const res = await createClamScanner({ socket: '/var/run/clamav/clamd.ctl' }).scan(bytes);
console.log('ClamAV engine result:', res);
