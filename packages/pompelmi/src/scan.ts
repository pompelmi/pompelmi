import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { pipeline as _pipeline } from 'node:stream';
import { scanStream } from './scanStream.js';
import { analyzeSecurityRisks, detectPolyglot } from './magicBytes/index.js';

const pipeline = promisify(_pipeline);

/**
 * Options controlling scanning behaviour.
 */
export interface ScanOptions {
  /** Stop scanning at the first malicious indicator. */
  failFast?: boolean;
  /** Maximum archive recursion depth. */
  maxDepth?: number;
  /** Heuristic score threshold (0-100); ≥ threshold treated as malicious. */
  heuristicThreshold?: number;
  /**
   * Use stream-based scanning for Readable inputs (more memory efficient).
   * Default: true for streams, automatically chosen for best performance.
   */
  useStreamScanner?: boolean;
  /**
   * Maximum bytes to buffer when using stream scanner.
   * Default: 10MB
   */
  maxBufferSize?: number;
}

/** Possible verdicts returned by the scanner. */
export type Verdict = 'clean' | 'suspicious' | 'malicious';

/**
 * Result object returned by {@link scan}.
 */
export interface ScanReport {
  verdict: Verdict;
  /** Names of YARA rules or heuristic reasons that matched. */
  findings: string[];
  /** Total bytes processed. */
  bytes: number;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
}

/**
 * Lightweight file scanner with automatic stream/buffer detection.
 *
 * **Smart Input Handling:**
 * - For `Readable` streams: Uses memory-efficient stream scanning by default
 * - For `Buffer` or `string`: Uses optimized buffer scanning
 * - Automatically chooses best approach based on input type
 *
 * **Memory Efficient:** When scanning streams, only buffers up to 10MB (configurable)
 * for signature matching, making it safe for large files.
 *
 * ⚠️ **Note**: This is a *placeholder* implementation that only recognises the
 * EICAR test string. In the real project this function will delegate to the
 * YARA engine, archive handlers, heuristic modules, etc.
 *
 * @param input - Data to scan (Buffer, Readable stream, or string)
 * @param opts - Scanning options
 * @returns Promise resolving to ScanReport
 *
 * @example
 * ```typescript
 * // Scan a buffer (in-memory)
 * const result = await scan(fileBuffer);
 *
 * // Scan a stream (memory-efficient for large files)
 * const stream = createReadStream('large-file.bin');
 * const result = await scan(stream);
 *
 * // Force stream scanner for buffer (useful for testing)
 * const result = await scan(fileBuffer, { useStreamScanner: true });
 * ```
 */
export async function scan(
  input: Buffer | Readable | string,
  opts: ScanOptions = {},
): Promise<ScanReport> {
  const start = Date.now();

  // ─── Route to stream scanner for Readable inputs ─────────────────────────
  if (input instanceof Readable || opts.useStreamScanner) {
    // Use memory-efficient stream scanner
    if (input instanceof Readable) {
      return scanStream(input, {
        ...opts,
        maxBufferSize: opts.maxBufferSize,
      });
    }
    
    // Convert buffer/string to stream if useStreamScanner explicitly requested
    if (opts.useStreamScanner) {
      const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
      const stream = Readable.from(buffer);
      return scanStream(stream, {
        ...opts,
        maxBufferSize: opts.maxBufferSize,
      });
    }
  }

  // ─── Buffer-based scanning (original implementation) ─────────────────────
  let buffer: Buffer;
  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === 'string') {
    buffer = Buffer.from(input);
  } else {
    // This branch should not be reached due to routing above,
    // but kept for safety
    const chunks: Buffer[] = [];
    await pipeline(
      input,
      async function* (source) {
        for await (const chunk of source) {
          chunks.push(Buffer.from(chunk));
        }
      },
    );
    buffer = Buffer.concat(chunks);
  }

  // ─── Naïve detection (EICAR signature) ───────────────────────────────────
  const EICAR_SIGNATURE =
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

  const findings: string[] = [];
  let verdict: Verdict = 'clean';

  if (buffer.includes(EICAR_SIGNATURE)) {
    findings.push('EICAR test signature');
    verdict = 'malicious';
  }

  // ─── Advanced Magic Bytes & Polyglot Detection ────────────────────────────
  const securityAnalysis = analyzeSecurityRisks(buffer);
  
  if (securityAnalysis.suspicious) {
    findings.push(...securityAnalysis.reasons);
    
    // Upgrade verdict if not already malicious
    if (verdict !== 'malicious') {
      // Polyglot files or images with embedded scripts are highly suspicious
      if (securityAnalysis.isPolyglot || securityAnalysis.hasEmbeddedScripts) {
        verdict = 'suspicious';
      }
      
      // Executable files are automatically suspicious
      if (securityAnalysis.isExecutable) {
        verdict = 'suspicious';
      }
    }
  }
  
  // Additional polyglot-specific analysis
  const polyglotResult = detectPolyglot(buffer);
  if (polyglotResult.isPolyglot && !findings.some(f => f.includes('Polyglot'))) {
    findings.push(`Polyglot file: ${polyglotResult.formats.join(', ')}`);
    if (verdict === 'clean') {
      verdict = 'suspicious';
    }
  }

  return {
    verdict,
    findings,
    bytes: buffer.length,
    durationMs: Date.now() - start,
  };
}