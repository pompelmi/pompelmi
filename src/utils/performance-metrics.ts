/**
 * Performance monitoring utilities for pompelmi scans
 * @module utils/performance-metrics
 */

export interface PerformanceMetrics {
  /** Total scan duration in milliseconds */
  totalDurationMs: number;
  /** Time spent in heuristic analysis */
  heuristicsDurationMs?: number;
  /** Time spent in YARA scanning */
  yaraDurationMs?: number;
  /** Time spent reading/preparing file */
  prepDurationMs?: number;
  /** Throughput in bytes per second */
  throughputBps?: number;
  /** Number of bytes scanned */
  bytesScanned: number;
  /** Timestamp when scan started */
  startedAt: number;
  /** Timestamp when scan completed */
  completedAt: number;
}

export interface ScanStatistics {
  /** Total number of scans performed */
  totalScans: number;
  /** Number of clean files */
  cleanCount: number;
  /** Number of suspicious files */
  suspiciousCount: number;
  /** Number of malicious files */
  maliciousCount: number;
  /** Average scan duration */
  avgDurationMs: number;
  /** Average throughput */
  avgThroughputBps: number;
  /** Total bytes scanned */
  totalBytesScanned: number;
}

/**
 * Track performance metrics for a scan operation
 */
export class PerformanceTracker {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();
  
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a checkpoint in the scan process
   */
  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now());
  }

  /**
   * Get duration since start or since a specific checkpoint
   */
  getDuration(since?: string): number {
    const now = Date.now();
    if (since && this.checkpoints.has(since)) {
      return now - (this.checkpoints.get(since) ?? now);
    }
    return now - this.startTime;
  }

  /**
   * Generate final metrics report
   */
  getMetrics(bytesScanned: number): PerformanceMetrics {
    const totalDuration = this.getDuration();
    const throughput = totalDuration > 0 ? (bytesScanned / totalDuration) * 1000 : 0;

    return {
      totalDurationMs: totalDuration,
      heuristicsDurationMs: this.checkpoints.has('heuristics_end') 
        ? (this.checkpoints.get('heuristics_end') ?? 0) - (this.checkpoints.get('heuristics_start') ?? 0)
        : undefined,
      yaraDurationMs: this.checkpoints.has('yara_end')
        ? (this.checkpoints.get('yara_end') ?? 0) - (this.checkpoints.get('yara_start') ?? 0)
        : undefined,
      prepDurationMs: this.checkpoints.has('prep_end')
        ? (this.checkpoints.get('prep_end') ?? 0) - this.startTime
        : undefined,
      throughputBps: throughput,
      bytesScanned,
      startedAt: this.startTime,
      completedAt: Date.now(),
    };
  }
}

/**
 * Aggregate statistics from multiple scan reports
 */
export function aggregateScanStats(reports: Array<{ verdict: string; durationMs?: number; file?: { size?: number } }>): ScanStatistics {
  let cleanCount = 0;
  let suspiciousCount = 0;
  let maliciousCount = 0;
  let totalDuration = 0;
  let totalBytes = 0;
  let validDurationCount = 0;

  for (const report of reports) {
    if (report.verdict === 'clean') cleanCount++;
    else if (report.verdict === 'suspicious') suspiciousCount++;
    else if (report.verdict === 'malicious') maliciousCount++;

    if (report.durationMs !== undefined) {
      totalDuration += report.durationMs;
      validDurationCount++;
    }

    if (report.file?.size !== undefined) {
      totalBytes += report.file.size;
    }
  }

  const avgDuration = validDurationCount > 0 ? totalDuration / validDurationCount : 0;
  const avgThroughput = totalDuration > 0 ? (totalBytes / totalDuration) * 1000 : 0;

  return {
    totalScans: reports.length,
    cleanCount,
    suspiciousCount,
    maliciousCount,
    avgDurationMs: avgDuration,
    avgThroughputBps: avgThroughput,
    totalBytesScanned: totalBytes,
  };
}
