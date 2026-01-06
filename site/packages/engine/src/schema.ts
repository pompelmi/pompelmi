import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const verdictZ = z.enum(["clean", "suspicious", "malicious"]);
export type Verdict = z.infer<typeof verdictZ>;

export const matchZ = z.object({
  rule: z.string(),
  source: z.enum(["builtin", "yara", "clamav"]).default("builtin"),
  severity: z.enum(["low", "med", "high"]).default("low"),
  meta: z.record(z.any()).optional()
});
export type Match = z.infer<typeof matchZ>;

export const resultZ = z.object({
  result: z.object({
    verdict: verdictZ,
    matches: z.array(matchZ),
    sha256: z.string(),
    bytes: z.number().int().nonnegative(),
    elapsedMs: z.number()
  }),
  reason: z.string().optional(),
  error: z.string().nullable().default(null)
});
export type ScanResult = z.infer<typeof resultZ>;

export const resultJsonSchema = zodToJsonSchema(resultZ, "PompelmiScanResult");
