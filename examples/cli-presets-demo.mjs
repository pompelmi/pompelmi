#!/usr/bin/env node
/**
 * CLI Demo: pompelmi Policy Presets and Reason Codes
 * 
 * This script demonstrates:
 * - Using different policy presets
 * - Interpreting reason codes
 * - Automated decision-making
 * - Formatting scan results
 */

import { scan, ReasonCode, getReasonCodeInfo, listPresets, getPreset } from 'pompelmi';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${color}${text}${colors.reset}`;
}

function printHeader(text) {
  console.log('\n' + colorize(`━━━ ${text} ━━━`, colors.bold + colors.cyan));
}

function printPresetInfo(presetName) {
  const preset = getPreset(presetName);
  const width = 60;
  
  console.log(colorize(`\n╔${'═'.repeat(width)}╗`, colors.gray));
  console.log(colorize(`║ ${colorize(`Preset: ${presetName.toUpperCase()}`, colors.bold).padEnd(width - 2)}║`, colors.gray));
  console.log(colorize(`╠${'═'.repeat(width)}╣`, colors.gray));
  console.log(colorize(`║ Max Depth:           ${String(preset.maxDepth).padEnd(width - 23)}║`, colors.gray));
  console.log(colorize(`║ Max Buffer:          ${(preset.maxBufferSize / 1024 / 1024).toFixed(0)}MB`.padEnd(width)+ '║', colors.gray));
  console.log(colorize(`║ Heuristic Threshold: ${preset.heuristicThreshold}/100`.padEnd(width) + '║', colors.gray));
  console.log(colorize(`║ Fail Fast:           ${preset.failFast ? 'Yes' : 'No'}`.padEnd(width) + '  ║', colors.gray));
  console.log(colorize(`╚${'═'.repeat(width)}╝`, colors.gray));
}

function formatScanResult(result, fileName) {
  const verdictColors = {
    clean: colors.green,
    suspicious: colors.yellow,
    malicious: colors.red,
  };

  console.log(`\n${colorize('File:', colors.bold)} ${fileName}`);
  console.log(`${colorize('Size:', colors.bold)} ${result.bytes} bytes`);
  console.log(`${colorize('Verdict:', colors.bold)} ${colorize(result.verdict.toUpperCase(), verdictColors[result.verdict])}`);
  console.log(`${colorize('Duration:', colors.bold)} ${result.durationMs}ms`);

  if (result.findingsWithReasons && result.findingsWithReasons.length > 0) {
    console.log(`\n${colorize('Findings:', colors.bold)}`);
    
    for (const finding of result.findingsWithReasons) {
      const info = getReasonCodeInfo(finding.reasonCode);
      const severityColor = info.severity === 'malicious' ? colors.red :
                           info.severity === 'suspicious' ? colors.yellow :
                           colors.green;
      
      console.log(`  ${colorize('●', severityColor)} ${colorize(finding.reasonCode, colors.bold)}`);
      console.log(`    ${finding.message}`);
      console.log(`    ${colorize(`[${info.severity}]`, severityColor)} ${info.description}`);
      
      if (finding.metadata) {
        console.log(`    ${colorize('metadata:', colors.gray)} ${JSON.stringify(finding.metadata)}`);
      }
    }
  } else {
    console.log(`\n${colorize('✓', colors.green)} No threats detected`);
  }
}

function determineAction(result) {
  const reasonCodes = result.findingsWithReasons?.map(f => f.reasonCode) || [];
  
  // Auto-reject malware (except EICAR test)
  const hasMalware = reasonCodes.some(code => 
    code.startsWith('MALWARE_') && code !== 'MALWARE_EICAR_TEST'
  );
  
  if (hasMalware) {
    return { action: 'reject', reason: 'Malware detected' };
  }

  // Detect EICAR test
  if (reasonCodes.includes(ReasonCode.MALWARE_EICAR_TEST)) {
    return { action: 'test', reason: 'EICAR test file (safe)' };
  }

  // Quarantine suspicious patterns
  const needsReview = reasonCodes.some(code =>
    [
      ReasonCode.FILE_POLYGLOT,
      ReasonCode.FILE_EMBEDDED_SCRIPT,
      ReasonCode.ARCHIVE_TOO_DEEP,
      ReasonCode.FILE_MACRO_DETECTED
    ].includes(code)
  );

  if (needsReview) {
    return { action: 'quarantine', reason: 'Requires manual review' };
  }

  // Allow clean files
  return { action: 'allow', reason: 'No threats detected' };
}

function printAction(action) {
  const actionColors = {
    allow: colors.green,
    reject: colors.red,
    quarantine: colors.yellow,
    test: colors.cyan,
  };

  console.log(`\n${colorize('═'.repeat(65), colors.gray)}`);
  console.log(`${colorize('Decision:', colors.bold)} ${colorize(action.action.toUpperCase(), actionColors[action.action])}`);
  console.log(`${colorize('Reason:', colors.bold)} ${action.reason}`);
  console.log(`${colorize('═'.repeat(65), colors.gray)}`);
}

async function scanWithPreset(filePath, presetName) {
  printHeader(`Scanning with ${presetName.toUpperCase()} preset`);
  printPresetInfo(presetName);

  try {
    const buffer = await readFile(filePath);
    const fileName = basename(filePath);

    console.log(colorize(`\nScanning ${fileName}...`, colors.cyan));
    const result = await scan(buffer, { preset: presetName });

    formatScanResult(result, fileName);
    const action = determineAction(result);
    printAction(action);

    return result;
  } catch (error) {
    console.error(colorize(`\n✗ Error: ${error.message}`, colors.red));
    throw error;
  }
}

async function showPresets() {
  printHeader('Available Policy Presets');
  
  const presets = listPresets();
  console.log(`\nPompelmi offers ${colorize(presets.length, colors.bold)} policy presets:\n`);

  for (const presetName of presets) {
    const preset = getPreset(presetName);
    const useCases = {
      strict: 'High-security, untrusted uploads',
      balanced: 'General production use (recommended)',
      fast: 'Performance-critical, trusted sources',
    };

    console.log(colorize(`${presetName.toUpperCase()}:`, colors.bold));
    console.log(`  Use case: ${useCases[presetName]}`);
    console.log(`  Max depth: ${preset.maxDepth} | Buffer: ${(preset.maxBufferSize / 1024 / 1024).toFixed(0)}MB | Threshold: ${preset.heuristicThreshold}/100 | Fail fast: ${preset.failFast ? 'Yes' : 'No'}`);
    console.log();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
${colorize('pompelmi CLI Demo - Policy Presets & Reason Codes', colors.bold + colors.cyan)}

${colorize('USAGE:', colors.bold)}
  node cli-presets-demo.mjs <file> [preset]
  node cli-presets-demo.mjs --presets

${colorize('ARGUMENTS:', colors.bold)}
  file      File path to scan
  preset    Policy preset: strict | balanced | fast (default: balanced)

${colorize('OPTIONS:', colors.bold)}
  --presets    List all available presets
  --help, -h   Show this help message

${colorize('EXAMPLES:', colors.bold)}
  # Scan with balanced preset (default)
  node cli-presets-demo.mjs test.txt

  # Scan with strict preset
  node cli-presets-demo.mjs test.txt strict

  # Scan with fast preset
  node cli-presets-demo.mjs large-file.zip fast

  # List available presets
  node cli-presets-demo.mjs --presets

  # Test with EICAR
  echo 'X5O!P%@AP[4\\\\PZX54(P^)7CC)7}\\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\\$H+H*' > eicar.txt
  node cli-presets-demo.mjs eicar.txt

${colorize('REASON CODES:', colors.bold)}
  The scanner returns structured reason codes for automated decision-making:
  - MALWARE_* codes → Auto-reject
  - FILE_POLYGLOT, ARCHIVE_TOO_DEEP → Quarantine for review
  - CLEAN → Allow upload

${colorize('LEARN MORE:', colors.bold)}
  https://github.com/pompelmi/pompelmi
`);
    return;
  }

  if (args[0] === '--presets') {
    await showPresets();
    return;
  }

  const filePath = args[0];
  const preset = args[1] || 'balanced';

  if (!['strict', 'balanced', 'fast'].includes(preset)) {
    console.error(colorize(`\n✗ Invalid preset: ${preset}`, colors.red));
    console.error(`Valid presets: strict, balanced, fast`);
    process.exit(1);
  }

  try {
    await scanWithPreset(filePath, preset);
  } catch (error) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(colorize(`\n✗ Fatal error: ${error.message}`, colors.red));
  process.exit(1);
});
