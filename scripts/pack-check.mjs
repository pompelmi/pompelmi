import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const STRICT = process.argv.includes("--strict");
const ROOT = process.cwd();
const PKG_DIR = join(ROOT, "packages");

const allowedGlobs = [
  /^package\.json$/i,
  /^README(\.md)?$/i,
  /^LICENSE(\..*)?$/i,
  /^CHANGELOG(\..*)?$/i,
  /^dist\/.*/i
];
const bannedGlobs = [
  /^src\/.*/i,
  /^test(s)?\/.*/i,
  /^__tests__\/.*/i,
  /^\.github\/.*/i,
  /^\.vscode\/.*/i,
  /^scripts\/.*/i,
  /^examples?\/.*/i
];

const warn = (s) => console.log("⚠️", s);
const ok = (s) => console.log("✅", s);

function isAllowed(path) { return allowedGlobs.some((re) => re.test(path)); }
function isBanned(path) { return bannedGlobs.some((re) => re.test(path)); }

function readJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }

function listWorkspaceDirs() {
  const dirs = [];
  if (existsSync(PKG_DIR)) {
    for (const d of readdirSync(PKG_DIR)) {
      const dir = join("packages", d);
      if (existsSync(join(dir, "package.json"))) dirs.push(dir);
    }
  }
  return dirs;
}

function npmPackDry(dir) {
  const out = execFileSync("npm", ["pack", "--json", "--dry-run"], { cwd: dir, encoding: "utf8" });
  const json = JSON.parse(out);
  return Array.isArray(json) ? json[0] : json;
}

function checkOne(dir, rootAlias = null) {
  const pkg = readJson(join(dir, "package.json"));
  if (!pkg || !pkg.name || pkg.private) return { skipped: true };
  const isPomp = pkg.name.startsWith("@pompelmi/") || pkg.name === "pompelmi";
  if (!isPomp) return { skipped: true };

  const result = npmPackDry(dir);
  const files = (result.files || []).map((f) => f.path || f.name).sort();
  const problems = [];

  if (!files.includes("package.json")) problems.push("package.json missing from tarball");
  if (!files.some((f) => f.startsWith("dist/"))) problems.push("no dist/* files included");

  if (pkg.types) {
    const t = pkg.types.replace(/^\.\//, "");
    if (!files.includes(t)) problems.push(`types file not in tarball: ${pkg.types}`);
  }

  for (const f of files) {
    if (!isAllowed(f)) problems.push(isBanned(f) ? `banned file included: ${f}` : `unexpected file included: ${f}`);
  }

  if (pkg.exports && typeof pkg.exports === "object" && pkg.exports["."]) {
    const dot = pkg.exports["."];
    const targets = Object.values(dot).filter((v) => typeof v === "string");
    const distTargets = targets.filter((v) => v.startsWith("./") ? v.slice(2).startsWith("dist/") : v.startsWith("dist/"));
    // If there are export targets, at least one should be in dist and present in tarball
    if (targets.length && !distTargets.length) problems.push('exports["."] does not point to dist/*');
    for (const tRaw of distTargets) {
      const t = (tRaw.startsWith("./") ? tRaw.slice(2) : tRaw);
      if (!files.includes(t)) problems.push(`exports target missing from tarball: ${t}`);
    }
  }

  const label = rootAlias || `${pkg.name}@${pkg.version} (${dir})`;
  console.log(`\n=== ${label} ===`);
  console.log(`files: ${files.length}`);
  for (const f of files.slice(0, 20)) console.log(`  - ${f}`);
  if (files.length > 20) console.log(`  … +${files.length - 20} more`);

  if (problems.length) {
    problems.forEach((p) => warn(p));
    return { ok: false, problems };
  } else {
    ok("tarball looks good");
    return { ok: true };
  }
}

let bad = 0, checked = 0;

// Check all workspaces
for (const d of listWorkspaceDirs()) {
  const res = checkOne(d);
  if (res.skipped) continue;
  checked++;
  if (res.ok === false) bad++;
}

// Check root package too (if publishable)
const rootPkg = readJson(join(ROOT, "package.json"));
if (rootPkg && rootPkg.name && !rootPkg.private) {
  const res = checkOne(ROOT, `${rootPkg.name}@${rootPkg.version} (root)`);
  checked++;
  if (res.ok === false) bad++;
}

console.log(`\nSummary: ${bad ? "⚠️ issues found" : "✅ all good"} (checked ${checked} packages)`);
process.exit(STRICT && bad ? 1 : 0);
