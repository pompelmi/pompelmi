import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pompelmi = require('./index.js');
export const {
  scan,
  scanBuffer,
  scanStream,
  scanDirectory,
  scanS3,
  createPool,
  watch,
  middleware,
  createScanner,
  generateDashboard,
  generateShareCard,
  generateScorecard,
  notify,
  Verdict,
  createCache,
  createPolicy,
  createMultiEngine,
} = pompelmi;
export default pompelmi;
