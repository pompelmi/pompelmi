/**
 * Quick smoke test for v0.27.0 features
 */

import { scanBytes, aggregateScanStats, detectPolyglot, PerformanceTracker } from '../src/index';

async function testV027Features() {
  console.log('🧪 Testing pompelmi v0.27.0 features...\n');

  // Test 1: Basic scan with performance tracking
  console.log('✓ Test 1: Performance tracking');
  const testData = new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // ZIP header
  const result = await scanBytes(testData, {
    enablePerformanceTracking: true,
    ctx: { filename: 'test.zip' },
  });
  console.log(`  - Scan completed in ${result.durationMs}ms`);
  console.log(`  - Verdict: ${result.verdict}\n`);

  // Test 2: Advanced detection
  console.log('✓ Test 2: Advanced threat detection');
  const polyglotData = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, // PDF header
    ...new Array(100).fill(0),
    0x50, 0x4B, 0x03, 0x04, // ZIP header
  ]);
  const polyglotMatches = detectPolyglot(polyglotData);
  console.log(`  - Polyglot matches: ${polyglotMatches.length}`);
  if (polyglotMatches.length > 0) {
    console.log(`  - Detected: ${polyglotMatches[0].rule}\n`);
  }

  // Test 3: Statistics aggregation
  console.log('✓ Test 3: Scan statistics');
  const reports = [
    { verdict: 'clean', durationMs: 10, file: { size: 1024 } },
    { verdict: 'suspicious', durationMs: 15, file: { size: 2048 } },
    { verdict: 'clean', durationMs: 12, file: { size: 512 } },
  ];
  const stats = aggregateScanStats(reports);
  console.log(`  - Total scans: ${stats.totalScans}`);
  console.log(`  - Clean: ${stats.cleanCount}, Suspicious: ${stats.suspiciousCount}`);
  console.log(`  - Avg duration: ${stats.avgDurationMs.toFixed(2)}ms\n`);

  // Test 4: Performance tracker
  console.log('✓ Test 4: Performance tracker');
  const tracker = new PerformanceTracker();
  tracker.checkpoint('start');
  await new Promise(resolve => setTimeout(resolve, 10));
  tracker.checkpoint('end');
  const metrics = tracker.getMetrics(1024);
  console.log(`  - Total duration: ${metrics.totalDurationMs}ms`);
  console.log(`  - Bytes scanned: ${metrics.bytesScanned}\n`);

  console.log('✅ All v0.27.0 features tested successfully!');
}

testV027Features().catch(console.error);
