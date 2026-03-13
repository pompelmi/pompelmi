/**
 * Policy packs for Pompelmi.
 *
 * Pre-configured, named policies for common upload scenarios.  Each pack
 * defines the file type allowlist, size limits, and timeout appropriate for
 * its use case.
 *
 * All packs are built on `definePolicy` and are fully overridable:
 *
 * ```ts
 * import { POLICY_PACKS } from 'pompelmi/policy-packs';
 *
 * // Use a pack as-is:
 * const policy = POLICY_PACKS['images-only'];
 *
 * // Or override individual fields:
 * import { definePolicy } from 'pompelmi';
 * const custom = definePolicy({ ...POLICY_PACKS['documents-only'], maxFileSizeBytes: 5 * 1024 * 1024 });
 * ```
 *
 * These packs are *deterministic* and *descriptor-based* — they do not
 * depend on any external threat intelligence feed.
 *
 * @module policy-packs
 */

import { definePolicy, type Policy } from './policy';

const KB = 1024;
const MB = 1024 * KB;

// ── Policy packs ──────────────────────────────────────────────────────────────

/**
 * Documents-only policy.
 *
 * Appropriate for: document management APIs, PDF/Office file upload endpoints,
 * data import pipelines.
 *
 * Allowed: PDF, Word (.docx/.doc), Excel (.xlsx/.xls), PowerPoint (.pptx/.ppt),
 *   CSV, plain text, JSON, YAML, ODT/ODS/ODP (OpenDocument).
 * Max size: 25 MB.
 */
export const DOCUMENTS_ONLY: Policy = definePolicy({
  includeExtensions: [
    'pdf',
    'doc', 'docx',
    'xls', 'xlsx',
    'ppt', 'pptx',
    'odt', 'ods', 'odp',
    'csv',
    'txt',
    'json',
    'yaml', 'yml',
    'md',
  ],
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'text/csv',
    'text/plain',
    'application/json',
    'text/yaml',
    'text/markdown',
  ],
  maxFileSizeBytes: 25 * MB,
  timeoutMs: 10_000,
  concurrency: 4,
  failClosed: true,
});

/**
 * Images-only policy.
 *
 * Appropriate for: avatar uploads, product image APIs, content platforms with
 * user-generated imagery.
 *
 * Allowed: JPEG, PNG, GIF, WebP, AVIF, TIFF, BMP, ICO.
 * Max size: 10 MB.
 * Note: SVG is intentionally excluded — inline SVGs can contain scripts.
 */
export const IMAGES_ONLY: Policy = definePolicy({
  includeExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff', 'tif', 'bmp', 'ico'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/tiff',
    'image/bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ],
  maxFileSizeBytes: 10 * MB,
  timeoutMs: 5_000,
  concurrency: 8,
  failClosed: true,
});

/**
 * Strict public-upload policy.
 *
 * Appropriate for: anonymous or low-trust upload endpoints, public APIs,
 * any surface exposed to untrusted users.
 *
 * Aggressive size limit (5 MB), short timeout, fail-closed, narrow MIME
 * allowlist.  Only allows plain images and PDF.
 */
export const STRICT_PUBLIC_UPLOAD: Policy = definePolicy({
  includeExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
  maxFileSizeBytes: 5 * MB,
  timeoutMs: 4_000,
  concurrency: 2,
  failClosed: true,
});

/**
 * Conservative default policy.
 *
 * A hardened version of the built-in `DEFAULT_POLICY` suitable for
 * production without further customisation.  Stricter size limit and
 * shorter timeout than the permissive default.
 */
export const CONSERVATIVE_DEFAULT: Policy = definePolicy({
  includeExtensions: ['zip', 'png', 'jpg', 'jpeg', 'pdf', 'txt', 'csv', 'docx', 'xlsx'],
  allowedMimeTypes: [
    'application/zip',
    'image/png',
    'image/jpeg',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  maxFileSizeBytes: 10 * MB,
  timeoutMs: 8_000,
  concurrency: 4,
  failClosed: true,
});

/**
 * Archives policy.
 *
 * Appropriate for: endpoints that accept ZIP, tar, or compressed archives.
 * Combines a generous size allowance with a longer timeout for deep inspection.
 *
 * NOTE: Pair this policy with `createZipBombGuard()` to defend against
 * decompression-bomb attacks:
 *
 * ```ts
 * import { composeScanners, createZipBombGuard, CommonHeuristicsScanner } from 'pompelmi';
 * const scanner = composeScanners(
 *   [['zipGuard', createZipBombGuard()], ['heuristics', CommonHeuristicsScanner]]
 * );
 * ```
 */
export const ARCHIVES: Policy = definePolicy({
  includeExtensions: ['zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar'],
  allowedMimeTypes: [
    'application/zip',
    'application/x-tar',
    'application/gzip',
    'application/x-bzip2',
    'application/x-xz',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
  ],
  maxFileSizeBytes: 100 * MB,
  timeoutMs: 30_000,
  concurrency: 2,
  failClosed: true,
});

// ── Named map ────────────────────────────────────────────────────────────────

export type PolicyPackName =
  | 'documents-only'
  | 'images-only'
  | 'strict-public-upload'
  | 'conservative-default'
  | 'archives';

/**
 * Named map of all built-in policy packs.
 *
 * ```ts
 * import { POLICY_PACKS } from 'pompelmi/policy-packs';
 * const policy = POLICY_PACKS['strict-public-upload'];
 * ```
 */
export const POLICY_PACKS: Record<PolicyPackName, Policy> = {
  'documents-only': DOCUMENTS_ONLY,
  'images-only': IMAGES_ONLY,
  'strict-public-upload': STRICT_PUBLIC_UPLOAD,
  'conservative-default': CONSERVATIVE_DEFAULT,
  'archives': ARCHIVES,
};

/**
 * Look up a policy pack by name.
 * Throws if the name is not recognised.
 */
export function getPolicyPack(name: PolicyPackName): Policy {
  const policy = POLICY_PACKS[name];
  if (!policy) throw new Error(`Unknown policy pack: '${name}'. Valid names: ${Object.keys(POLICY_PACKS).join(', ')}`);
  return policy;
}
