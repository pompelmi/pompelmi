import { execSync } from "node:child_process";
import { join } from "node:path";

function envWithLocalBins() {
  const bins = [join(process.cwd(), "node_modules/.bin")];
  return { ...process.env, PATH: bins.join(":") + ":" + (process.env.PATH || "") };
}
function run(label, cmd, parser){
  console.log(`\n=== ${label} ===`);
  try {
    const out = execSync(cmd, { encoding: "utf8", env: envWithLocalBins() });
    parser ? parser(out) : console.log(out.trim());
    return 0;
  } catch (e) {
    const out = (e?.stdout?.toString() || "") + (e?.stderr?.toString() || e.message);
    parser ? parser(out) : console.log(out.trim());
    return 1;
  }
}
function knipJson(out){
  try {
    const data = JSON.parse(out);
    const files = data?.unused?.files?.length || 0;
    const deps  = Object.keys(data?.unused?.dependencies ?? {}).length;
    const exps  = data?.unused?.exports?.length || 0;
    console.log(`Unused files: ${files}, deps: ${deps}, exports: ${exps}`);
    if (files) console.log("→ files:", (data.unused.files||[]).slice(0,10).join(", "));
  } catch { console.log(out.trim()); }
}

let rc=0;
rc |= run("KNIP (json)", "knip --production --reporter json --tsConfig tsconfig.json", knipJson);
rc |= run("DEPCHECK (unused/missing deps)", "depcheck --skip-missing true --ignore-dirs website,site,samples,dist --ignores @biomejs/biome,tsup,@vitest/coverage-v8,rollup");
rc |= run("TS-PRUNE (unused exported symbols)", "ts-prune -p tsconfig.json");

console.log("\\nSummary:", rc === 0 ? "✅ clean" : "⚠️ check findings above");
