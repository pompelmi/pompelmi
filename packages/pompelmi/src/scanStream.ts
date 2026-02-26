import { Readable, Transform } from 'node:stream';
import { pipeline as _pipeline } from 'node:stream';
import { promisify } from 'node:util';
import type { ScanOptions, ScanReport, Verdict } from './scan.js';

const pipeline = promisify(_pipeline);

/**
 * Options for stream-based scanning.
 */
export interface StreamScanOptions extends ScanOptions {
  /**
   * Maximum bytes to buffer for deep inspection.
   * Default: 10MB. Set to prevent memory exhaustion on large files.
   */
  maxBufferSize?: number;
  
  /**
   * Number of bytes to inspect at the beginning of the stream for magic bytes.
   * Default: 4096 bytes (4KB).
   */
  magicBytesWindow?: number;
}

/**
 * Internal state for streaming scanner.
 */
interface StreamScanState {
  bytesProcessed: number;
  findings: string[];
  verdict: Verdict;
  headerBuffer: Buffer;
  fullBuffer: Buffer[];
  eicarDetected: boolean;
  magicBytesChecked: boolean;
  maxBufferSize: number;
  magicBytesWindow: number;
  startTime: number;
}

/**
 * Scan a readable stream for malware without buffering the entire content into memory.
 * 
 * This function processes the stream in chunks, performing heuristic checks
 * as data flows through. It inspects:
 * - Magic bytes (file headers) in the first chunk
 * - EICAR test signature across chunk boundaries
 * - File size and suspicious patterns
 * 
 * **Memory-efficient**: Only buffers up to `maxBufferSize` bytes (default 10MB)
 * for signature matching, making it suitable for scanning large files.
 * 
 * @param stream - Readable stream to scan
 * @param opts - Streaming scan options
 * @returns Promise resolving to ScanReport
 * 
 * @example
 * ```typescript
 * import { createReadStream } from 'fs';
 * import { scanStream } from '@pompelmi/core';
 * 
 * const stream = createReadStream('large-file.bin');
 * const result = await scanStream(stream);
 * 
 * if (result.verdict === 'malicious') {
 *   console.error('Threat detected:', result.findings);
 * }
 * ```
 */
