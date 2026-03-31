/**
 * Pompelmi Quarantine Module
 *
 * Provides a first-class quarantine workflow for secure upload pipelines:
 *   scan → flag → quarantine → review → promote | delete
 *
 * Entry points:
 *   import { QuarantineManager, FilesystemQuarantineStorage } from 'pompelmi/quarantine';
 *
 * The storage layer is pluggable via the `QuarantineStorage` interface.
 * `FilesystemQuarantineStorage` is the reference implementation for local/on-premise use.
 *
 * This module is Node.js-only (uses fs/crypto/path).
 * It is NOT included in the 'pompelmi/browser' or 'pompelmi/react' bundles.
 */

export {
  FilesystemQuarantineStorage,
  type FilesystemQuarantineStorageOptions,
  type QuarantineStorage,
} from "./storage";
export type {
  QuarantineDecision,
  QuarantinedFileInfo,
  QuarantineEntry,
  QuarantineFilter,
  QuarantineReport,
  QuarantineReview,
  QuarantineStatus,
} from "./types";
export { QuarantineManager, type QuarantineManagerOptions } from "./workflow";
