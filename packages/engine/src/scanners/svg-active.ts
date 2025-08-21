/**
 * SvgActiveContentScanner — flags <script> or on* handlers in SVG.
 */
function textHead(bytes: Uint8Array, limit = 1_000_000): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, limit)));
}
export const SvgActiveContentScanner = {
  name: 'svg-active',
  async scan(bytes: Uint8Array) {
    const head = textHead(bytes);
    // quick signature: starts with XML/SVG-ish or contains <svg
    const looksSvg = head.trimStart().toLowerCase().includes('<svg');
    if (!looksSvg) return { verdict: 'clean', tags: [], reason: '' } as const;

    const lower = head.toLowerCase();
    const hasScript = lower.includes('<script');
    const hasHandlers = /\son[a-z]+\s*=/.test(lower); // e.g., onload= onclick=
    if (hasScript || hasHandlers) {
      return {
        verdict: 'suspicious',
        tags: ['svg','active-content'],
        reason: 'SVG contains <script> or event handlers'
      } as const;
    }
    return { verdict: 'clean', tags: ['svg'], reason: '' } as const;
  }
};
