import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Trova tutti i package.json (root + packages/*)
function listPackageJsons() {
  const files = [];
  const rootPkg = path.join(root, 'package.json');
  if (fs.existsSync(rootPkg)) files.push(rootPkg);
  const pkgsDir = path.join(root, 'packages');
  if (fs.existsSync(pkgsDir)) {
    for (const name of fs.readdirSync(pkgsDir)) {
      const p = path.join(pkgsDir, name, 'package.json');
      if (fs.existsSync(p)) files.push(p);
    }
  }
  return files;
}

// Ripulisce chiavi invalide tipo `true: "false",` o `true: false,`
function sanitize(text) {
  // rimuovi linee con chiave non quotata 'true' (stringa o booleano)
  let out = text.replace(/\n\s*true\s*:\s*".*?"\s*,\s*\n/g, '\n');
  out = out.replace(/\n\s*true\s*:\s*(true|false)\s*,\s*\n/g, '\n');
  return out;
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

const files = listPackageJsons();
let hadError = false;

for (const file of files) {
  try {
    let raw = fs.readFileSync(file, 'utf8');
    const cleaned = sanitize(raw);

    // Prova a parsare (prima del settaggio campi)
    let pkg;
    try {
      pkg = JSON.parse(cleaned);
    } catch (e) {
      console.error('[ERROR] Invalid JSON after sanitize:', file, e.message);
      hadError = true;
      continue;
    }

    // Se è un package dentro "packages/", imposta campi per publish
    const rel = path.relative(root, file);
    const isWorkspacePkg = rel.startsWith(`packages${path.sep}`);

    if (isWorkspacePkg) {
      pkg.private = false;

      pkg.publishConfig = pkg.publishConfig || {};
      pkg.publishConfig.access = 'public';

      // pubblica solo la build
      pkg.files = Array.isArray(pkg.files) ? pkg.files : [];
      if (!pkg.files.includes('dist')) pkg.files = ['dist'];

      // versione minima Node (aiuta anche il badge dinamico)
      pkg.engines = pkg.engines || {};
      pkg.engines.node = pkg.engines.node || '>=18.17';
    }

    fs.writeFileSync(file, pretty(pkg), 'utf8');
    console.log('✔ fixed', file);
  } catch (err) {
    hadError = true;
    console.error('[ERROR] Failed fixing', file, err);
  }
}

if (hadError) {
  console.error('\nSome files failed to fix. Open them and check for stray lines or trailing commas.');
  process.exit(1);
}
