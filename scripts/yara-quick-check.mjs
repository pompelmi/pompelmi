// Minimal checker for rules under rules/starter/*.yar
// Usage: npm run yara:check -- ./path/to/file
import { promises as fs } from "node:fs";
import path from "node:path";
import * as url from "node:url";

let Yara;
try {
  Yara = await import("@automattic/yara");
} catch {
  console.error("Please install @automattic/yara first: npm i -D @automattic/yara");
  process.exit(1);
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const RULES_DIR = path.join(__dirname, "..", "rules", "starter");

async function readRulePack(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter(e => e.isFile() && e.name.endsWith(".yar"))
    .map(e => path.join(dir, e.name));
  if (files.length === 0) throw new Error("No .yar files found in rules/starter/");
  const texts = await Promise.all(files.map(p => fs.readFile(p, "utf8")));
  return texts.join("\n\n");
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npm run yara:check -- ./path/to/file");
    process.exit(1);
  }

  const stats = await fs.stat(target).catch(() => null);
  if (!stats || !stats.isFile()) throw new Error(`Not a file: ${target}`);

  const sourceText = await readRulePack(RULES_DIR);
  const rules = await Yara.compile(sourceText);

  const buf = await fs.readFile(target);
  const matches = await rules.scan(buf, { timeout: 1500 });

  if (!matches.length) {
    console.log("No YARA matches.");
    return;
  }

  console.log(`Matched ${matches.length} rule(s):`);
  for (const m of matches) {
    const verdict = m.meta?.verdict ?? "n/a";
    const desc = m.meta?.description ?? "";
    console.log(`- ${m.rule} (${verdict}) — ${desc}`);
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
