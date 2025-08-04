import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { pipeline as _pipeline } from 'node:stream';

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
 * Very lightweight file scanner.
 *
 * ⚠️ **Note**: This is a *placeholder* implementation that only recognises the
 * EICAR test string. In the real project this function will delegate to the
 * YARA engine, archive handlers, heuristic modules, etc.
 */
export async function scan(
  input: Buffer | Readable | string,
  opts: ScanOptions = {},
): Promise<ScanReport> {
  const start = Date.now();

  // ─── Normalise input to Buffer ────────────────────────────────────────────
  let buffer: Buffer;
  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === 'string') {
    buffer = Buffer.from(input);
  } else {
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

  return {
    verdict,
    findings,
    bytes: buffer.length,
    durationMs: Date.now() - start,
  };
}