import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ⬇️ ADATTA questo import alla tua API reale.
// Se la tua funzione si chiama diversamente o sta altrove, cambia percorso/nome.
import { scanDir } from '../src/node/scanDir';

// 1) Prepara una cartella temporanea con un file di test
const dir = resolve(process.cwd(), 'tmp-yara-int');
await mkdir(dir, { recursive: true });
await writeFile(resolve(dir, 'sample.txt'), 'hello VIRUS world');

// 2) Opzioni: abilita YARA e punta al file regole
const opts = {
  enableYara: true,
  yaraRulesPath: resolve(process.cwd(), 'rules/demo.yar'),
  // Se il tuo scanner usa include/esclude, puoi filtrare:
  // include: ['**/*.txt']
};

// 3) Esegui la scansione della cartella temporanea e cerca l’entry del file
let found = false;
for await (const entry of scanDir(dir, opts)) {
  if (entry.path?.endsWith('sample.txt') || entry.absPath?.endsWith('sample.txt')) {
    console.log('ENTRY:', { path: entry.path, yara: entry.yara });
    found = true;
  }
}

if (!found) {
  console.warn('ATTENZIONE: non ho trovato sample.txt nelle entries. Controlla i filtri include/esclude o i path emessi.');
}