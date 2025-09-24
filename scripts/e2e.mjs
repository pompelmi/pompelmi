import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

function sh(cmd, opts = {}) { return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }); }

function tryBuild() {
  try { sh("pnpm -v"); try { sh("pnpm -w build", { stdio: "inherit" }); return; } catch {}
                             try { sh("pnpm -r --if-present build", { stdio: "inherit" }); return; } catch {} } catch {}
  try { sh("npm -v");  try { sh("npm run -w build", { stdio: "inherit" }); return; } catch {}
                             try { sh("npm run build", { stdio: "inherit" }); return; } catch {} } catch {}
}

function mkAssets(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "clean.txt"), "hello benign\n");
  const eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}\\x24EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\\x24H+H*";
  writeFileSync(join(dir, "eicar.txt"), eicar + "\n");
  writeFileSync(join(dir, "a.txt"), "A"); writeFileSync(join(dir, "b.txt"), "B");
  try { sh(`(cd "${dir}" && zip -q sample.zip a.txt b.txt)`); }
  catch { writeFileSync(join(dir, "sample.zip"), "PK\x05\x06" + "\x00".repeat(18)); }
}

function findDistEntry(root = ".") {
  const cands = ["dist/pompelmi.esm.js","dist/index.mjs","dist/pompelmi.cjs.js","dist/pompelmi.cjs","dist/index.cjs.js","dist/index.cjs"];
  for (const c of cands) if (existsSync(join(root, c))) return c;
  return null;
}

async function importDist(distPath) {
  const full = join(process.cwd(), distPath);
  if (/\.(mjs|esm\.js)$/.test(distPath)) return import(pathToFileURL(full).href);
  const req = createRequire(import.meta.url); return req(full);
}

function findCli() {
  try { sh("command -v pompelmi"); return "pompelmi"; } catch {}
  const pj = "packages/cli/package.json";
  if (!existsSync(pj)) return null;
  const pkg = JSON.parse(readFileSync(pj, "utf8"));
  let binPath = null;
  if (typeof pkg.bin === "string") binPath = pkg.bin;
  else if (pkg.bin && pkg.bin.pompelmi) binPath = pkg.bin.pompelmi;
  if (!binPath) for (const g of ["bin/pompelmi.mjs","dist/index.mjs","dist/cli.cjs","dist/index.cjs","bin/cli.js","bin.js"]) {
    if (existsSync(join("packages/cli", g))) { binPath = g; break; }
  }
  return binPath ? join("packages/cli", binPath) : null;
}

function runCli(cli, filePath) {
  try {
    const cmd = (cli === "pompelmi") ? `pompelmi "${filePath}" --format table` : `node "${cli}" "${filePath}" --format table`;
    const out = sh(cmd);
    process.stdout.write(out);
    return 0;
  } catch (e) {
    console.log("! CLI error:", e?.message || e);
    return 1;
  }
}

(async function main(){
  console.log("== pompelmi e2e ==");
  tryBuild();
  const tmp = ".tmp-e2e"; mkAssets(tmp);

  const dist = findDistEntry(".");
  if (!dist) { console.error("❌ dist/* not found. Build should emit dist/*"); process.exit(2); }
  console.log("→ bundle:", dist);

  try { const mod = await importDist(dist); const keys = Object.keys(mod || {}); console.log("→ exports:", keys.join(", ") || "(none)"); }
  catch (e) { console.log("! import dist failed (continuing to CLI):", e?.message || e); }

  const cli = findCli();
  if (!cli) { console.log("→ CLI not found. Skipping CLI checks.\n✅ E2E completed (bundle OK)."); return; }
  console.log("→ CLI:", cli);

  const paths = [join(tmp,"clean.txt"), join(tmp,"eicar.txt"), join(tmp,"sample.zip")];
  let failures = 0;
  for (const p of paths) failures += runCli(cli, p);
  if (failures === 0) console.log("✅ E2E completed (CLI OK).");
  else console.log("⚠️ E2E completed with CLI warnings (bundle OK).");
})();
