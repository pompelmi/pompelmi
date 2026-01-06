import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

const RULES_DIR = path.join(process.cwd(), "rules", "starter");

async function buildTempRules() {
  const entries = await fs.readdir(RULES_DIR, { withFileTypes: true }).catch(() => []);
  const files = entries.filter(e => e.isFile() && e.name.endsWith(".yar")).map(e => path.join(RULES_DIR, e.name));
  if (!files.length) throw new Error("No .yar files found in rules/starter/");
  const text = (await Promise.all(files.map(p => fs.readFile(p, "utf8")))).join("\n\n");
  const tmp = path.join(os.tmpdir(), `pompelmi-rules-${Date.now()}.yar`);
  await fs.writeFile(tmp, text, "utf8");
  return tmp;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npm run yara:check -- ./path/to/file");
    process.exit(1);
  }
  const stats = await fs.stat(target).catch(() => null);
  if (!stats || !stats.isFile()) throw new Error(`Not a file: ${target}`);

  const rulesFile = await buildTempRules();

  await new Promise((resolve, reject) => {
    execFile("yara", ["-s", rulesFile, target], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && err.code !== 1) return reject(err); // yara exits 1 when no matches
      if (!stdout.trim()) {
        console.log("No YARA matches.");
      } else {
        console.log(stdout.trim());
      }
      if (stderr.trim()) console.error(stderr.trim());
      resolve();
    });
  });
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
