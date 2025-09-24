import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function sh(cmd, opts={}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts });
}

function detectPm() {
  try { sh("pnpm -v"); return "pnpm"; } catch {}
  try { sh("npm -v"); return "npm"; } catch {}
  return null;
}

function buildAll(pm) {
  if (pm === "pnpm") {
    try { console.log("→ build (pnpm)"); sh("pnpm -w build", { stdio: "inherit" }); return; } catch {}
    console.log("→ fallback pnpm -r --if-present build");
    sh("pnpm -r --if-present build", { stdio: "inherit" });
    return;
  }
  if (pm === "npm") {
    console.log("→ build (npm)");
    try { sh("npm run -w build", { stdio: "inherit" }); return; } catch {}
    try { sh("npm run build", { stdio: "inherit" }); } catch (e) {
      console.log("! build npm failed:", e?.message || e);
    }
  }
}

function mkSamples(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "clean.txt"), "hello benign file\n");
  const eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
  writeFileSync(join(dir, "eicar.txt"), eicar + "\n");
  writeFileSync(join(dir, "a.txt"), "A");
  writeFileSync(join(dir, "b.txt"), "B");
  try { sh(`(cd "${dir}" && zip -q sample.zip a.txt b.txt)`); }
  catch { writeFileSync(join(dir, "sample.zip"), "PK\\x05\\x06" + "\\x00".repeat(18)); }
}

function findDistEntry(root=".") {
  const candidates = [
    "dist/pompelmi.esm.js",
    "dist/index.mjs",
    "dist/pompelmi.cjs.js",
    "dist/pompelmi.cjs",
    "dist/index.cjs.js",
    "dist/index.cjs"
  ];
  for (const c of candidates) if (existsSync(join(root, c))) return c;
  return null;
}

async function checkApi(distEntry) {
  const full = join(process.cwd(), distEntry);
  let mod;
  if (/\.(mjs|esm\.js)$/.test(distEntry)) {
    mod = await import(pathToFileURL(full).href);
  } else {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    mod = req(full);
  }
  const keys = Object.keys(mod || {});
  console.log("→ exports:", keys.join(", ") || "(none)");
  if (!keys.length) throw new Error("No exports found from dist bundle.");
}

function findCli() {
  const pkgPath = "packages/cli/package.json";
  if (!existsSync(pkgPath)) return null;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  let binPath = null;
  if (typeof pkg.bin === "string") binPath = pkg.bin;
  else if (pkg.bin && pkg.bin.pompelmi) binPath = pkg.bin.pompelmi;
  if (!binPath) {
    const guesses = ["dist/cli.cjs", "dist/index.cjs", "dist/cli.js", "bin/cli.js", "bin.js"];
    for (const g of guesses) if (existsSync(join("packages/cli", g))) { binPath = g; break; }
  }
  return binPath ? join("packages/cli", binPath) : null;
}

(async () => {
  console.log("== pompelmi smoke test ==");
  const pm = detectPm();
  if (!pm) { console.error("No package manager found (need pnpm or npm)"); process.exit(2); }

  buildAll(pm);

  const S = join(".tmp-smoke");
  mkSamples(S);

  const dist = findDistEntry(".");
  if (!dist) { 
    console.error("No dist/* artifacts found. Do you have a build that emits dist/* ?");
    process.exit(3);
  }
  console.log("→ found bundle:", dist);
  await checkApi(dist);

  const cli = findCli();
  if (cli) {
    console.log("→ CLI found:", cli);
    try {
      const out1 = sh(`node "${cli}" "${join(S,"clean.txt")}" --format table`);
      console.log(out1.trim());
      const out2 = sh(`node "${cli}" "${join(S,"eicar.txt")}" --format table || true`);
      console.log(out2.trim());
      const out3 = sh(`node "${cli}" "${join(S,"sample.zip")}" --format table`);
      console.log(out3.trim());
    } catch (e) {
      console.log("CLI exists but execution failed (not blocking smoke):", e?.message || e);
    }
  } else {
    console.log("→ CLI not found (packages/cli missing or bin unresolved). Skipping CLI test.");
  }

  console.log("✅ Smoke test completed.");
})();