export async function scanStream(
  stream: Readable,
  opts: StreamScanOptions = {},
): Promise<ScanReport> {
  const {
    maxBufferSize = 10 * 1024 * 1024, // 10MB default
    magicBytesWindow = 4096, // 4KB
    failFast = false,
  } = opts;

  const state: StreamScanState = {
    bytesProcessed: 0,
    findings: [],
    verdict: 'clean',
    headerBuffer: Buffer.alloc(0),
    fullBuffer: [],
    eicarDetected: false,
    magicBytesChecked: false,
    maxBufferSize,
    magicBytesWindow,
    startTime: Date.now(),
  };

  // Create a transform stream that processes chunks
  const scanTransform = new Transform({
    transform(chunk: Buffer, encoding, callback) {
      try {
        // Validate chunk is a Buffer
        if (!Buffer.isBuffer(chunk)) {
          throw new TypeError('Expected Buffer chunk in stream');
        }
        
        processChunk(chunk, state, failFast);
        
        // Pass through the chunk (for piping to other streams if needed)
        callback(null, chunk);
      } catch (error) {
        // Clean up buffered data on error
        state.fullBuffer = [];
        callback(error as Error);
      }
    },
    
    flush(callback) {
      try {
        // Final checks after all chunks processed
        performFinalChecks(state);
        // Clean up buffers to free memory
        state.fullBuffer = [];
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });

  // Process the stream
  await pipeline(stream, scanTransform);

  return {
    verdict: state.verdict,
    findings: state.findings,
    bytes: state.bytesProcessed,
    durationMs: Date.now() - state.startTime,
  };
}

/**
 * Process a single chunk of data from the stream.
 */
function processChunk(chunk: Buffer, state: StreamScanState, failFast: boolean): void {
  state.bytesProcessed += chunk.length;

  // ─── Check magic bytes in first chunk ────────────────────────────────────
  if (!state.magicBytesChecked) {
    state.headerBuffer = chunk.slice(0, Math.min(chunk.length, state.magicBytesWindow));
    checkMagicBytes(state.headerBuffer, state);
    state.magicBytesChecked = true;
    
    if (failFast && state.verdict === 'malicious') {
      return;
    }
  }

  // ─── Buffer for EICAR detection (with size limit) ────────────────────────
  if (!state.eicarDetected && state.fullBuffer.length < state.maxBufferSize) {
    const remainingSpace = state.maxBufferSize - Buffer.concat(state.fullBuffer).length;
    if (remainingSpace > 0) {
      const chunkToBuffer = chunk.slice(0, Math.min(chunk.length, remainingSpace));
      state.fullBuffer.push(chunkToBuffer);
    }
  }

  // ─── Check for EICAR in accumulated buffer ───────────────────────────────
  if (!state.eicarDetected && state.fullBuffer.length > 0) {
    const accumulated = Buffer.concat(state.fullBuffer);
    if (checkEicarSignature(accumulated)) {
      state.eicarDetected = true;
      state.findings.push('EICAR test signature');
      state.verdict = 'malicious';
      // Clear buffer to save memory immediately after detection
      state.fullBuffer = [];
      
      if (failFast) {
        return; // Early exit for fail-fast mode
      }
    }
  }

  // ─── Check file size limits ──────────────────────────────────────────────
  checkSizeLimits(state);
}

/**
 * Perform final checks after all chunks have been processed.
 */
function performFinalChecks(state: StreamScanState): void {
  // Check accumulated buffer one final time for EICAR
  if (!state.eicarDetected && state.fullBuffer.length > 0) {
    const accumulated = Buffer.concat(state.fullBuffer);
    if (checkEicarSignature(accumulated)) {
      state.findings.push('EICAR test signature');
      state.verdict = 'malicious';
    }
  }

  // Check for suspiciously small files claiming to be something else
  if (state.bytesProcessed === 0) {
    state.findings.push('Empty file');
    state.verdict = 'suspicious';
  }
}

/**
 * Check magic bytes (file signatures) in the header.
 */
function checkMagicBytes(header: Buffer, state: StreamScanState): void {
  if (header.length < 4) return;

  // Common executable signatures that might be suspicious
  const signatures: Record<string, { name: string; severity: Verdict }> = {
    '4D5A': { name: 'PE/DOS executable (MZ header)', severity: 'suspicious' },
    '7F454C46': { name: 'ELF executable', severity: 'suspicious' },
    'CAFEBABE': { name: 'Java class file', severity: 'suspicious' },
    'FEEDFACE': { name: 'Mach-O executable (32-bit)', severity: 'suspicious' },
    'FEEDFACF': { name: 'Mach-O executable (64-bit)', severity: 'suspicious' },
    '21424448': { name: 'BinHex encoded', severity: 'suspicious' },
  };

  // Check first 4 bytes
  const hex = header.slice(0, 4).toString('hex').toUpperCase();
  
  for (const [sig, { name, severity }] of Object.entries(signatures)) {
    if (hex.startsWith(sig)) {
      state.findings.push(`Detected: ${name}`);
      // Only escalate verdict, never downgrade
      if (state.verdict === 'clean') {
        state.verdict = severity;
      }
      break;
    }
  }

  // Check for script content in what claims to be binary
  const textContent = header.toString('utf8', 0, Math.min(header.length, 256));
  if (textContent.includes('<?php') || textContent.includes('#!/bin/')) {
    state.findings.push('Script content detected in file header');
    if (state.verdict === 'clean') {
      state.verdict = 'suspicious';
    }
  }
}

/**
 * Check for EICAR test signature in buffer.
 */
function checkEicarSignature(buffer: Buffer): boolean {
  const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  return buffer.includes(EICAR_SIGNATURE);
}

/**
 * Check if file size is suspicious.
 */
function checkSizeLimits(state: StreamScanState): void {
  const GB = 1024 * 1024 * 1024;
  
  // Warn about extremely large files (potential zip bomb or DoS)
  if (state.bytesProcessed > 10 * GB && !state.findings.includes('Extremely large file detected')) {
    state.findings.push('Extremely large file detected (>10GB)');
    if (state.verdict === 'clean') {
      state.verdict = 'suspicious';
    }
  }
}

/**
 * Convenience wrapper that creates a Readable stream from a Buffer or string,
 * then scans it using the stream-based approach.
 * 
 * Useful for testing or when you have data in memory but want to use
 * the streaming scanner for consistency.
 */
export async function scanStreamFromBuffer(
  input: Buffer | string,
  opts: StreamScanOptions = {},
): Promise<ScanReport> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const stream = Readable.from(buffer);
  return scanStream(stream, opts);
}
