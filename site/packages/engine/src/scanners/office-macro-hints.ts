/**
 * OfficeMacroHintsScanner
 * - Scansiona ZIP OOXML (docx/xlsx/pptx) cercando indicatori di macro / oggetti attivi:
 *   vbaProject.bin, _vba_project.bin, macrosheets (XLM), oleObject, activex.
 * Verdict:
 *   - suspicious se trovati indicatori
 *   - clean altrimenti (o se non ZIP/OOXML)
 */
function le16(dv: DataView, o: number) { return dv.getUint16(o, true); }
function le32(dv: DataView, o: number) { return dv.getUint32(o, true); }
function decode(bytes: Uint8Array) {
  try { return new TextDecoder('utf-8').decode(bytes); } catch { return new TextDecoder('latin1').decode(bytes); }
}

function collectCentralNames(bytes: Uint8Array): string[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const SIG_CEN = 0x02014b50; // PK\x01\x02
  const out: string[] = [];
  for (let i = 0; i + 46 <= bytes.length; ) {
    const sig = le32(dv, i);
    if (sig !== SIG_CEN) { i++; continue; }
    const nameLen  = le16(dv, i + 28);
    const extraLen = le16(dv, i + 30);
    const commLen  = le16(dv, i + 32);
    const nameStart = i + 46;
    const nameEnd   = nameStart + nameLen;
    if (nameEnd > bytes.length) break;
    const name = decode(bytes.subarray(nameStart, nameEnd));
    out.push(name);
    i = nameEnd + extraLen + commLen;
  }
  return out;
}

function looksZip(bytes: Uint8Array) {
  const b = bytes;
  return b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) && (b[3] === 0x04 || b[3] === 0x06 || b[3] === 0x08);
}

export const OfficeMacroHintsScanner = {
  name: 'office-macro-hints',
  async scan(bytes: Uint8Array) {
    if (!looksZip(bytes)) {
      return { verdict: 'clean', tags: [], reason: '' } as const;
    }
    const names = collectCentralNames(bytes).map(n => n.replace(/\\/g, '/'));
    if (names.length === 0) {
      return { verdict: 'clean', tags: ['zip'], reason: '' } as const;
    }

    // Heuristic OOXML check
    const isOOXML = names.includes('[Content_Types].xml') && names.some(n => /^((word|xl|ppt)\/)/.test(n));
    if (!isOOXML) {
      return { verdict: 'clean', tags: ['zip'], reason: '' } as const;
    }

    const INDICATORS = [
      /(^|\/)vbaProject\.bin$/i,
      /(^|\/)_vba_project\.bin$/i,
      /^xl\/macrosheets\//i,               // Excel 4.0 XLM
      /(^|\/)oleObject/i,
      /(^|\/)activex/i
    ];
    const hits = names.filter(n => INDICATORS.some(rx => rx.test(n)));

    if (hits.length) {
      return {
        verdict: 'suspicious',
        tags: ['office','ooxml','macro-hints', ...hits.slice(0,5)],
        reason: `OOXML contains macro/ActiveX indicators: ${hits.slice(0,3).join(', ')}`
      } as const;
    }

    return { verdict: 'clean', tags: ['office','ooxml'], reason: '' } as const;
  }
};
