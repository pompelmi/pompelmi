function num(name: string, def: number) {
  const v = process.env[name];
  return v ? Number(v) : def;
}
function str(name: string, def: string) {
  return process.env[name] ?? def;
}
export const cfg = {
  port: num("PORT", 8787),
  host: str("HOST", "0.0.0.0"),
  corsOrigin: str("CORS_ORIGIN", "*"),
  // Limiti
  maxBytes: num("MAX_BYTES", 25 * 1024 * 1024),
  timeoutMs: num("TIMEOUT_MS", 10_000),
  // Allowlist MIME (lo sniffing magic-bytes arriva nello step successivo)
  allowedMimeCsv: str(
    "ALLOW_MIME",
    "image/png,image/jpeg,application/pdf,application/zip,text/plain,application/octet-stream"
  ),
  // Politica fail-closed
  failClosed: str("FAIL_CLOSED", "true") === "true"
};
export const allowedMime = new Set(
  cfg.allowedMimeCsv.split(",").map(s => s.trim()).filter(Boolean)
);
