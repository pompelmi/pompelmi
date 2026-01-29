# 🚀 Pompelmi v0.29.0 - New Features Guide

## Overview

Version 0.29.0 introduces powerful new features to enhance scanning capabilities, performance, and integration options.

## 🆕 New Features

### 1. **Result Caching System** 🗄️

Significantly improve performance for repeated scans with LRU/LFU cache support.

```typescript
import { scanBytes, getDefaultCache } from 'pompelmi';

// Enable caching
const report = await scanBytes(fileData, {
  enableCache: true
});

// Get cache statistics
const cache = getDefaultCache();
const stats = cache.getStats();
console.log(`Hit rate: ${stats.hitRate}%`);
```

**Features:**
- LRU (Least Recently Used) or LFU (Least Frequently Used) eviction
- Configurable TTL (time-to-live)
- Cache statistics and monitoring
- Memory-efficient with size limits

### 2. **Batch Scanning with Concurrency Control** ⚡

Scan multiple files efficiently with controlled parallelism.

```typescript
import { BatchScanner } from 'pompelmi';

const scanner = new BatchScanner({
  concurrency: 10, // Process 10 files at once
  preset: 'advanced',
  onProgress: (completed, total, report) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});

const result = await scanner.scanFiles(files);
console.log(`Scanned ${result.successCount} files in ${result.totalDurationMs}ms`);
```

**Features:**
- Configurable concurrency limits
- Progress callbacks
- Error handling with continue-on-error option
- Batch statistics and reporting

### 3. **Threat Intelligence Integration** 🔒

Enhance detection with threat intelligence databases.

```typescript
import { createThreatIntelligence } from 'pompelmi';

const threatIntel = createThreatIntelligence();

// Enhance scan report with threat intelligence
const enhancedReport = await threatIntel.enhanceScanReport(fileData, report);

console.log(`Risk Score: ${enhancedReport.riskScore}/100`);
if (enhancedReport.threatIntel) {
  console.log('Known threats detected!', enhancedReport.threatIntel);
}
```

**Features:**
- Local threat database
- Extensible architecture for custom sources
- Risk scoring algorithm
- Hash-based threat lookup

### 4. **Advanced Export Capabilities** 📊

Export scan results in multiple formats for reporting and CI/CD integration.

```typescript
import { exportScanResults } from 'pompelmi';

// Export to various formats
const jsonReport = exportScanResults(reports, 'json', { prettyPrint: true });
const csvReport = exportScanResults(reports, 'csv');
const htmlReport = exportScanResults(reports, 'html');
const markdownReport = exportScanResults(reports, 'markdown');

// SARIF format for CI/CD integration
const sarifReport = exportScanResults(reports, 'sarif');
```

**Supported Formats:**
- **JSON**: Machine-readable, API-friendly
- **CSV**: Spreadsheet import, data analysis
- **Markdown**: Documentation, GitHub issues
- **HTML**: Visual reports with styling
- **SARIF**: CI/CD integration (GitHub, Azure DevOps)

### 5. **Comprehensive Configuration System** ⚙️

Flexible configuration with presets for common scenarios.

```typescript
import { createConfig, CONFIG_PRESETS } from 'pompelmi';

// Use a preset
const config = createConfig();
config.loadPreset('production');

// Or customize
const customConfig = createConfig({
  performance: {
    enableCache: true,
    maxConcurrency: 10
  },
  security: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    strictMode: true
  },
  advanced: {
    enablePolyglotDetection: true,
    maxArchiveDepth: 10
  },
  callbacks: {
    onScanComplete: (report) => {
      console.log('Scan completed:', report.verdict);
    }
  }
});

// Validate configuration
const validation = config.validate();
if (!validation.valid) {
  console.error('Config errors:', validation.errors);
}
```

**Available Presets:**
- `fast`: Quick scanning with minimal features
- `balanced`: Recommended default
- `thorough`: All features enabled
- `production`: Production-ready configuration
- `development`: Developer-friendly settings

### 6. **Enhanced Performance Tracking** 📈

Detailed performance metrics for optimization.

```typescript
const report = await scanBytes(fileData, {
  enablePerformanceTracking: true
});

console.log('Performance Metrics:', report.performanceMetrics);
// {
//   totalDurationMs: 150,
//   heuristicsDurationMs: 50,
//   prepDurationMs: 10,
//   throughputBps: 1000000,
//   ...
// }
```

## 📚 Complete Example

```typescript
import { 
  BatchScanner, 
  createConfig, 
  exportScanResults,
  createThreatIntelligence 
} from 'pompelmi';

// 1. Configure scanner
const config = createConfig({
  performance: {
    enableCache: true,
    maxConcurrency: 5
  },
  security: {
    enableThreatIntel: true
  }
});

// 2. Create batch scanner
const scanner = new BatchScanner({
  preset: 'advanced',
  config,
  onProgress: (completed, total) => {
    console.log(`Scanning: ${completed}/${total}`);
  }
});

// 3. Scan files
const result = await scanner.scanFiles(files);

// 4. Export results
const htmlReport = exportScanResults(result.reports, 'html', {
  includeDetails: true
});

// Save report
await fs.writeFile('scan-report.html', htmlReport);

console.log(`
  ✅ Clean: ${result.reports.filter(r => r?.verdict === 'clean').length}
  ⚠️  Suspicious: ${result.reports.filter(r => r?.verdict === 'suspicious').length}
  ❌ Malicious: ${result.reports.filter(r => r?.verdict === 'malicious').length}
`);
```

## 🎯 Migration Guide

### From v0.28.0 to v0.29.0

All existing APIs remain backward compatible. New features are opt-in:

```typescript
// Before (still works)
const report = await scanBytes(data);

// After (with new features)
const report = await scanBytes(data, {
  enableCache: true,
  enablePerformanceTracking: true,
  config: {
    security: { strictMode: true }
  }
});
```

## 🔧 Configuration Options

See [config.ts](./src/config.ts) for complete configuration reference:

- **Performance**: Caching, concurrency, parallel processing
- **Security**: File size limits, timeouts, strict mode
- **Advanced**: Polyglot detection, obfuscation detection, archive analysis
- **Logging**: Verbosity, log levels, statistics
- **Callbacks**: Hooks for scan events

## 📦 Bundle Size Impact

New features are tree-shakeable and add minimal overhead:

- Cache system: ~2KB gzipped
- Batch scanner: ~1.5KB gzipped
- Threat intelligence: ~3KB gzipped
- Export utilities: ~4KB gzipped
- Configuration: ~2KB gzipped

Only import what you need!

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📝 License

MIT - see [LICENSE](./LICENSE)
