import { createYaraEngine } from './yara/index'; // oppure './yara/index' / 'pompelmi/yara'
import type { YaraMatch } from './yara/index';
// --- Added: lightweight magic-byte sniffing and prefilter (browser-safe) ---
type Severity = 'clean' | 'suspicious' | 'malicious';

export type BrowserPolicy = {
  includeExtensions: string[];
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  denyScriptableSvg?: boolean;
};

export type PrefilterResult = { severity: Severity; reasons: string[]; mime?: string };

function sniffMagicBytes(bytes: Uint8Array): { mime: string; extHint?: string } | null {
  const s = (sig: number[] | string) => {
    const arr = typeof sig === 'string' ? new TextEncoder().encode(sig) : new Uint8Array(sig);
    if (bytes.length < arr.length) return false;
    for (let i = 0; i < arr.length; i++) if (bytes[i] !== arr[i]) return false;
    return true;
  };
  if (s([0x50,0x4B,0x03,0x04]) || s([0x50,0x4B,0x05,0x06]) || s([0x50,0x4B,0x07,0x08])) return { mime: 'application/zip', extHint: 'zip' };
  if (s([0x25,0x50,0x44,0x46,0x2D])) return { mime: 'application/pdf', extHint: 'pdf' };
  if (s([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])) return { mime: 'image/png', extHint: 'png' };
  if (s([0xFF,0xD8,0xFF])) return { mime: 'image/jpeg', extHint: 'jpg' };
  if (s('GIF87a') || s('GIF89a')) return { mime: 'image/gif', extHint: 'gif' };
  if (s('<?xml') || s('<svg')) return { mime: 'image/svg+xml', extHint: 'svg' };
  if (s([0x4D,0x5A])) return { mime: 'application/vnd.microsoft.portable-executable', extHint: 'exe' };
  if (s([0x7F,0x45,0x4C,0x46])) return { mime: 'application/x-elf', extHint: 'elf' };
  return null;
}

function hasSuspiciousJpegTrailer(bytes: Uint8Array, maxTrailer = 1_000_000): boolean {
  for (let i = bytes.length - 2; i >= 2; i--) {
    if (bytes[i] === 0xFF && bytes[i+1] === 0xD9) {
      const trailer = bytes.length - (i + 2);
      return trailer > maxTrailer;
    }
  }
  return false;
}

export function prefilterBrowser(bytes: Uint8Array, filename: string, policy: BrowserPolicy): PrefilterResult {
  const reasons: string[] = [];
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (policy.maxFileSizeBytes && bytes.byteLength > policy.maxFileSizeBytes) {
    reasons.push(`size_exceeded:${bytes.byteLength}`);
  }

  if (policy.includeExtensions && policy.includeExtensions.length && !policy.includeExtensions.includes(ext)) {
    reasons.push(`ext_denied:${ext}`);
  }

  const s = sniffMagicBytes(bytes);
  if (!s) reasons.push('mime_unknown');
  if (s?.mime && policy.allowedMimeTypes && policy.allowedMimeTypes.length && !policy.allowedMimeTypes.includes(s.mime)) {
    reasons.push(`mime_denied:${s.mime}`);
  }
  if (s?.extHint && ext && s.extHint !== ext) {
    reasons.push(`ext_mismatch:${ext}->${s.extHint}`);
  }

  if (s?.mime === 'image/jpeg' && hasSuspiciousJpegTrailer(bytes)) reasons.push('jpeg_trailer_payload');

  if (s?.mime === 'image/svg+xml' && policy.denyScriptableSvg !== false) {
    const text = new TextDecoder().decode(bytes).toLowerCase();
    if (text.includes('<script') || text.includes('onload=') || text.includes('href="javascript:')) {
      reasons.push('svg_script');
    }
  }

  const severity: Severity = reasons.length ? 'suspicious' : 'clean';
  return { severity, reasons, mime: s?.mime };
}

/**
 * Reads an array of File objects via FileReader and returns their text.
 */
export async function scanFiles(
  files: File[]
): Promise<Array<{ file: File; content: string }>> {
  const readText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const results: Array<{ file: File; content: string }> = [];
  for (const file of files) {
    const content = await readText(file);
    results.push({ file, content });
  }
  return results;
}


export async function scanFilesWithYara(
  files: File[],
  rulesSource: string
): Promise<Array<{ file: File; content: string; yara: { matches: YaraMatch[] } }>> {
  // Prova a creare l'engine YARA (browser). Se non disponibile, prosegui silenziosamente.
  let compiled:
    | { scan(data: Uint8Array): Promise<YaraMatch[]> }
    | undefined;

  try {
    const engine = await createYaraEngine();      // in browser userà l'engine WASM (prossimo step)
    compiled = await engine.compile(rulesSource); // compila UNA sola volta
  } catch (e) {
    console.warn('[yara] non disponibile o regole non compilate:', e);
  }

  const results: Array<{ file: File; content: string; yara: { matches: YaraMatch[] } }> = [];

  for (const file of files) {
    // 1) contenuto testuale (come nella tua scanFiles)
    const content = await file.text();

    // 2) bytes per YARA (meglio dei soli caratteri)
    let matches: YaraMatch[] = [];
    if (compiled) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        matches = await compiled.scan(bytes);
      } catch (e) {
        console.warn(`[yara] errore scansione ${file.name}:`, e);
      }
    }

    results.push({ file, content, yara: { matches } });
  }

  return results;
}

/**
 * Scan files with fast browser heuristics + optional YARA.
 * Returns content, prefilter verdict, and YARA matches.
 */
export async function scanFilesWithHeuristicsAndYara(
  files: File[],
  rulesSource: string,
  policy: BrowserPolicy
): Promise<Array<{ file: File; content: string; prefilter: PrefilterResult; yara: { matches: YaraMatch[] } }>> {
  let compiled: { scan(data: Uint8Array): Promise<YaraMatch[]> } | undefined;
  try {
    const engine = await createYaraEngine();
    compiled = await engine.compile(rulesSource);
  } catch (e) {
    console.warn('[yara] non disponibile o regole non compilate:', e);
  }

  const out: Array<{ file: File; content: string; prefilter: PrefilterResult; yara: { matches: YaraMatch[] } }> = [];

  for (const file of files) {
    const [content, bytes] = await Promise.all([file.text(), file.arrayBuffer().then(b => new Uint8Array(b))]);
    const prefilter = prefilterBrowser(bytes, file.name, policy);

    let matches: YaraMatch[] = [];
    if (compiled) {
      try {
        // Optional short-circuit: only run YARA if needed. For now, we always run it if available.
        matches = await compiled.scan(bytes);
      } catch (e) {
        console.warn(`[yara] errore scansione ${file.name}:`, e);
      }
    }

    out.push({ file, content, prefilter, yara: { matches } });
  }

  return out;
}