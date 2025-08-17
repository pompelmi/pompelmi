import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import { cfg, allowedMime } from "./config";
import { type ScanResult, resultJsonSchema } from "./schema";
import { hashAndDetect } from "./scanner/builtin";
import { sniffMimeFromStream } from "./utils/sniff";

// Esportiamo lo schema JSON per lo script "schema:json"
export { resultJsonSchema } from "./schema";

async function main() {
  const app = Fastify({
    logger: true,
    disableRequestLogging: true,
    requestTimeout: cfg.timeoutMs,
    connectionTimeout: cfg.timeoutMs
  });

  await app.register(cors, { origin: cfg.corsOrigin });
  await app.register(multipart, {
    attachFieldsToBody: false,
    limits: { fileSize: cfg.maxBytes, files: 1 }
  });

  app.get("/healthz", async () => ({ ok: true, version: "0.8.8-dev.6" }));

  app.post("/scan", async (req, reply) => {
    const file = await req.file();
    if (!file || !file.file) {
      return reply.status(400).send({ error: "no_file" });
    }

    // Magic-bytes sniffing (server-side)
    const detected = await sniffMimeFromStream(file.file);
    if (!allowedMime.has(detected)) {
      const payload: ScanResult = {
        result: {
          verdict: cfg.failClosed ? "suspicious" : "clean",
          matches: [],
          sha256: "",
          bytes: 0,
          elapsedMs: 0
        },
        reason: "magic_mime_disallowed",
        error: null
      };
      return reply.status(415).send(payload);
    }

    const started = Date.now();
    try {
      const { sha256, bytes, matches } = await hashAndDetect(file.file);

      const verdict: ScanResult["result"]["verdict"] =
        matches.some((m) => m.severity === "high")
          ? "malicious"
          : matches.length
          ? "suspicious"
          : "clean";

      const res: ScanResult = {
        result: {
          verdict,
          matches,
          sha256,
          bytes,
          elapsedMs: Date.now() - started
        },
        reason: matches.length ? "builtin_match" : undefined,
        error: null
      };

      const status = verdict === "clean" ? 200 : 422;
      return reply.status(status).send(res);
    } catch (e: any) {
      req.log.error({ err: e }, "scan_error");
      const res: ScanResult = {
        result: {
          verdict: cfg.failClosed ? "suspicious" : "clean",
          matches: [],
          sha256: "",
          bytes: 0,
          elapsedMs: Date.now() - started
        },
        reason: "engine_error",
        error: e?.message ?? "scan_error"
      };
      return reply.status(500).send(res);
    }
  });

  await app.listen({ host: cfg.host, port: cfg.port });
  app.log.info(`pompelmi engine listening on ${cfg.host}:${cfg.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
