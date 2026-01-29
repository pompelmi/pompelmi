/**
 * Simple cache usage example
 */

import { scanBytes, getDefaultCache } from 'pompelmi';
import * as fs from 'fs/promises';

async function cacheExample() {
  console.log('💾 Cache Example\n');

  // Read a test file
  const fileData = await fs.readFile('samples/clean.txt');
  const bytes = new Uint8Array(fileData);

  // First scan (cache miss)
  console.log('🔍 First scan (no cache)...');
  const start1 = Date.now();
  const report1 = await scanBytes(bytes, { enableCache: true });
  const duration1 = Date.now() - start1;
  console.log(`  ✅ Completed in ${duration1}ms`);
  console.log(`  Verdict: ${report1.verdict}\n`);

  // Second scan (cache hit)
  console.log('🔍 Second scan (cached)...');
  const start2 = Date.now();
  const report2 = await scanBytes(bytes, { enableCache: true });
  const duration2 = Date.now() - start2;
  console.log(`  ✅ Completed in ${duration2}ms`);
  console.log(`  Verdict: ${report2.verdict}\n`);

  // Show improvement
  const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(1);
  console.log(`⚡ Performance improvement: ${improvement}%\n`);

  // Cache statistics
  const cache = getDefaultCache();
  const stats = cache.getStats();
  console.log('📊 Cache Statistics:');
  console.log(`  - Size: ${stats.size}`);
  console.log(`  - Hits: ${stats.hits}`);
  console.log(`  - Misses: ${stats.misses}`);
  console.log(`  - Hit Rate: ${stats.hitRate.toFixed(2)}%`);
}

cacheExample().catch(console.error);
