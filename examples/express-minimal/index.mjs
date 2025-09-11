import express from "express";
import multer from "multer";

// Try to import pompelmi in several ways; fall back if unavailable
let composeScanners, CommonHeuristicsScanner;
async function loadPompelmi() {
  try {
    const m = await import("pompelmi");
    composeScanners = m.composeScanners ?? m.default?.composeScanners;
    CommonHeuristicsScanner = m.CommonHeuristicsScanner ?? m.default?.CommonHeuristicsScanner;
  } catch {}
  if (!composeScanners) {
    try {
      const m = await import("../../dist/index.js");
      composeScanners = m.composeScanners ?? m.default?.composeScanners;
      CommonHeuristicsScanner = m.CommonHeuristicsScanner ?? m.default?.CommonHeuristicsScanner;
    } catch {}
  }
  if (!composeScanners) {
    // Minimal fallback so the demo still works
    console.warn("[demo] Using fallback composeScanners; could not import 'pompelmi'.");
    composeScanners = (entries, opts = {}) => ({
      async scan(bytes) {
        let all = [];
        for (const [name, s] of entries) {
          const res = (await s.scan(bytes)) || [];
          if (opts.tagSourceName) res.forEach(e => (e.source ??= name));
          all = all.concat(res);
          const stop = (opts.stopOn || "").toLowerCase();
          if (stop && res.some(e => (e?.meta?.verdict || "").toLowerCase() === stop)) break;
        }
        return all;
      }
    });
    CommonHeuristicsScanner = { async scan() { return []; } };
  }
}

await loadPompelmi();

/**
 * SimplePdfJsMacroScanner
 * - Flags PDFs that contain JavaScript + an open action
 * - Flags text that looks like suspicious Office macro code (>=2 keywords)
 * Returns events with meta.verdict = "suspicious"
 */
const SimplePdfJsMacroScanner = {
  async scan(bytes) {
    const text = Buffer.from(bytes).toString("utf8");
    const events = [];

    // Heuristic: PDF with embedded JS and open action
    const looksPdf = text.startsWith("%PDF");
    const hasJs = text.includes("/JavaScript") || text.includes("/JS");
    const hasOpen = text.includes("/OpenAction") || text.includes("/AA");
    if (looksPdf && hasJs && hasOpen) {
      events.push({
        rule: "PDF_JS_Heuristic",
        meta: {
          description: "PDF contains JavaScript with an open action",
          verdict: "suspicious",
          source: "SimplePdfJsMacroScanner"
        },
        tags: ["pdf", "js", "heuristic"]
      });
    }

    // Heuristic: macro suspicious words (need >=2 to trigger)
    const macroWords = [
      "AutoOpen", "AutoClose", "Document_Open", "CreateObject(",
      "WScript.Shell", "Shell(", "Sub Workbook_Open()"
    ];
    const macroHits = macroWords.filter(w => text.includes(w)).length;
    if (macroHits >= 2) {
      events.push({
        rule: "Office_Macro_Heuristic",
        meta: {
          description: "Suspicious macro-like keywords",
          verdict: "suspicious",
          hits: macroHits,
          source: "SimplePdfJsMacroScanner"
        },
        tags: ["office", "vba", "heuristic"]
      });
    }

    return events;
  }
};

// Compose scanners (add more later if you want)
let scanners = [
  ["heuristics", CommonHeuristicsScanner],
  ["simple-heuristics", SimplePdfJsMacroScanner],
];
if (process.env.USE_YARA_CLI === "1") {
  const { YaraCliScanner } = await import("./yara-cli-scanner.mjs");
  scanners.push(["yara-cli", YaraCliScanner]);
}
const scanner = composeScanners(scanners, {
  parallel: false,
  stopOn: "suspicious",
  timeoutMsPerScanner: 1500,
  tagSourceName: true
});

// Verdict mapper
function mapToVerdict(events = []) {
  const verdicts = events.map(e => (e?.meta?.verdict || "").toLowerCase()).filter(Boolean);
  if (verdicts.includes("malicious")) return "malicious";
  if (verdicts.includes("suspicious")) return "suspicious";
  return "clean";
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });

  try {
    const events = await scanner.scan(req.file.buffer);
    const verdict = mapToVerdict(events);

    if (verdict === "malicious" || verdict === "suspicious") {
      // Pre-quarantine: block early, do not store the file
      return res.status(422).json({ ok: false, verdict, events });
    }

    // Accept the file (in real apps: persist only after clean verdict)
    return res.json({ ok: true, verdict, events: [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "scan_failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`pompelmi demo listening at http://localhost:${PORT}`);
});
