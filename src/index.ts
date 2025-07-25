import yara from 'yara';
import { promisify } from 'util';
/**
 * Calcola l'entropia di Shannon su un Buffer
 */
function shannonEntropy(buffer: Buffer): number {
  const counts = new Array<number>(256).fill(0);
  for (const b of buffer) counts[b]++;
  const len = buffer.length;
  let ent = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

export async function checkFile(
  input: File | Buffer,
  filename?: string
): Promise<{ ok: boolean; msg: string }> {
  let name: string;
  let buf: Buffer;

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    if (!filename) {
      throw new Error(
        'Quando passi un Buffer devi fornire anche il nome del file come secondo argomento.'
      );
    }
    name = filename;
    buf = input;
  } else {
    // browser File
    name = (input as File).name;
    const ab = await (input as File).arrayBuffer();
    buf = Buffer.from(ab);
  }

  // Controllo tipo via magic bytes (file-type)
 // Controllo tipo via magic bytes (file-type)
const { fileTypeFromBuffer } = await import('file-type');
const ft = await fileTypeFromBuffer(buf);
if (ft && ft.ext !== 'txt') {
  return { ok: false, msg: `Tipo file non consentito: ${ft.ext}` };
}

  // 1) Controllo estensione
  if (!name.endsWith('.txt')) {
    return { ok: false, msg: 'Solo file .txt permessi' };
  }

  // 2) Controllo entropia (packers/crypto)
  const ent = shannonEntropy(buf);
  if (ent > 7.5) {
    return { ok: false, msg: `Entropia elevata: ${ent.toFixed(2)}` };
  }

  // 3) Controllo YARA con @automattic/yara
  const initializeYara = promisify(yara.initialize.bind(yara));
  await initializeYara();

  const rules = [
    {
      string: `
        rule SuspiciousString {
          strings:
            $a = "malicious"
          condition:
            $a
        }
      `
    }
  ];

  const scanner = yara.createScanner();
  const configure = promisify(scanner.configure.bind(scanner));
  await configure({ rules });

  const scanAsync = promisify(scanner.scan.bind(scanner));
  const result = (await scanAsync({ buffer: buf })) as any;
  if (result.rules && result.rules.length > 0) {
    const ids = result.rules.map((r: any) => r.id).join(', ');
    return { ok: false, msg: `YARA match: ${ids}` };
  }

  return { ok: true, msg: 'File .txt OK' };
}