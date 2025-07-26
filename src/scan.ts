import { createYaraEngine } from './yara/index'; // oppure './yara/index' / 'local-file-scanner/yara'
import type { YaraMatch } from './yara/index';
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