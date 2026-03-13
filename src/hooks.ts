/**
 * Scan lifecycle hooks for Pompelmi.
 *
 * Hooks let you observe and react to scan events without modifying the scan
 * pipeline itself.  They are the recommended integration point for:
 *   - logging / metrics collection
 *   - alerting on threats
 *   - triggering quarantine automatically
 *   - OpenTelemetry span creation
 *
 * Usage:
 * ```ts
 * import { scanBytes } from 'pompelmi';
 * import { createScanHooks, withHooks } from 'pompelmi/hooks';
 *
 * const hooks = createScanHooks({
 *   onScanComplete(ctx, report) {
 *     console.log(ctx.filename, report.verdict, report.durationMs + 'ms');
 *   },
 *   onThreatDetected(ctx, report) {
 *     alertTeam({ file: ctx.filename, verdict: report.verdict });
 *   },
 * });
 *
 * const scan = withHooks(scanBytes, hooks);
 * const report = await scan(bytes, { ctx: { filename: 'upload.zip' } });
 * ```
 *
 * @module hooks
 */

import type { ScanContext, ScanReport } from './types';
import type { QuarantineEntry } from './quarantine/types';

// ── Event payloads ────────────────────────────────────────────────────────────

export interface ScanStartContext extends ScanContext {
  /** Unique identifier for this scan invocation (useful for correlating logs). */
  scanId?: string;
  /** Timestamp when the scan started (ms since epoch). */
  startedAt: number;
}

export interface ScanCompleteContext extends ScanStartContext {
  /** Duration of the scan in milliseconds. */
  durationMs: number;
}

// ── Hook interface ────────────────────────────────────────────────────────────

/**
 * Callbacks for the scan lifecycle.  All hooks are optional.
 *
 * Hooks MUST NOT throw — wrap logic in try/catch if it can fail.
 * Async hooks are fire-and-forget; they do not block the scan result.
 */
export interface ScanHooks {
  /**
   * Called immediately before a scan begins.
   */
  onScanStart?: (ctx: ScanStartContext) => void | Promise<void>;

  /**
   * Called when a scan completes successfully (any verdict, including clean).
   */
  onScanComplete?: (ctx: ScanCompleteContext, report: ScanReport) => void | Promise<void>;

  /**
   * Called when the scan verdict is 'suspicious' or 'malicious'.
   * Fired in addition to `onScanComplete`.
   */
  onThreatDetected?: (ctx: ScanCompleteContext, report: ScanReport) => void | Promise<void>;

  /**
   * Called when a file has been quarantined.
   * Requires wiring with a `QuarantineManager`; not fired automatically by `scanBytes`.
   */
  onQuarantine?: (entry: QuarantineEntry) => void | Promise<void>;

  /**
   * Called when a scan throws an unexpected error.
   */
  onScanError?: (ctx: ScanStartContext, error: unknown) => void | Promise<void>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a `ScanHooks` object with optional defaults.
 * This is a thin factory — the value of using it is the inline TS types.
 */
export function createScanHooks(hooks: ScanHooks): ScanHooks {
  return hooks;
}

// ── withHooks wrapper ─────────────────────────────────────────────────────────

type ScanFn = (bytes: Uint8Array, opts?: { ctx?: ScanContext; [k: string]: unknown }) => Promise<ScanReport>;

/**
 * Wrap a scan function with lifecycle hooks.
 *
 * Returns a new function with the same signature that fires the hooks
 * around each scan call.
 */
export function withHooks(scanFn: ScanFn, hooks: ScanHooks): ScanFn {
  return async (bytes, opts = {}) => {
    const scanId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as { randomUUID(): string }).randomUUID()
      : undefined;

    const startedAt = Date.now();
    const ctx: ScanStartContext = { ...opts.ctx, scanId, startedAt };

    void hooks.onScanStart?.(ctx);

    let report: ScanReport;
    try {
      report = await scanFn(bytes, opts);
    } catch (err) {
      void hooks.onScanError?.({ ...ctx }, err);
      throw err;
    }

    const durationMs = Date.now() - startedAt;
    const completeCtx: ScanCompleteContext = { ...ctx, durationMs };

    void hooks.onScanComplete?.(completeCtx, report);

    if (report.verdict === 'suspicious' || report.verdict === 'malicious') {
      void hooks.onThreatDetected?.(completeCtx, report);
    }

    return report;
  };
}
