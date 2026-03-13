/**
 * Quarantine storage adapter interface and filesystem reference implementation.
 *
 * The `QuarantineStorage` interface decouples the quarantine workflow from any
 * specific persistence layer.  You can implement it for S3, GCS, a database,
 * or any other backend.
 *
 * The built-in `FilesystemQuarantineStorage` stores files and metadata as JSON
 * in a local directory — suitable for development, self-hosted, and on-premise
 * deployments where data must not leave the machine.
 *
 * @module quarantine/storage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { QuarantineEntry, QuarantineFilter } from './types';

// ── Adapter interface ─────────────────────────────────────────────────────────

/**
 * Storage adapter for the quarantine workflow.
 * Implement this interface to support any backend (S3, GCS, DB, etc.).
 */
export interface QuarantineStorage {
  /**
   * Persist the raw bytes of a quarantined file.
   * Returns a `storageKey` that can later be used to retrieve or delete the bytes.
   */
  saveFile(id: string, bytes: Uint8Array): Promise<string>;

  /**
   * Retrieve the raw bytes of a quarantined file.
   * Returns `null` if the file is not found.
   */
  getFile(storageKey: string): Promise<Uint8Array | null>;

  /**
   * Permanently remove the raw bytes of a quarantined file.
   * No-op if already removed.
   */
  deleteFile(storageKey: string): Promise<void>;

  /** Persist a quarantine entry (metadata + scan report). */
  saveEntry(entry: QuarantineEntry): Promise<void>;

  /** Load a quarantine entry by id. Returns `null` if not found. */
  getEntry(id: string): Promise<QuarantineEntry | null>;

  /** Update an existing quarantine entry (partial update). */
  updateEntry(id: string, patch: Partial<QuarantineEntry>): Promise<QuarantineEntry>;

  /** List quarantine entries matching the given filter. */
  listEntries(filter?: QuarantineFilter): Promise<QuarantineEntry[]>;

  /** Return the total count of quarantine entries matching the filter. */
  countEntries(filter?: QuarantineFilter): Promise<number>;
}

// ── Filesystem implementation ─────────────────────────────────────────────────

export interface FilesystemQuarantineStorageOptions {
  /**
   * Root directory for quarantine storage.
   * Two subdirectories are created: `files/` (raw bytes) and `meta/` (JSON).
   */
  dir: string;
  /** Create the directory if it does not exist (default: true). */
  createIfMissing?: boolean;
}

/**
 * Reference implementation of `QuarantineStorage` backed by the local filesystem.
 *
 * File layout:
 *   <dir>/files/<storageKey>   — raw file bytes
 *   <dir>/meta/<id>.json       — QuarantineEntry JSON
 *
 * Suitable for single-process servers.  For multi-process or distributed
 * deployments, implement `QuarantineStorage` against a shared backend.
 */
export class FilesystemQuarantineStorage implements QuarantineStorage {
  private readonly filesDir: string;
  private readonly metaDir: string;

  constructor(options: FilesystemQuarantineStorageOptions) {
    this.filesDir = path.join(options.dir, 'files');
    this.metaDir = path.join(options.dir, 'meta');
    if (options.createIfMissing !== false) {
      fs.mkdirSync(this.filesDir, { recursive: true });
      fs.mkdirSync(this.metaDir, { recursive: true });
    }
  }

  async saveFile(id: string, bytes: Uint8Array): Promise<string> {
    // Use a safe, collision-resistant filename derived from the entry id.
    const storageKey = `${id}-${crypto.randomBytes(4).toString('hex')}`;
    const filePath = path.join(this.filesDir, storageKey);
    await fs.promises.writeFile(filePath, bytes);
    return storageKey;
  }

  async getFile(storageKey: string): Promise<Uint8Array | null> {
    const filePath = path.join(this.filesDir, safeBasename(storageKey));
    try {
      const buf = await fs.promises.readFile(filePath);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    const filePath = path.join(this.filesDir, safeBasename(storageKey));
    await fs.promises.unlink(filePath).catch(() => {/* already gone */});
  }

  async saveEntry(entry: QuarantineEntry): Promise<void> {
    const metaPath = path.join(this.metaDir, `${safeBasename(entry.id)}.json`);
    await fs.promises.writeFile(metaPath, JSON.stringify(entry, null, 2), 'utf8');
  }

  async getEntry(id: string): Promise<QuarantineEntry | null> {
    const metaPath = path.join(this.metaDir, `${safeBasename(id)}.json`);
    try {
      const raw = await fs.promises.readFile(metaPath, 'utf8');
      return JSON.parse(raw) as QuarantineEntry;
    } catch {
      return null;
    }
  }

  async updateEntry(id: string, patch: Partial<QuarantineEntry>): Promise<QuarantineEntry> {
    const existing = await this.getEntry(id);
    if (!existing) throw new Error(`Quarantine entry not found: ${id}`);
    const updated: QuarantineEntry = { ...existing, ...patch };
    await this.saveEntry(updated);
    return updated;
  }

  async listEntries(filter?: QuarantineFilter): Promise<QuarantineEntry[]> {
    const files = await fs.promises.readdir(this.metaDir).catch(() => [] as string[]);
    const entries: QuarantineEntry[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await fs.promises.readFile(path.join(this.metaDir, file), 'utf8');
        entries.push(JSON.parse(raw) as QuarantineEntry);
      } catch {
        // Skip unreadable entries.
      }
    }

    return applyFilter(entries, filter);
  }

  async countEntries(filter?: QuarantineFilter): Promise<number> {
    const entries = await this.listEntries(filter);
    return entries.length;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip directory separators to prevent path-traversal attacks when using
 * user-supplied or derived keys as filenames.
 */
function safeBasename(key: string): string {
  return path.basename(key).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function applyFilter(entries: QuarantineEntry[], filter?: QuarantineFilter): QuarantineEntry[] {
  if (!filter) return entries;

  let result = entries;

  if (filter.status !== undefined) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    result = result.filter((e) => statuses.includes(e.status));
  }
  if (filter.after) {
    result = result.filter((e) => e.quarantinedAt >= filter.after!);
  }
  if (filter.before) {
    result = result.filter((e) => e.quarantinedAt <= filter.before!);
  }
  if (filter.limit !== undefined) {
    result = result.slice(0, filter.limit);
  }

  return result;
}
