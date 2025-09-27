import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PKG_DIR = join(ROOT, "packages");
const allowedGlobs = [
  /^package\.json$/,
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
const info = (s) => console.log("•", s);
const ok = (s) => console.log("✅", s);

function isAllowed(path) {
  return allowedGlobs.some((re) => re.test(path));
}
function isBanned(path) {
  return bannedGlobs.some((re) => re.test(path));
}

function readJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }

function listWorkspaces() {
  if (!existsSync(PKG_DIR)) return [];
  return readdirSync(PKG_DIR)
    .map((d) => join("packages", d))
    .filter((d) => existsSync(join(d, "package.json")));
}

function packDry(dir) {
  try {
    const out = execFileSync("npm", ["pack", "--json", "--dry-run"], { cwd: dir, encoding: "utf8" });
    // npm@>=7 returns a JSON array
    const json = JSON.parse(out);
    return json[0] || json; // { files: [...], name, version, filename, ... }
  } catch (e) {
    const msg = String(e.stdout || e.stderr || e.message || "");
    throw new Error(`npm pack failed in ${dir}:\n${msg}`);
  }
}

function checkPackage(dir) {
  const pkg = readJson(join(dir, "package.json"));
  if (!pkg || !pkg.name || pkg.private) return { skipped: true };
  // Only check @pompelmi/* and other publishable libs
  if (pkg.name.startsWith("@pompelmi/") || (pkg.name === "pompelmi" && !pkg.private)) {
    const result = packDry(dir);
    const files = (result.files || []).map((f) => f.path || f.name).sort();
    const problems = [];

    // Basic presence
    if (!files.includes("package.json")) problems.push("package.json missing from tarball");
    if (!files.some((f) => f.startsWith("dist/"))) problems.push("no dist/* files included");

    // Validate types
    if (pkg.types) {
      const hasTypes = files.includes(pkg.types) || files.includes(pkg.types.replace(/^\.\//, ""));
      if (!hasTypes) problems.push(`types file not in tarball: ${pkg.types}`);
    }

    // Scan for leaks / unexpected files
    for (const f of files) {
      if (!isAllowed(f)) {
        if (isBanned(f)) problems.push(`banned file included: ${f}`);
        else problems.push(`unexpected file included: ${f}`);
      }
    }

    // Quick exports sanity
    if (pkg.exports && typeof pkg.exports === "object" && pkg.exports["."]) {
      const mainTarget = Object.values(pkg.exports["."]).find((v) => typeof v === "string" && v.startsWith("dist/"));
      if (!mainTarget) {
        problems.push('exports["."] does not point to dist/*');
      } else {
        const present = files.includes(mainTarget);
        if (!present) problems.push(`exports target missing from tarball: ${mainTarget}`);
      }
    }

    // Report
    console.log(`\n=== ${pkg.name}@${pkg.version} (${dir}) ===`);
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
  return { skipped: true };
}

let bad = 0, checked = 0;
const workspaces = listWorkspaces();
for (const d of workspaces) {
  const res = checkPackage(d);
  if (res.skipped) continue;
  checked++;
  if (res.ok === false) bad++;
}
if (checked === 0) info("No publishable workspaces found (skipped private examples, etc.)");
console.log(`\nSummary: ${bad ? "⚠️ issues found" : "✅ all good"} (checked ${checked} packages)`);
process.exit(0); // advisory only
