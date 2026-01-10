/**
 * @pompelmi/core - Advanced Polyglot Detection Example
 * 
 * This example demonstrates the advanced magic bytes detection and
 * polyglot file analysis capabilities added in the MVP improvements.
 */

import { createReadStream } from 'node:fs';
import {
  scan,
  MagicBytesDetector,
  detectFormat,
  detectPolyglot,
  analyzeSecurityRisks,
  DEFAULT_SIGNATURES,
} from '@pompelmi/core';

// ──────────────────────────────────────────────────────────────────────────
// Example 1: Basic Format Detection
// ──────────────────────────────────────────────────────────────────────────

async function example1_basicDetection() {
  console.log('\n=== Example 1: Basic Format Detection ===\n');
  
  // Detect PE executable
  const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
  const peResult = detectFormat(peHeader);
  
  console.log('PE Executable:', {
    detected: peResult.detected,
    format: peResult.format,
    mimeType: peResult.mimeType,
    suspicious: peResult.suspicious,
  });
  
  // Detect PNG image
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngResult = detectFormat(pngHeader);
  
  console.log('\nPNG Image:', {
    detected: pngResult.detected,
    format: pngResult.format,
    mimeType: pngResult.mimeType,
    suspicious: pngResult.suspicious,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Example 2: Polyglot Detection
// ──────────────────────────────────────────────────────────────────────────

async function example2_polyglotDetection() {
  console.log('\n=== Example 2: Polyglot Detection ===\n');
  
  // Create a polyglot file (ZIP with PE header)
  const polyglotBuffer = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP signature
    Buffer.alloc(50),
    Buffer.from([0x4d, 0x5a]), // PE signature
  ]);
  
  const polyglotResult = detectPolyglot(polyglotBuffer);
  
  console.log('Polyglot Analysis:', {
    isPolyglot: polyglotResult.isPolyglot,
    formats: polyglotResult.formats,
    mimeTypes: polyglotResult.mimeTypes,
    suspicious: polyglotResult.suspicious,
    reason: polyglotResult.reason,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Example 3: Security Risk Analysis
// ──────────────────────────────────────────────────────────────────────────

async function example3_securityAnalysis() {
  console.log('\n=== Example 3: Security Risk Analysis ===\n');
  
  // Image with embedded PHP backdoor
  const maliciousImage = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
    Buffer.from('<?php system($_GET["cmd"]); ?>'),
  ]);
  
  const analysis = analyzeSecurityRisks(maliciousImage);
  
  console.log('Security Analysis:', {
    isExecutable: analysis.isExecutable,
    isPolyglot: analysis.isPolyglot,
    hasEmbeddedScripts: analysis.hasEmbeddedScripts,
    suspicious: analysis.suspicious,
    reasons: analysis.reasons,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Example 4: Custom Signatures
// ──────────────────────────────────────────────────────────────────────────

async function example4_customSignatures() {
  console.log('\n=== Example 4: Custom Signatures ===\n');
  
  // Create detector with custom signature
  const detector = new MagicBytesDetector();
  
  // Add custom signature for proprietary format
  detector.addSignature({
    name: 'Custom Malware Signature',
    mimeType: 'application/x-malware',
    extensions: ['.mal'],
    pattern: Buffer.from('MALWARE_SIG_2024'),
    suspicious: true,
  });
  
  // Test custom signature
  const customBuffer = Buffer.from('MALWARE_SIG_2024 payload data');
  const result = detector.detect(customBuffer);
  
  console.log('Custom Detection:', {
    detected: result.detected,
    format: result.format,
    suspicious: result.suspicious,
  });
  
  // List all signatures
  const signatures = detector.getSignatures();
  console.log(`\nTotal signatures registered: ${signatures.length}`);
  console.log('Executable signatures:', signatures.filter(s => s.suspicious).length);
}

// ──────────────────────────────────────────────────────────────────────────
// Example 5: Integration with scan()
// ──────────────────────────────────────────────────────────────────────────

async function example5_scanIntegration() {
  console.log('\n=== Example 5: Integration with scan() ===\n');
  
  // Scan various file types
  const testCases = [
    {
      name: 'Clean Text',
      buffer: Buffer.from('Hello World'),
    },
    {
      name: 'PE Executable',
      buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
    },
    {
      name: 'Image with PHP backdoor',
      buffer: Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from('<?php eval($_POST["x"]); ?>'),
      ]),
    },
    {
      name: 'EICAR Test File',
      buffer: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
    },
  ];
  
  for (const testCase of testCases) {
    const result = await scan(testCase.buffer);
    
    console.log(`\n${testCase.name}:`);
    console.log('  Verdict:', result.verdict);
    console.log('  Findings:', result.findings.length);
    if (result.findings.length > 0) {
      result.findings.forEach(f => console.log(`    - ${f}`));
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Example 6: Real-world Polyglot Attack Scenario
// ──────────────────────────────────────────────────────────────────────────

async function example6_polyglotAttack() {
  console.log('\n=== Example 6: Polyglot Attack Scenario ===\n');
  
  // Simulate a sophisticated polyglot attack:
  // Valid JPEG that also contains a PHP web shell
  const sophisticatedPolyglot = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), // JPEG header
    Buffer.from('JFIF'),
    Buffer.alloc(100), // Image data
    Buffer.from('\n<?php\n'),
    Buffer.from('// Hidden web shell\n'),
    Buffer.from('if (isset($_GET["cmd"])) {\n'),
    Buffer.from('  system($_GET["cmd"]);\n'),
    Buffer.from('}\n'),
    Buffer.from('?>\n'),
  ]);
  
  // Analyze the polyglot
  const formatResult = detectFormat(sophisticatedPolyglot);
  const securityAnalysis = analyzeSecurityRisks(sophisticatedPolyglot);
  const scanResult = await scan(sophisticatedPolyglot);
  
  console.log('File appears to be:', formatResult.format);
  console.log('MIME type:', formatResult.mimeType);
  console.log('\nSecurity Analysis:');
  console.log('  Embedded scripts:', securityAnalysis.hasEmbeddedScripts);
  console.log('  Is polyglot:', securityAnalysis.isPolyglot);
  console.log('  Suspicious:', securityAnalysis.suspicious);
  console.log('\nRisk factors:');
  securityAnalysis.reasons.forEach(r => console.log(`  - ${r}`));
  console.log('\nScan Verdict:', scanResult.verdict);
  console.log('Scan Findings:');
  scanResult.findings.forEach(f => console.log(`  - ${f}`));
}

// ──────────────────────────────────────────────────────────────────────────
// Run all examples
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   @pompelmi/core - Advanced Polyglot Detection Examples    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    await example1_basicDetection();
    await example2_polyglotDetection();
    await example3_securityAnalysis();
    await example4_customSignatures();
    await example5_scanIntegration();
    await example6_polyglotAttack();
    
    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
    process.exit(1);
  }
}

main();
