/**
 * Quarantine workflow — core API for the quarantine/review/resolve lifecycle.
 *
 * Usage (Node.js):
 *
 * ```ts
 * import { scanBytes } from 'pompelmi';
 * import { QuarantineManager, FilesystemQuarantineStorage } from 'pompelmi/quarantine';
 *
 * const quarantine = new QuarantineManager({
 *   storage: new FilesystemQuarantineStorage({ dir: './quarantine' }),
 * });
 *
 * const report = await scanBytes(fileBytes, { ctx: { filename: file.name } });
 *
 * if (report.verdict !== 'clean') {
 *   const entry = await quarantine.quarantine(fileBytes, report, {
 *     originalName: file.name,
 *     sizeBytes: fileBytes.length,
 *     uploadedBy: req.user?.id,
 *   });
 *   console.log('Quarantined:', entry.id);
 * }
 * ```
 *
 * @module quarantine/workflow
 */

import * as crypto from 'crypto';
import type { ScanReport } from '../types';
import type {
  QuarantineEntry,
  QuarantineFilter,
  QuarantineReport,
  QuarantineReview,
  QuarantineStatus,
  QuarantinedFileInfo,
} from './types';
import type { QuarantineStorage } from './storage';

// ── Options ───────────────────────────────────────────────────────────────────

export interface QuarantineManagerOptions {
  /** Storage adapter — use `FilesystemQuarantineStorage` for local deployments. */
  storage: QuarantineStorage;

  /**
   * If true, files with a 'suspicious' verdict are also quarantined.
   * Default: true.
   */
  quarantineSuspicious?: boolean;

  /**
   * If true, files with a 'malicious' verdict are also quarantined.
   * Default: true.
   */
  quarantineMalicious?: boolean;
}

// ── Manager ───────────────────────────────────────────────────────────────────

/**
 * Manages the full lifecycle of quarantined files:
 *   scan → quarantine → review → promote | delete
 */
export class QuarantineManager {
  private readonly storage: QuarantineStorage;
  private readonly quarantineSuspicious: boolean;
  private readonly quarantineMalicious: boolean;

  constructor(options: QuarantineManagerOptions) {
    this.storage = options.storage;
    this.quarantineSuspicious = options.quarantineSuspicious ?? true;
    this.quarantineMalicious = options.quarantineMalicious ?? true;
  }

  /**
   * Determine whether a scan report should trigger quarantine per the
   * configured policy.
   */
  shouldQuarantine(report: ScanReport): boolean {
    if (report.verdict === 'malicious') return this.quarantineMalicious;
    if (report.verdict === 'suspicious') return this.quarantineSuspicious;
    return false;
  }

  /**
   * Quarantine a file: save the bytes in storage, create the metadata entry,
   * and return the entry.
   *
   * @param bytes     Raw file bytes.
   * @param report    The scan report that triggered quarantine.
   * @param fileInfo  Partial metadata; `sha256` is derived from `bytes` if omitted.
   */
  async quarantine(
    bytes: Uint8Array,
    report: ScanReport,
    fileInfo: Omit<QuarantinedFileInfo, 'sha256'> & { sha256?: string },
  ): Promise<QuarantineEntry> {
    const id = generateId();
    const sha256 = fileInfo.sha256 ?? computeSha256(bytes);
    const now = new Date().toISOString();

    const storageKey = await this.storage.saveFile(id, bytes);

    const entry: QuarantineEntry = {
      id,
      storageKey,
      file: { ...fileInfo, sha256 },
      scanReport: report,
      quarantinedAt: now,
      status: 'pending',
      updatedAt: now,
    };

    await this.storage.saveEntry(entry);
    return entry;
  }

  /**
   * Mark an entry as being actively reviewed.
   */
  async startReview(id: string, reviewedBy?: string): Promise<QuarantineEntry> {
    return this.storage.updateEntry(id, {
      status: 'reviewing',
      reviewedBy,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Resolve a quarantine entry with a final decision.
   *
   * - `promote`: the file is cleared — bytes remain in storage for the caller
   *   to move to its final destination.
   * - `delete`: the bytes are permanently removed from quarantine storage.
   */
  async resolve(id: string, review: QuarantineReview): Promise<QuarantineEntry> {
    const entry = await this.storage.getEntry(id);
    if (!entry) throw new Error(`Quarantine entry not found: ${id}`);
    if (entry.status === 'promoted' || entry.status === 'deleted') {
      throw new Error(`Quarantine entry ${id} is already resolved (${entry.status}).`);
    }

    const now = new Date().toISOString();
    const newStatus: QuarantineStatus = review.decision === 'promote' ? 'promoted' : 'deleted';

    if (review.decision === 'delete') {
      await this.storage.deleteFile(entry.storageKey);
    }

    return this.storage.updateEntry(id, {
      status: newStatus,
      reviewedBy: review.reviewedBy,
      reviewNote: review.reviewNote,
      resolvedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Retrieve the raw bytes of a promoted file so the caller can move it to
   * permanent storage.  Returns `null` if the entry is not found or has been
   * deleted.
   */
  async getFile(id: string): Promise<Uint8Array | null> {
    const entry = await this.storage.getEntry(id);
    if (!entry) return null;
    return this.storage.getFile(entry.storageKey);
  }

  // ── Query helpers ───────────────────────────────────────────────────────────

  getEntry(id: string): Promise<QuarantineEntry | null> {
    return this.storage.getEntry(id);
  }

  listEntries(filter?: QuarantineFilter): Promise<QuarantineEntry[]> {
    return this.storage.listEntries(filter);
  }

  listPending(): Promise<QuarantineEntry[]> {
    return this.storage.listEntries({ status: 'pending' });
  }

  countEntries(filter?: QuarantineFilter): Promise<number> {
    return this.storage.countEntries(filter);
  }

  // ── Reporting ───────────────────────────────────────────────────────────────

  /**
   * Generate a structured JSON report of all quarantine entries matching the
   * filter — suitable for audit logs and dashboards.
   */
  async report(filter?: QuarantineFilter): Promise<QuarantineReport> {
    const entries = await this.storage.listEntries(filter);
    const byStatus = { pending: 0, reviewing: 0, promoted: 0, deleted: 0 };
    for (const e of entries) byStatus[e.status]++;
    return {
      generatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      byStatus,
      entries,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function computeSha256(bytes: Uint8Array): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
