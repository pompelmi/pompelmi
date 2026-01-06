import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as url from "node:url";
import { execFile } from "node:child_process";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "..", "..", "rules", "starter");

async function buildTempRulesFile() {
  const entries = await fs.readdir(RULES_DIR, { withFileTypes: true }).catch(() => []);
  const files = entries.filter(e => e.isFile() && e.name.endsWith(".yar")).map(e => path.join(RULES_DIR, e.name));
  if (!files.length) throw new Error("No .yar files found in rules/starter/");
  const text = (await Promise.all(files.map(p => fs.readFile(p, "utf8")))).join("\n\n");
  const tmp = path.join(os.tmpdir(), `pompelmi-rules-${Date.now()}-${Math.random().toString(36).slice(2)}.yar`);
  await fs.writeFile(tmp, text, "utf8");
  return tmp;
}

function execYara(args) {
  return new Promise((resolve, reject) => {
    execFile("yara", args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && err.code !== 1) return reject(new Error(stderr || err.message)); // exit 1 = no matches
      resolve(stdout || "");
    });
  });
}

// Parse lines like: RuleName [k=v, verdict=malicious] /tmp/file
function parseYaraOutput(stdout) {
  const events = [];
  for (const line of stdout.trim().split("\n").filter(Boolean)) {
    const m = line.match(/^([^\s]+)\s+(?:\[(.*?)\]\s+)?/);
    if (!m) continue;
    const rule = m[1];
    const meta = {};
    if (m[2]) {
      for (const pair of m[2].split(",").map(s => s.trim()).filter(Boolean)) {
        const idx = pair.indexOf("=");
        if (idx > 0) {
          const k = pair.slice(0, idx).trim();
          let v = pair.slice(idx + 1).trim();
          v = v.replace(/^"|"$/g, "");
          meta[k] = v;
        }
      }
    }
    events.push({ rule, meta, tags: ["yara", "cli"] });
  }
  return events;
}

export const YaraCliScanner = {
  async scan(bytes) {
    const uploadFile = path.join(os.tmpdir(), `pompelmi-upload-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
    await fs.writeFile(uploadFile, Buffer.from(bytes));
    const rulesFile = await buildTempRulesFile();
    const stdout = await execYara(["-m", "-s", rulesFile, uploadFile]).finally(async () => {
      await fs.unlink(uploadFile).catch(() => {});
      await fs.unlink(rulesFile).catch(() => {});
    });
    if (!stdout.trim()) return [];
    const events = parseYaraOutput(stdout);
    // Default verdict if rule meta doesn't specify one
    for (const e of events) e.meta.verdict ??= "suspicious";
    return events;
  }
};
