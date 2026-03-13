/**
 * Audit trail for Pompelmi scan and quarantine events.
 *
 * Produces structured, append-only audit records suitable for:
 *   - compliance logging (HIPAA, SOC 2, ISO 27001)
 *   - SIEM ingestion
 *   - operational dashboards
 *   - incident response
 *
 * Usage:
 * ```ts
 * import { AuditTrail } from 'pompelmi/audit';
 *
 * const audit = new AuditTrail({ dest: 'file', path: './audit.jsonl' });
 * audit.logScanComplete({ filename: 'upload.zip', verdict: 'suspicious', ... });
 * audit.logQuarantine({ entryId: '...', sha256: '...', ... });
 * ```
 *
 * @module audit
 */

import * as fs from 'fs';
import type { ScanReport } from './types';
import type { QuarantineEntry } from './quarantine/types';

// ── Record types ──────────────────────────────────────────────────────────────

export type AuditEventType =
  | 'scan.complete'
  | 'scan.error'
  | 'threat.detected'
  | 'quarantine.created'
  | 'quarantine.resolved'
  | 'quarantine.deleted';

interface BaseAuditRecord {
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Event type for structured log routing. */
  event: AuditEventType;
  /** Application-assigned session or request id for correlation. */
  correlationId?: string;
  /** Uploader identity. */
  uploadedBy?: string;
}

export interface ScanAuditRecord extends BaseAuditRecord {
  event: 'scan.complete' | 'scan.error' | 'threat.detected';
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  sha256?: string;
  verdict: ScanReport['verdict'];
  matchCount: number;
  durationMs?: number;
  engine?: string;
  error?: string;
}

export interface QuarantineAuditRecord extends BaseAuditRecord {
  event: 'quarantine.created' | 'quarantine.resolved' | 'quarantine.deleted';
  quarantineId: string;
  filename?: string;
  sha256: string;
  decision?: 'promote' | 'delete';
  reviewedBy?: string;
  reviewNote?: string;
}

export type AuditRecord = ScanAuditRecord | QuarantineAuditRecord;

// ── Destination ───────────────────────────────────────────────────────────────

export type AuditDest =
  | { dest: 'console' }
  | { dest: 'file'; path: string }
  | { dest: 'custom'; write: (record: AuditRecord) => void | Promise<void> };

export interface AuditTrailOptions {
  /** Where to write audit records. Default: 'console'. */
  output?: AuditDest;
  /** If true, pretty-print JSON. Useful for debugging. Default: false. */
  pretty?: boolean;
}

// ── AuditTrail ────────────────────────────────────────────────────────────────

export class AuditTrail {
  private readonly options: Required<AuditTrailOptions>;

  constructor(options: AuditTrailOptions = {}) {
    this.options = {
      output: options.output ?? { dest: 'console' },
      pretty: options.pretty ?? false,
    };
  }

  /** Log a completed scan. */
  logScanComplete(
    report: ScanReport,
    extra?: Pick<ScanAuditRecord, 'filename' | 'sizeBytes' | 'sha256' | 'correlationId' | 'uploadedBy'>,
  ): void {
    const record: ScanAuditRecord = {
      timestamp: new Date().toISOString(),
      event: report.verdict !== 'clean' ? 'threat.detected' : 'scan.complete',
      verdict: report.verdict,
      matchCount: report.matches?.length ?? 0,
      durationMs: report.durationMs,
      engine: report.engine,
      mimeType: report.file?.mimeType,
      ...extra,
    };
    void this.write(record);
  }

  /** Log a scan error. */
  logScanError(
    error: unknown,
    extra?: Pick<ScanAuditRecord, 'filename' | 'correlationId' | 'uploadedBy'>,
  ): void {
    const record: ScanAuditRecord = {
      timestamp: new Date().toISOString(),
      event: 'scan.error',
      verdict: 'clean', // unknown at this point
      matchCount: 0,
      error: error instanceof Error ? error.message : String(error),
      ...extra,
    };
    void this.write(record);
  }

  /** Log a new quarantine entry. */
  logQuarantine(entry: QuarantineEntry, correlationId?: string): void {
    const record: QuarantineAuditRecord = {
      timestamp: new Date().toISOString(),
      event: 'quarantine.created',
      quarantineId: entry.id,
      filename: entry.file.originalName,
      sha256: entry.file.sha256,
      uploadedBy: entry.file.uploadedBy,
      correlationId,
    };
    void this.write(record);
  }

  /** Log a quarantine resolution (promote or delete). */
  logQuarantineResolved(entry: QuarantineEntry, correlationId?: string): void {
    const record: QuarantineAuditRecord = {
      timestamp: new Date().toISOString(),
      event: entry.status === 'deleted' ? 'quarantine.deleted' : 'quarantine.resolved',
      quarantineId: entry.id,
      filename: entry.file.originalName,
      sha256: entry.file.sha256,
      decision: entry.status === 'promoted' ? 'promote' : 'delete',
      reviewedBy: entry.reviewedBy,
      reviewNote: entry.reviewNote,
      correlationId,
    };
    void this.write(record);
  }

  private async write(record: AuditRecord): Promise<void> {
    const line = this.options.pretty
      ? JSON.stringify(record, null, 2)
      : JSON.stringify(record);

    const { output } = this.options;

    try {
      if (output.dest === 'console') {
        process.stdout.write(line + '\n');
      } else if (output.dest === 'file') {
        // Append a newline-delimited JSON (NDJSON) record.
        await fs.promises.appendFile(output.path, line + '\n', 'utf8');
      } else if (output.dest === 'custom') {
        await output.write(record);
      }
    } catch {
      // Audit failures must never interrupt the upload pipeline.
    }
  }
}
