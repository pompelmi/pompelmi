/**
 * Performance monitoring utilities for scan operations
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  durationMs?: number;
  bytesProcessed: number;
  throughputMBps?: number;
}

/**
 * Create a performance monitor for tracking scan operations
 */
export function createPerformanceMonitor(): {
  start: () => void;
  end: (bytesProcessed: number) => PerformanceMetrics;
  getMetrics: () => PerformanceMetrics;
} {
  const metrics: PerformanceMetrics = {
    startTime: 0,
    bytesProcessed: 0,
  };

  return {
    start() {
      metrics.startTime = Date.now();
    },
    
    end(bytesProcessed: number) {
      metrics.endTime = Date.now();
      metrics.durationMs = metrics.endTime - metrics.startTime;
      metrics.bytesProcessed = bytesProcessed;
      
      // Calculate throughput in MB/s
      if (metrics.durationMs > 0) {
        const bytesPerMs = bytesProcessed / metrics.durationMs;
        metrics.throughputMBps = (bytesPerMs * 1000) / (1024 * 1024);
      }
      
      return { ...metrics };
    },
    
    getMetrics() {
      return { ...metrics };
    }
  };
}

/**
 * Format performance metrics as a human-readable string
 */
export function formatPerformanceMetrics(metrics: PerformanceMetrics): string {
  const { durationMs, bytesProcessed, throughputMBps } = metrics;
  
  const sizeMB = (bytesProcessed / (1024 * 1024)).toFixed(2);
  const duration = durationMs ? `${durationMs}ms` : 'N/A';
  const throughput = throughputMBps ? `${throughputMBps.toFixed(2)} MB/s` : 'N/A';
  
  return `Processed ${sizeMB} MB in ${duration} (${throughput})`;
}
