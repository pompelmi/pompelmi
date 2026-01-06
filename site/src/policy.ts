export interface Policy {
  includeExtensions: string[];
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  timeoutMs: number;
  concurrency: number;
  failClosed: boolean;
  onScanEvent?: (ev: unknown) => void;
}
export type PolicyInput = Partial<Policy>;

const MB = 1024 * 1024;

export const DEFAULT_POLICY: Policy = {
  includeExtensions: ['zip','png','jpg','jpeg','pdf'],
  allowedMimeTypes: ['application/zip','image/png','image/jpeg','application/pdf','text/plain'],
  maxFileSizeBytes: 20 * MB,
  timeoutMs: 5000,
  concurrency: 4,
  failClosed: true
};

export function definePolicy(input: PolicyInput = {}): Policy {
  const p: Policy = { ...DEFAULT_POLICY, ...input };
  if (!Array.isArray(p.includeExtensions)) throw new TypeError('includeExtensions must be string[]');
  if (!Array.isArray(p.allowedMimeTypes)) throw new TypeError('allowedMimeTypes must be string[]');
  if (!(Number.isFinite(p.maxFileSizeBytes) && p.maxFileSizeBytes > 0)) throw new TypeError('maxFileSizeBytes must be > 0');
  if (!(Number.isFinite(p.timeoutMs) && p.timeoutMs > 0)) throw new TypeError('timeoutMs must be > 0');
  if (!(Number.isInteger(p.concurrency) && p.concurrency > 0)) throw new TypeError('concurrency must be > 0');
  return p;
}
