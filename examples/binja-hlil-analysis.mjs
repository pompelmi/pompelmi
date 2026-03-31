#!/usr/bin/env node

/**
 * Binary Ninja HLIL Decompilation Example
 *
 * This example demonstrates how to use the Binary Ninja HLIL engine
 * to analyze binary files for malicious patterns through decompilation.
 */

import { createBinaryNinjaScanner } from "@pompelmi/engine-binaryninja";
import * as fs from "fs/promises";
import * as path from "path";

async function main() {
  console.log("🔍 Binary Ninja HLIL Analysis Example\n");

  // Check if binary file is provided
  const binaryPath = process.argv[2];
  if (!binaryPath) {
    console.error("Usage: node binja-example.js <binary-file>");
    console.error("Example: node binja-example.js suspicious.exe");
    process.exit(1);
  }

  try {
    // Check if file exists
    const stats = await fs.stat(binaryPath);
    console.log(`📁 Analyzing: ${path.basename(binaryPath)}`);
    console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB\n`);

    // Create Binary Ninja scanner with configuration
    const scanner = createBinaryNinjaScanner({
      timeout: 60000, // 60 second timeout
      depth: "basic", // Basic analysis depth
      enableHeuristics: true, // Enable pattern detection
      pythonPath: "python3", // Python executable
      // binaryNinjaPath: '/path/to/binaryninja' // Uncomment if needed
    });

    // Read binary file
    console.log("📖 Reading binary file...");
    const bytes = await fs.readFile(binaryPath);

    // Perform analysis
    console.log("🔬 Starting Binary Ninja HLIL analysis...");
    const startTime = Date.now();

    const result = await scanner.analyze(bytes);

    const analysisTime = Date.now() - startTime;
    console.log(`⏱️  Analysis completed in ${analysisTime}ms\n`);

    if (!result.success) {
      console.error("❌ Analysis failed:", result.meta?.error);
      process.exit(1);
    }

    // Display results
    console.log("📋 Analysis Results:");
    console.log("=".repeat(50));

    // Binary metadata
    if (result.meta) {
      console.log(`🏗️  Architecture: ${result.meta.architecture || "Unknown"}`);
      console.log(`📦 Binary Format: ${result.meta.binaryFormat || "Unknown"}`);
      console.log(`⚡ Analysis Time: ${result.meta.analysisTime?.toFixed(2)}s`);
      console.log(`🔧 Total Functions: ${result.meta.functionCount || "Unknown"}`);
    }
    console.log();

    // Function analysis
    if (result.functions.length > 0) {
      console.log(`🎯 Analyzed Functions (${result.functions.length}):`);
      console.log("-".repeat(30));

      result.functions.slice(0, 10).forEach((func, i) => {
        console.log(`${i + 1}. ${func.name} @ ${func.address}`);
        console.log(`   Size: ${func.size} bytes, Complexity: ${func.complexity || "N/A"}`);

        if (func.isObfuscated) {
          console.log("   ⚠️  High complexity (possible obfuscation)");
        }

        if (func.hasAntiAnalysis) {
          console.log("   🚨 Anti-analysis techniques detected");
        }

        if (func.suspiciousCalls && func.suspiciousCalls.length > 0) {
          console.log(`   🔍 Suspicious calls: ${func.suspiciousCalls.join(", ")}`);
        }

        console.log();
      });

      if (result.functions.length > 10) {
        console.log(`... and ${result.functions.length - 10} more functions\n`);
      }
    } else {
      console.log("No functions analyzed\n");
    }

    // Security matches
    if (result.matches.length > 0) {
      console.log(`🚨 Security Findings (${result.matches.length}):`);
      console.log("-".repeat(30));

      result.matches.forEach((match, i) => {
        const severityEmoji = {
          low: "🟡",
          medium: "🟠",
          high: "🔴",
          critical: "🚫",
        }[match.severity || "medium"];

        console.log(`${i + 1}. ${severityEmoji} ${match.rule}`);
        console.log(`   Severity: ${match.severity?.toUpperCase() || "MEDIUM"}`);
        console.log(`   Confidence: ${(match.confidence * 100).toFixed(1)}%`);

        if (match.meta?.function) {
          console.log(`   Function: ${match.meta.function}`);
        }

        if (match.meta?.address) {
          console.log(`   Address: ${match.meta.address}`);
        }

        if (match.meta?.api_call) {
          console.log(`   API Call: ${match.meta.api_call}`);
        }

        console.log();
      });
    } else {
      console.log("✅ No suspicious patterns detected\n");
    }

    // Summary
    const riskLevel = result.matches.some((m) => m.severity === "critical")
      ? "CRITICAL"
      : result.matches.some((m) => m.severity === "high")
        ? "HIGH"
        : result.matches.some((m) => m.severity === "medium")
          ? "MEDIUM"
          : result.matches.length > 0
            ? "LOW"
            : "CLEAN";

    const riskEmoji = {
      CRITICAL: "🚫",
      HIGH: "🔴",
      MEDIUM: "🟠",
      LOW: "🟡",
      CLEAN: "✅",
    }[riskLevel];

    console.log("📊 Summary:");
    console.log("=".repeat(50));
    console.log(`${riskEmoji} Overall Risk: ${riskLevel}`);
    console.log(`🔧 Functions Analyzed: ${result.functions.length}`);
    console.log(`🚨 Security Findings: ${result.matches.length}`);
    console.log(`⏱️  Total Time: ${analysisTime}ms`);
  } catch (error) {
    console.error("\n❌ Error during analysis:");

    if (error.code === "ENOENT") {
      console.error("File not found:", binaryPath);
    } else if (error.message?.includes("Binary Ninja")) {
      console.error("Binary Ninja not available or not configured properly");
      console.error("Please ensure:");
      console.error("- Binary Ninja is installed");
      console.error("- Python can import binaryninja module");
      console.error("- BINJA_PATH environment variable is set (if needed)");
    } else {
      console.error(error.message || "Unknown error");
    }

    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
