/**
 * Batch scanning with concurrency control
 * @module utils/batch-scanner
 */

import type { ScanReport, ScanContext } from '../types';
import { scanBytes, type ScanOptions } from '../scan';

export interface BatchScanOptions extends Omit<ScanOptions, 'ctx'> {
  /** Maximum concurrent scans (default: 5) */
  concurrency?: number;
  /** Callback for individual scan completion */
  onProgress?: (completed: number, total: number, report: ScanReport) => void;
  /** Callback for individual scan error */
  onError?: (error: Error, index: number) => void;
  /** Continue scanning on error (default: true) */
  continueOnError?: boolean;
  /** Enable result caching (default: false) */
  enableCache?: boolean;
}

export interface BatchScanResult {
  /** All scan reports (null for failed scans if continueOnError is true) */
  reports: (ScanReport | null)[];
  /** Number of successful scans */
  successCount: number;
  /** Number of failed scans */
  errorCount: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Errors encountered (if continueOnError is true) */
  errors: Array<{ index: number; error: Error }>;
}

export interface ScanTask {
  /** File content to scan */
  content: Uint8Array;
  /** Scan context (filename, mime type, etc.) */
  context?: ScanContext;
}

/**
 * Batch file scanner with concurrency control and progress tracking
 */
export class BatchScanner {
  private readonly options: BatchScanOptions;

  constructor(options: BatchScanOptions = {}) {
    this.options = {
      concurrency: 5,
      continueOnError: true,
      ...options,
    };
  }

  /**
   * Scan multiple files with controlled concurrency
   */
  async scanBatch(tasks: ScanTask[]): Promise<BatchScanResult> {
    const startTime = Date.now();
    const results: (ScanReport | null)[] = new Array(tasks.length);
    const errors: Array<{ index: number; error: Error }> = [];
    let successCount = 0;
    let errorCount = 0;
    let completedCount = 0;

    const concurrency = this.options.concurrency ?? 5;

    // Process tasks in chunks with controlled concurrency
    const processingQueue: Promise<void>[] = [];
    let currentIndex = 0;

    const processTask = async (index: number): Promise<void> => {
      try {
        const task = tasks[index];
        const report = await scanBytes(task.content, {
          ...this.options,
          ctx: task.context,
        });

        results[index] = report;
        successCount++;
        completedCount++;

        if (this.options.onProgress) {
          this.options.onProgress(completedCount, tasks.length, report);
        }
      } catch (error) {
        errorCount++;
        completedCount++;
        const err = error instanceof Error ? error : new Error(String(error));

        if (this.options.onError) {
          this.options.onError(err, index);
        }

        errors.push({ index, error: err });

        if (!this.options.continueOnError) {
          throw err;
        }

        results[index] = null;
      }
    };

    // Start initial batch of concurrent tasks
    while (currentIndex < tasks.length) {
      while (processingQueue.length < concurrency && currentIndex < tasks.length) {
        const promise = processTask(currentIndex);
        processingQueue.push(promise);
        currentIndex++;

        // Remove completed promises from queue
        promise.finally(() => {
          const idx = processingQueue.indexOf(promise);
          if (idx > -1) processingQueue.splice(idx, 1);
        });
      }

      // Wait for at least one task to complete before continuing
      if (processingQueue.length >= concurrency) {
        await Promise.race(processingQueue);
      }
    }

    // Wait for all remaining tasks
    await Promise.all(processingQueue);

    const totalDurationMs = Date.now() - startTime;

    return {
      reports: results,
      successCount,
      errorCount,
      totalDurationMs,
      errors,
    };
  }

  /**
   * Scan files from File objects (browser environment)
   */
  async scanFiles(files: File[]): Promise<BatchScanResult> {
    const tasks: ScanTask[] = await Promise.all(
      files.map(async (file) => ({
        content: new Uint8Array(await file.arrayBuffer()),
        context: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        },
      }))
    );

    return this.scanBatch(tasks);
  }

  /**
   * Scan files from file paths (Node.js environment)
   */
  async scanFilePaths(filePaths: string[]): Promise<BatchScanResult> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const tasks: ScanTask[] = await Promise.all(
      filePaths.map(async (filePath) => {
        const [content, stats] = await Promise.all([
          fs.readFile(filePath),
          fs.stat(filePath),
        ]);

        return {
          content: new Uint8Array(content),
          context: {
            filename: path.basename(filePath),
            size: stats.size,
          },
        };
      })
    );

    return this.scanBatch(tasks);
  }
}

/**
 * Quick helper for batch scanning with default options
 */
export async function batchScan(
  tasks: ScanTask[],
  options?: BatchScanOptions
): Promise<BatchScanResult> {
  const scanner = new BatchScanner(options);
  return scanner.scanBatch(tasks);
}
