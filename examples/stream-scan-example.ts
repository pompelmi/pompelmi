#!/usr/bin/env node
/**
 * Example: Stream-based file scanning for large files
 * 
 * This example demonstrates how to use the memory-efficient stream scanner
 * to scan large files without loading them entirely into RAM.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { scanStream } from '@pompelmi/core';

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: tsx stream-scan-example.ts <file-path>');
    console.error('\nExample:');
    console.error('  tsx stream-scan-example.ts /path/to/large-file.bin');
    process.exit(1);
  }

  console.log('🔍 Scanning file with stream-based scanner...');
  console.log(`📁 File: ${filePath}\n`);

  try {
    // Get file size
    const stats = await stat(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 File size: ${fileSizeMB} MB`);

    // Create read stream
    const stream = createReadStream(filePath, {
      highWaterMark: 64 * 1024, // 64KB chunks for efficient reading
    });

    // Scan with stream scanner (memory-efficient)
    const startTime = Date.now();
    const result = await scanStream(stream, {
      maxBufferSize: 10 * 1024 * 1024, // Only buffer 10MB for signature matching
      failFast: true, // Stop at first threat
    });
    const duration = Date.now() - startTime;

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📋 SCAN RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Verdict: ${getVerdictEmoji(result.verdict)} ${result.verdict.toUpperCase()}`);
    console.log(`📏 Bytes scanned: ${result.bytes.toLocaleString()}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🧮 Throughput: ${((result.bytes / (1024 * 1024)) / (duration / 1000)).toFixed(2)} MB/s`);

    if (result.findings.length > 0) {
      console.log(`\n⚠️  Findings:`);
      result.findings.forEach((finding, i) => {
        console.log(`   ${i + 1}. ${finding}`);
      });
    } else {
      console.log(`\n✅ No threats detected`);
    }

    console.log('\n' + '='.repeat(60));

    // Exit with appropriate code
    process.exit(result.verdict === 'malicious' ? 1 : 0);

  } catch (error) {
    console.error(`\n❌ Error scanning file:`, error);
    process.exit(2);
  }
}

function getVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case 'clean': return '✅';
    case 'suspicious': return '⚠️';
    case 'malicious': return '🚨';
    default: return '❓';
  }
}

main();
