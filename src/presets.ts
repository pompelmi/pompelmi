/**
 * Opinionated policy presets to reduce boilerplate.
 * Spread these into your middleware/handler options.
 */

export type PolicyPreset = {
  allowedMimeTypes: string[];
  includeExtensions: string[];
  maxFileSizeBytes: number;
  failClosed: boolean;
};

const MB = (n: number) => n * 1024 * 1024;

export function balancedPolicy(): PolicyPreset {
  return {
    allowedMimeTypes: [
      "application/zip",
      "image/png",
      "image/jpeg",
      "application/pdf",
      "text/plain",
    ],
    includeExtensions: ["zip", "png", "jpg", "jpeg", "pdf", "txt"],
    maxFileSizeBytes: MB(20),
    failClosed: true,
  };
}

export function strictPolicy(): PolicyPreset {
  return {
    allowedMimeTypes: ["image/png", "image/jpeg", "application/pdf"],
    includeExtensions: ["png", "jpg", "jpeg", "pdf"],
    maxFileSizeBytes: MB(8),
    failClosed: true,
  };
}

export function imagesOnlyPolicy(): PolicyPreset {
  return {
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    includeExtensions: ["png", "jpg", "jpeg", "webp", "gif"],
    maxFileSizeBytes: MB(10),
    failClosed: true,
  };
}
