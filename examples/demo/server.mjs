import express from "express";
import multer from "multer";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanBytes, STRICT_PUBLIC_UPLOAD } from "pompelmi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get("/", (_req, res) => {
  const html = readFileSync(join(__dirname, "index.html"), "utf8");
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.send(html);
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const report = await scanBytes(req.file.buffer, {
    policy: STRICT_PUBLIC_UPLOAD,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    failClosed: true,
  });

  const payload = {
    ok: report.verdict === "clean",
    verdict: report.verdict,
    reasons: report.reasons,
    durationMs: report.durationMs,
  };

  if (report.verdict !== "clean") {
    return res.status(422).json(payload);
  }

  return res.status(200).json(payload);
});

app.listen(3000, () => {
  console.log("Pompelmi demo listening on http://localhost:3000");
});
