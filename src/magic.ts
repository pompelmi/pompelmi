// src/magic.ts
export type Sniff = { mime: string; extHint?: string; confidence: number };

const startsWith = (b: Uint8Array, sig: number[] | string) => {
  const s = typeof sig === 'string' ? Array.from(Buffer.from(sig, 'binary')) : sig;
  if (b.length < s.length) return false;
  for (let i = 0; i < s.length; i++) if (b[i] !== s[i]) return false;
  return true;
};

export function sniff(bytes: Uint8Array): Sniff | null {
  // Archives
  if (startsWith(bytes, [0x50,0x4B,0x03,0x04]) || startsWith(bytes, [0x50,0x4B,0x05,0x06]) || startsWith(bytes,[0x50,0x4B,0x07,0x08]))
    return { mime: 'application/zip', extHint: 'zip', confidence: 0.99 };
  if (startsWith(bytes, [0x52,0x61,0x72,0x21,0x1A,0x07,0x00]) || startsWith(bytes,[0x52,0x61,0x72,0x21,0x1A,0x07,0x01,0x00]))
    return { mime: 'application/x-rar-compressed', extHint: 'rar', confidence: 0.98 };
  if (startsWith(bytes, [0x37,0x7A,0xBC,0xAF,0x27,0x1C]))
    return { mime: 'application/x-7z-compressed', extHint: '7z', confidence: 0.98 };
  if (startsWith(bytes, [0x1F,0x8B,0x08]))
    return { mime: 'application/gzip', extHint: 'gz', confidence: 0.98 };

  // Docs
  if (startsWith(bytes, [0x25,0x50,0x44,0x46,0x2D]))
    return { mime: 'application/pdf', extHint: 'pdf', confidence: 0.99 };

  // Images
  if (startsWith(bytes, [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))
    return { mime: 'image/png', extHint: 'png', confidence: 0.99 };
  if (startsWith(bytes, [0xFF,0xD8,0xFF]))
    return { mime: 'image/jpeg', extHint: 'jpg', confidence: 0.95 };
  if (startsWith(bytes, 'GIF87a') || startsWith(bytes, 'GIF89a'))
    return { mime: 'image/gif', extHint: 'gif', confidence: 0.95 };
  if (startsWith(bytes, '<svg') || startsWith(bytes, '<?xml'))
    return { mime: 'image/svg+xml', extHint: 'svg', confidence: 0.6 };

  // Executables / scripts
  if (startsWith(bytes, [0x4D,0x5A]))
    return { mime: 'application/vnd.microsoft.portable-executable', extHint: 'exe', confidence: 0.99 };
  if (startsWith(bytes, [0x7F,0x45,0x4C,0x46]))
    return { mime: 'application/x-elf', extHint: 'elf', confidence: 0.99 };

  return null;
}

export function hasSuspiciousJpegTrailer(bytes: Uint8Array, maxTrailer = 1_000_000): boolean {
  // Look for FFD9 near the end; flag if massive trailing payload exists.
  for (let i = bytes.length - 2; i >= 2; i--) {
    if (bytes[i] === 0xFF && bytes[i+1] === 0xD9) {
      const trailer = bytes.length - (i + 2);
      return trailer > maxTrailer;
    }
  }
  return false;
}