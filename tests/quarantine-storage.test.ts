import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FilesystemQuarantineStorage } from "../src/quarantine/storage";
import type { QuarantineEntry } from "../src/quarantine/types";

function makeEntry(
  id: string,
  status: QuarantineEntry["status"],
  quarantinedAt: string,
): QuarantineEntry {
  return {
    id,
    storageKey: `${id}.bin`,
    file: {
      originalName: `${id}.pdf`,
      sizeBytes: 4,
      sha256: "a".repeat(64),
    },
    scanReport: {
      verdict: status === "deleted" ? "malicious" : "suspicious",
      matches: [],
      ok: false,
      durationMs: 1,
    },
    quarantinedAt,
    status,
    updatedAt: quarantinedAt,
  };
}

describe("FilesystemQuarantineStorage", () => {
  let tmpDir: string;
  let storage: FilesystemQuarantineStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pompelmi-storage-test-"));
    storage = new FilesystemQuarantineStorage({ dir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when an entry does not exist", async () => {
    await expect(storage.getEntry("missing-entry")).resolves.toBeNull();
  });

  it("skips unreadable metadata files and applies filters before counting", async () => {
    await storage.saveEntry(makeEntry("entry-a", "pending", "2024-01-01T00:00:00.000Z"));
    await storage.saveEntry(makeEntry("entry-b", "reviewing", "2024-01-02T00:00:00.000Z"));
    await storage.saveEntry(makeEntry("entry-c", "deleted", "2024-01-03T00:00:00.000Z"));

    fs.writeFileSync(path.join(tmpDir, "meta", "broken.json"), "{not valid json", "utf8");

    const filtered = await storage.listEntries({
      status: ["pending", "reviewing"],
      after: "2024-01-01T12:00:00.000Z",
      before: "2024-01-02T12:00:00.000Z",
      limit: 1,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("entry-b");

    await expect(storage.countEntries({ status: "deleted" })).resolves.toBe(1);
  });
});
