import crypto from "node:crypto";
import { Match } from "../schema";

/**
 * Hash SHA-256 in streaming + semplice rilevazione EICAR.
 * (Magic-bytes + ZIP traversal arriveranno nello step 2.)
 */
export async function hashAndDetect(stream: NodeJS.ReadableStream) {
  const hasher = crypto.createHash("sha256");
  let bytes = 0;

  const matches: Match[] = [];
  const eicarNeedle = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!";
  let tail = "";

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      hasher.update(chunk);

      const text = tail + chunk.toString("latin1");
      if (text.includes(eicarNeedle)) {
        if (!matches.some((m) => m.rule === "EICAR")) {
          matches.push({
            rule: "EICAR",
            source: "builtin",
            severity: "high",
            meta: { note: "EICAR string found" }
          });
        }
      }
      tail = text.slice(-100);
    });
    stream.once("end", resolve);
    stream.once("error", reject);
  });

  const sha256 = hasher.digest("hex");
  return { sha256, bytes, matches };
}
