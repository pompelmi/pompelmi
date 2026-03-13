/**
 * Quarantine system types for Pompelmi.
 *
 * A quarantine entry represents a file that was flagged during scanning and is
 * held for manual review before being accepted or permanently removed.
 *
 * The lifecycle of a quarantined entry:
 *
 *   scan → flagged → quarantined → reviewed → promoted | deleted
 *
 * @module quarantine/types
 */

import type { ScanReport } from '../types';

// ── Status ────────────────────────────────────────────────────────────────────

/** The review status of a quarantined file. */
export type QuarantineStatus =
  | 'pending'    // Newly quarantined; awaiting review.
  | 'reviewing'  // Actively being reviewed by an operator.
  | 'promoted'   // Cleared; the file has been accepted (released to storage).
  | 'deleted';   // Permanently removed after review.

// ── Core model ────────────────────────────────────────────────────────────────

/** Immutable metadata about the file at upload time. */
export interface QuarantinedFileInfo {
  /** Original filename supplied by the uploader. */
  originalName: string;
  /** Detected MIME type (from magic bytes, not the Content-Type header). */
  mimeType?: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** SHA-256 hex digest of the file content. */
  sha256: string;
  /** Uploader identity — opaque string (user id, session id, IP, etc.). */
  uploadedBy?: string;
}

/** A quarantine entry created when a file is flagged. */
export interface QuarantineEntry {
  /** Stable identifier for this quarantine entry (UUID). */
  id: string;
  /** Filename used to locate the quarantined bytes in storage. */
  storageKey: string;
  /** Metadata captured at upload time. */
  file: QuarantinedFileInfo;
  /** The scan report that triggered quarantine. */
  scanReport: ScanReport;
  /** ISO-8601 timestamp when the file was quarantined. */
  quarantinedAt: string;
  /** Current review status. */
  status: QuarantineStatus;
  /** ISO-8601 timestamp of the last status change. */
  updatedAt: string;
  /** Identity of the reviewer (operator id, etc.). Populated at review time. */
  reviewedBy?: string;
  /** Free-text review note from the operator. */
  reviewNote?: string;
  /** ISO-8601 timestamp when the final decision (promote/delete) was made. */
  resolvedAt?: string;
  /** Optional application-specific tags or labels. */
  tags?: string[];
}

// ── Decision model ────────────────────────────────────────────────────────────

/** The outcome of a manual review. */
export type QuarantineDecision = 'promote' | 'delete';

/** Input required to resolve a quarantine entry. */
export interface QuarantineReview {
  decision: QuarantineDecision;
  reviewedBy?: string;
  reviewNote?: string;
}

// ── Quarantine report ─────────────────────────────────────────────────────────

/** A structured JSON report of all quarantined entries (for audit/export). */
export interface QuarantineReport {
  generatedAt: string;
  totalEntries: number;
  byStatus: Record<QuarantineStatus, number>;
  entries: QuarantineEntry[];
}

// ── Filter / query ────────────────────────────────────────────────────────────

/** Filter parameters for listing quarantine entries. */
export interface QuarantineFilter {
  status?: QuarantineStatus | QuarantineStatus[];
  /** Return only entries quarantined after this ISO-8601 timestamp. */
  after?: string;
  /** Return only entries quarantined before this ISO-8601 timestamp. */
  before?: string;
  /** Maximum number of results to return. */
  limit?: number;
}
