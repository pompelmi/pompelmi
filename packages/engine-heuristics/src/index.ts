export type Match = { rule: string; severity?: 'low'|'medium'|'high'; meta?: Record<string, any> };

export type HeuristicsOptions = {
  enablePHP?: boolean;
  enableJS?: boolean;
  enableEntropy?: boolean;
  enablePEHints?: boolean;
  entropyThresholdBitsPerByte?: number; // 0..8, default 7.2
};

export function createHeuristicsScanner(opts: HeuristicsOptions = {}) {
  const {
    enablePHP = true,
    enableJS = true,
    enableEntropy = true,
    enablePEHints = true,
    entropyThresholdBitsPerByte = 7.2,
  } = opts;

  return {
    async scan(bytes: Uint8Array): Promise<Match[]> {
      const m: Match[] = [];
      const text = toUtf8(bytes);

      // --- PHP webshell / RFI ---
      if (enablePHP && /<\?php/i.test(text)) {
        const phpFinds: Array<[RegExp, string]> = [
          [/(?:eval|assert|system|shell_exec|passthru|popen|proc_open)\s*\(/i, 'php_dangerous_func'],
          [/\$\w+\s*\(\s*\$_(?:GET|POST|REQUEST)\b/i, 'php_variable_func_from_user_input'],
          [/base64_decode\s*\(\s*['"][A-Za-z0-9+\/=]{100,}/i, 'php_base64_decode_long'],
          [/(?:include|require|include_once|require_once)\s*\(\s*['"]https?:\/\//i, 'php_rfi_http_include'],
        ];
        for (const [re, rule] of phpFinds) if (re.test(text)) m.push({ rule, severity: 'high' });
      }

      // --- JavaScript obfuscation / dangerous patterns ---
      if (enableJS && /(function|=>)|eval|atob|new Function|\bimport\(/.test(text)) {
        const jsFinds: Array<[RegExp, string, 'low'|'medium'|'high']> = [
          [/eval\s*\(/i, 'js_eval', 'high'],
          [/new\s+Function\s*\(/i, 'js_new_function', 'high'],
          [/atob\s*\(\s*['"][A-Za-z0-9+\/=]{80,}/i, 'js_atob_long', 'medium'],
          [/(?:unescape|setTimeout|setInterval)\s*\(\s*['"][^'"]{60,}['"]\s*,\s*\d+\s*\)/i, 'js_timed_code', 'medium'],
        ];
        for (const [re, rule, sev] of jsFinds) if (re.test(text)) m.push({ rule, severity: sev });
      }

      // --- Shannon entropy ---
      if (enableEntropy) {
        const H = shannon(bytes);
        if (H >= entropyThresholdBitsPerByte) {
          m.push({ rule: 'high_entropy_blob', severity: 'medium', meta: { H } });
        }
      }

      // --- PE hints (packed / UPX) ---
      if (enablePEHints && bytes.length >= 2 && bytes[0] === 0x4D && bytes[1] === 0x5A /* 'MZ' */) {
        if (findAscii(bytes, 'UPX!') || findAscii(bytes, '.UPX')) {
          m.push({ rule: 'pe_upx_signature', severity: 'medium' });
        }
      }

      return m;
    }
  };
}

function toUtf8(b: Uint8Array): string {
  try { return Buffer.from(b).toString('utf8'); } catch { return ''; }
}

function shannon(b: Uint8Array): number {
  if (!b.length) return 0;
  const freq = new Array<number>(256).fill(0);
  for (let i=0;i<b.length;i++) freq[b[i]]++;
  let H = 0;
  for (let i=0;i<256;i++) if (freq[i]) {
    const p = freq[i] / b.length;
    H -= p * Math.log2(p);
  }
  return H; // bits/byte, 0..8
}

function findAscii(buf: Uint8Array, s: string): boolean {
  const needle = Buffer.from(s, 'ascii');
  return Buffer.from(buf).indexOf(needle) !== -1;
}

// --- Exported composer so other packages/scripts can use it ---
export type AnyScanner = { scan(bytes: Uint8Array): Promise<Match[] | { rule: string }[]> };

export function composeScanners(scanners: AnyScanner[]): AnyScanner {
  return {
    async scan(bytes: Uint8Array) {
      const results = await Promise.allSettled(scanners.map(s => s.scan(bytes)));
      const merged: Match[] = [];
      for (const r of results) if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const m of r.value) merged.push(m as Match);
      }
      return merged;
    }
  };
}


// Ready-to-use instantiated scanner
export const CommonHeuristicsScanner = createHeuristicsScanner();
export default CommonHeuristicsScanner;
