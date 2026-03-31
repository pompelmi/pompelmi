/**
 * Advanced scanning example with all v0.29.0 features
 * Demonstrates: caching, batch scanning, threat intelligence, exports, and configuration
 */

import * as fs from "fs/promises";
import * as path from "path";
import {
  BatchScanner,
  createConfig,
  createThreatIntelligence,
  exportScanResults,
  getDefaultCache,
  type ScanReport,
} from "pompelmi";

async function advancedScanningExample() {
  console.log("🚀 Pompelmi v0.29.0 - Advanced Features Demo\n");

  // 1. Configure the scanner with production-ready settings
  console.log("⚙️  Step 1: Configuring scanner...");
  const config = createConfig();
  config.loadPreset("production");

  // Customize configuration
  config.updateConfig({
    performance: {
      enableCache: true,
      maxConcurrency: 8,
      cacheOptions: {
        maxSize: 2000,
        ttl: 7200000, // 2 hours
        enableStats: true,
      },
    },
    callbacks: {
      onScanStart: (filename) => console.log(`  📄 Scanning: ${filename}`),
      onScanComplete: (report: ScanReport) => {
        const icon =
          report.verdict === "clean" ? "✅" : report.verdict === "suspicious" ? "⚠️" : "❌";
        console.log(`  ${icon} ${report.file?.name}: ${report.verdict}`);
      },
    },
  });

  // Validate configuration
  const validation = config.validate();
  if (!validation.valid) {
    console.error("❌ Configuration errors:", validation.errors);
    return;
  }
  console.log("✅ Configuration valid\n");

  // 2. Set up batch scanner
  console.log("📦 Step 2: Setting up batch scanner...");
  const scanner = new BatchScanner({
    preset: "advanced",
    config,
    enableCache: true,
    enablePerformanceTracking: true,
    concurrency: 8,
    onProgress: (completed, total, report) => {
      const percentage = ((completed / total) * 100).toFixed(1);
      console.log(`  Progress: ${completed}/${total} (${percentage}%)`);
    },
  });
  console.log("✅ Scanner ready\n");

  // 3. Scan sample files (create some test data)
  console.log("🔍 Step 3: Scanning files...");
  const testFiles = await createTestFiles();
  const scanResult = await scanner.scanFiles(testFiles);

  console.log(`\n📊 Scan Results:
    - Total files: ${scanResult.reports.length}
    - Successful: ${scanResult.successCount}
    - Errors: ${scanResult.errorCount}
    - Duration: ${scanResult.totalDurationMs}ms
    - Avg per file: ${(scanResult.totalDurationMs / scanResult.reports.length).toFixed(2)}ms
  `);

  // 4. Check cache performance
  console.log("\n💾 Step 4: Cache Performance...");
  const cache = getDefaultCache();
  const cacheStats = cache.getStats();
  console.log(`  - Cache size: ${cacheStats.size} entries`);
  console.log(`  - Hit rate: ${cacheStats.hitRate.toFixed(2)}%`);
  console.log(`  - Hits: ${cacheStats.hits} | Misses: ${cacheStats.misses}`);
  console.log(`  - Evictions: ${cacheStats.evictions}`);

  // 5. Enhance with threat intelligence
  console.log("\n🔒 Step 5: Threat Intelligence Analysis...");
  const threatIntel = createThreatIntelligence();
  const validReports = scanResult.reports.filter((r) => r !== null) as ScanReport[];

  for (const report of validReports.slice(0, 3)) {
    // Show first 3
    // Note: We'd need the original file data for this in a real scenario
    // This is just for demonstration
    console.log(`  - ${report.file?.name}: Risk Score would be calculated here`);
  }

  // 6. Export results in multiple formats
  console.log("\n📄 Step 6: Exporting results...");

  // JSON export
  const jsonReport = exportScanResults(validReports, "json", {
    prettyPrint: true,
    includeDetails: true,
  });
  await fs.writeFile("scan-results.json", jsonReport);
  console.log("  ✅ JSON report saved to: scan-results.json");

  // CSV export
  const csvReport = exportScanResults(validReports, "csv", {
    includeDetails: true,
  });
  await fs.writeFile("scan-results.csv", csvReport);
  console.log("  ✅ CSV report saved to: scan-results.csv");

  // Markdown export
  const mdReport = exportScanResults(validReports, "markdown", {
    includeDetails: true,
  });
  await fs.writeFile("scan-results.md", mdReport);
  console.log("  ✅ Markdown report saved to: scan-results.md");

  // HTML export
  const htmlReport = exportScanResults(validReports, "html", {
    includeDetails: true,
  });
  await fs.writeFile("scan-results.html", htmlReport);
  console.log("  ✅ HTML report saved to: scan-results.html");

  // SARIF export (for CI/CD)
  const sarifReport = exportScanResults(validReports, "sarif", {
    prettyPrint: true,
  });
  await fs.writeFile("scan-results.sarif", sarifReport);
  console.log("  ✅ SARIF report saved to: scan-results.sarif");

  // 7. Summary
  const cleanCount = validReports.filter((r) => r.verdict === "clean").length;
  const suspiciousCount = validReports.filter((r) => r.verdict === "suspicious").length;
  const maliciousCount = validReports.filter((r) => r.verdict === "malicious").length;

  console.log(`\n📊 Final Summary:
    ✅ Clean files: ${cleanCount}
    ⚠️  Suspicious files: ${suspiciousCount}
    ❌ Malicious files: ${maliciousCount}
    
    🎉 All features demonstrated successfully!
  `);

  // Cleanup
  await cleanupTestFiles(testFiles);
}

// Helper function to create test files
async function createTestFiles(): Promise<File[]> {
  const files: File[] = [];

  // Create some test data
  const testData = [
    { name: "clean-file.txt", content: "This is a clean text file." },
    { name: "test-image.png", content: "\x89PNG\r\n\x1a\n" + "fake image data" },
    { name: "sample-data.json", content: '{"test": "data"}' },
  ];

  for (const { name, content } of testData) {
    const blob = new Blob([content], { type: "application/octet-stream" });
    const file = new File([blob], name);
    files.push(file);
  }

  return files;
}

// Helper function to cleanup
async function cleanupTestFiles(files: File[]): Promise<void> {
  // In browser environment, files are in memory, no cleanup needed
  // In Node environment, you might want to delete temporary files
  console.log("\n🧹 Cleanup completed");
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  advancedScanningExample().catch(console.error);
}

export { advancedScanningExample };
