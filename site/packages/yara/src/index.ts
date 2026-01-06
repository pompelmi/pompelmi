// Minimal scanner contract (kept local to avoid tight coupling)
export type Verdict = "clean" | "suspicious" | "malicious";

export interface YaraMatch {
  rule: string;
  namespace?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
  strings?: Array<{ name?: string; offset?: number; data?: string }>;
}

export interface ScanResult {
  verdict: Verdict;
  engine: "yara";
  tags: string[];        // compact reason tags (rule names, etc.)
  matches: YaraMatch[];  // raw matches (best-effort parsed)
  raw?: unknown;         // original CLI JSON (if available)
}

export interface ScannerLike {
  name: string;
  scan: (bytes: Uint8Array | ArrayBuffer | Buffer, ctx?: { filename?: string; mime?: string }) => Promise<ScanResult>;
}

export interface CreateYaraScannerOptions {
  rulesPath: string | string[];               // path(s) to .yar files (globs are okay if your shell expands them)
  yaraPath?: string;                          // default: "yara"
  timeoutMs?: number;                         // soft timeout enforced from Node side (default 1500ms)
  treatMatchAs?: Exclude<Verdict, "clean">;   // default: "suspicious"
  ignoreRules?: string[];                     // drop matches for these rule names
  externalVars?: Record<string, string | number | boolean>; // passed as -d name=value
}

import { spawn } from "node:child_process";

export function createYaraScanner(opts: CreateYaraScannerOptions): ScannerLike {
  const {
    rulesPath,
    yaraPath = "yara",
    timeoutMs = 1500,
    treatMatchAs = "suspicious",
    ignoreRules = [],
    externalVars = {}
  } = opts;

  const rules = Array.isArray(rulesPath) ? rulesPath : [rulesPath];

  return {
    name: "yara",
    async scan(input, ctx) {
      const bytes = toBuffer(input);

      // Attempt JSON output first (-j / --print-json). If unavailable, fall back to text parsing.
      const argsBase = [
        // Print tags and metadata when not using JSON (harmless if JSON enabled)
        "--print-tags",
        "--print-meta"
      ];

      // CLI timeout (seconds) if supported; Node-side timeout guards regardless
      const seconds = Math.max(1, Math.floor(timeoutMs / 1000));
      argsBase.push(`--timeout=${seconds}`);

      // External variables: -d name=value
      const extVars = Object.entries(externalVars).flatMap(([k, v]) => ["-d", `${k}=${v}`]);

      const argsJson = [...argsBase, "-j", ...rules, "-"]; // -j == JSON if supported; "-" == read stdin
      const argsText = [...argsBase, ...rules, "-"];

      // Try JSON run
      let out = await runYaraOnce(yaraPath, argsJson, bytes, timeoutMs).catch(() => null);

      let parsed: { matches: YaraMatch[]; raw?: unknown } | null = null;
      if (out && out.code !== 2) { // 0: matches; 1: no matches; 2: error
        parsed = parseJsonOutput(out.stdout);
      }

      // If JSON failed or not supported, try text mode
      if (!parsed) {
        out = await runYaraOnce(yaraPath, [...extVars, ...argsText], bytes, timeoutMs).catch((e) => e?.out ?? null);
        parsed = parseTextOutput(out?.stdout ?? "");
      }

      const all = (parsed?.matches ?? []).filter(m => !ignoreRules.includes(m.rule));

      // Escalate to malicious if a match declares severity/high/critical via tags or meta
      let verdict: Verdict = all.length ? treatMatchAs : "clean";
      if (all.some(m =>
        (m.meta && (m.meta["verdict"] === "malicious" || m.meta["severity"] === "high" || m.meta["severity"] === "critical")) ||
        (m.tags?.includes("malicious") || m.tags?.includes("sev:high") || m.tags?.includes("sev:critical"))
      )) {
        verdict = "malicious";
      }

      const tags = all.slice(0, 10).flatMap(m => ["yara", m.rule, ...(m.tags ?? []).slice(0, 2)]).slice(0, 12);

      return {
        verdict,
        engine: "yara",
        tags,
        matches: all,
        raw: parsed?.raw
      };
    }
  };
}

function toBuffer(x: Uint8Array | ArrayBuffer | Buffer): Buffer {
  if (Buffer.isBuffer(x)) return x;
  if (x instanceof ArrayBuffer) return Buffer.from(x);
  return Buffer.from(x.buffer, x.byteOffset, x.byteLength);
}

type ProcOut = { code: number; stdout: string; stderr: string };

async function runYaraOnce(cmd: string, args: string[], bytes: Buffer, timeoutMs: number): Promise<ProcOut> {
  return new Promise<ProcOut>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("yara timeout"));
    }, timeoutMs);

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 2, stdout, stderr });
    });

    child.stdin.write(bytes);
    child.stdin.end();
  });
}

function parseJsonOutput(stdout: string | null | undefined): { matches: YaraMatch[]; raw?: unknown } | null {
  if (!stdout) return { matches: [] };
  try {
    const data = JSON.parse(stdout);
    // Common shapes seen with -j: either an array of hits or an object with matches
    const arr: any[] =
      Array.isArray(data) ? data :
      Array.isArray((data as any)?.matches) ? (data as any).matches :
      [];

    const matches: YaraMatch[] = arr.map((m: any) => ({
      rule: m.rule ?? m.signature ?? "unknown_rule",
      namespace: m.namespace,
      tags: m.tags ?? [],
      meta: m.meta ?? {},
      strings: Array.isArray(m.strings) ? m.strings : []
    }));
    return { matches, raw: data };
  } catch {
    return null;
  }
}

function parseTextOutput(stdout: string): { matches: YaraMatch[] } {
  // Very tolerant parser: lines like "RULENAME <path or ->"
  const matches: YaraMatch[] = [];
  const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // grab the first token as rule name
    const rule = line.split(/\s+/)[0] ?? "unknown_rule";
    matches.push({ rule });
  }
  return { matches };
}

// Convenience default export
export default { createYaraScanner };
