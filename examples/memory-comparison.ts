#!/usr/bin/env node
/**
 * Example: Comparing buffer-based vs stream-based scanning
 * 
 * This example demonstrates the memory efficiency difference between
 * buffering an entire file vs. streaming it.
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { scan, scanStream } from '@pompelmi/core';
import { Readable } from 'node:stream';

async function createTestFile(sizeMB: number): Promise<string> {
  const filePath = `/tmp/test-file-${Date.now()}.bin`;
  const stream = createWriteStream(filePath);
  
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = sizeMB;
  
  for (let i = 0; i < totalChunks; i++) {
    const chunk = Buffer.alloc(chunkSize, `Chunk ${i}\n`.repeat(1000));
    stream.write(chunk);
  }
  
  stream.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

async function measureMemory<T>(fn: () => Promise<T>): Promise<{ result: T; memoryMB: number }> {
  const before = process.memoryUsage();
  const result = await fn();
  const after = process.memoryUsage();
  
  const memoryMB = (after.heapUsed - before.heapUsed) / (1024 * 1024);
  
  return { result, memoryMB };
}

async function main() {
  const sizeMB = parseInt(process.argv[2]) || 50; // Default 50MB test file
  
  console.log('🧪 Memory Efficiency Comparison');
  console.log('='.repeat(60));
  console.log(`\n📝 Creating ${sizeMB}MB test file...`);
  
  const filePath = await createTestFile(sizeMB);
  console.log(`✅ Test file created: ${filePath}\n`);

  try {
    // Test 1: Buffer-based scanning (loads entire file into memory)
    console.log('🔬 Test 1: Buffer-based scanning');
    console.log('-'.repeat(60));
    
    const bufferTest = await measureMemory(async () => {
      const stream = createReadStream(filePath);
      const chunks: Buffer[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      
      const buffer = Buffer.concat(chunks);
      const startTime = Date.now();
      const result = await scan(buffer);
      const duration = Date.now() - startTime;
      
      return { result, duration };
    });
    
    console.log(`   Verdict: ${bufferTest.result.result.verdict}`);
    console.log(`   Duration: ${bufferTest.result.duration}ms`);
    console.log(`   Memory delta: ${bufferTest.memoryMB.toFixed(2)} MB`);
    console.log(`   ⚠️  Loaded entire file into RAM\n`);

    // Test 2: Stream-based scanning (memory-efficient)
    console.log('🔬 Test 2: Stream-based scanning');
    console.log('-'.repeat(60));
    
    const streamTest = await measureMemory(async () => {
      const stream = createReadStream(filePath);
      const startTime = Date.now();
      const result = await scanStream(stream, {
        maxBufferSize: 10 * 1024 * 1024, // Only buffer 10MB
      });
      const duration = Date.now() - startTime;
      
      return { result, duration };
    });
    
    console.log(`   Verdict: ${streamTest.result.result.verdict}`);
    console.log(`   Duration: ${streamTest.result.duration}ms`);
    console.log(`   Memory delta: ${streamTest.memoryMB.toFixed(2)} MB`);
    console.log(`   ✅ Memory-efficient streaming\n`);

    // Comparison
    console.log('='.repeat(60));
    console.log('📊 COMPARISON');
    console.log('='.repeat(60));
    
    const memorySavings = ((bufferTest.memoryMB - streamTest.memoryMB) / bufferTest.memoryMB * 100).toFixed(1);
    const speedDiff = ((streamTest.result.duration - bufferTest.result.duration) / bufferTest.result.duration * 100).toFixed(1);
    
    console.log(`\n💾 Memory savings: ${memorySavings}%`);
    console.log(`   Buffer-based: ${bufferTest.memoryMB.toFixed(2)} MB`);
    console.log(`   Stream-based: ${streamTest.memoryMB.toFixed(2)} MB`);
    
    console.log(`\n⏱️  Performance difference: ${speedDiff}%`);
    console.log(`   Buffer-based: ${bufferTest.result.duration}ms`);
    console.log(`   Stream-based: ${streamTest.result.duration}ms`);
    
    console.log(`\n💡 Key Takeaway:`);
    console.log(`   For ${sizeMB}MB file, stream-based scanning used`);
    console.log(`   ${memorySavings}% less memory while maintaining good performance.`);
    console.log(`   For larger files (GB+), the difference is even more dramatic!\n`);

  } finally {
    // Cleanup
    await unlink(filePath);
    console.log('🧹 Test file cleaned up');
  }
}

main().catch(console.error);
