import express from "express";
import multer from "multer";
import { composeScanners, CommonHeuristicsScanner } from "pompelmi";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

// Compose scanners (add YARA later when you have a scanner adapter)
const scanner = composeScanners(
  [
    ["heuristics", CommonHeuristicsScanner],
    // ["yara", YourYaraScanner], // optional: plug your YARA adapter here
  ],
  {
    parallel: false,
    stopOn: "suspicious",
    timeoutMsPerScanner: 1500,
    tagSourceName: true
  }
);

// Policy: map events -> verdict
function mapToVerdict(events = []) {
  const verdicts = events
    .map(e => (e?.meta?.verdict || "").toLowerCase())
    .filter(Boolean);
  if (verdicts.includes("malicious")) return "malicious";
  if (verdicts.includes("suspicious")) return "suspicious";
  return "clean";
}

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });

  try {
    const events = await scanner.scan(req.file.buffer);
    const verdict = mapToVerdict(events);

    if (verdict === "malicious" || verdict === "suspicious") {
      // Pre-quarantine: block early, do not store the file
      return res.status(422).json({ ok: false, verdict, events });
    }

    // Accept the file (in real apps: persist to storage after passing all checks)
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