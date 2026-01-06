import { NextResponse } from "next/server";
import * as path from "node:path";
import * as heur from "@pompelmi/engine-heuristics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Severity = "clean" | "suspicious" | "malicious";
type ScanResult = { severity: Severity; ruleId?: string; reason?: string; tags?: string[] };
type FileMeta = { fieldname: string; originalname: string; mimetype: string; size: number };

const policy = {
  includeExtensions: ["png","jpg","jpeg","gif","pdf","zip","txt"],
  allowedMimeTypes: ["image/png","image/jpeg","image/gif","application/pdf","application/zip","text/plain"],
  maxFileSizeBytes: 5 * 1024 * 1024,
  stopOn: "suspicious" as Severity,
  failClosed: true
};

function extLower(name: string) {
  const e = path.extname(name || "").replace(/^\./, "");
  return e.toLowerCase();
}

function wrapCallable(x: any) {
  if (typeof x === "function") return x;
  if (x && typeof x.scan === "function") {
    return (bytes: Uint8Array, meta: FileMeta) => x.scan(bytes, meta);
  }
  return null;
}

function resolveScanner(mod: any) {
  // 1) direct default/named exports
  const direct =
    wrapCallable(mod.default) ||
    wrapCallable(mod.CommonHeuristicsScanner) ||
    wrapCallable(mod.HeuristicsScanner) ||
    wrapCallable(mod.scanner) ||
    wrapCallable(mod.scan);
  if (direct) return direct;

  // 2) build via factory (createHeuristicsScanner)
  if (typeof mod.createHeuristicsScanner === "function") {
    const built = mod.createHeuristicsScanner();
    const fn = wrapCallable(built);
    if (fn) return fn;
  }

  // 3) compose via composeScanners + factory, if provided
  if (typeof mod.composeScanners === "function" && typeof mod.createHeuristicsScanner === "function") {
    const built = mod.createHeuristicsScanner();
    const h = wrapCallable(built);
    if (h) {
      const composed = mod.composeScanners([["heuristics", h]], { parallel: false, stopOn: "suspicious" });
      const fn = wrapCallable(composed);
      if (fn) return fn;
    }
  }

  throw new Error(`@pompelmi/engine-heuristics: no callable scanner export found (exports: ${Object.keys(mod||{}).join(", ")})`);
}

const scanner = resolveScanner(heur);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files: File[] = [];
    for (const [, value] of form.entries()) if (value instanceof File) files.push(value);

    if (!files.length) {
      return NextResponse.json({ error: "no_files", message: "No files in multipart request" }, { status: 400 });
    }

    // Pre-filters (extension/MIME/size)
    for (const f of files) {
      const originalname = (f as any).name ?? "file";
      if (typeof f.size === "number" && f.size > policy.maxFileSizeBytes) {
        return NextResponse.json({ error: "file_too_large", message: `File "${originalname}" exceeds max allowed size` }, { status: 422 });
      }
      if (policy.includeExtensions.length) {
        const e = extLower(originalname);
        if (!policy.includeExtensions.includes(e)) {
          return NextResponse.json({ error: "extension_not_allowed", message: `File "${originalname}" has disallowed extension ".${e}"` }, { status: 422 });
        }
      }
      const mime = (f.type || "").toLowerCase();
      if (policy.allowedMimeTypes.length && !policy.allowedMimeTypes.includes(mime)) {
        return NextResponse.json({ error: "mime_not_allowed", message: `File "${originalname}" has disallowed MIME "${mime}"` }, { status: 422 });
      }
    }

    // Scan each file
    const results: ScanResult[] = [];
    let overall: Severity = "clean";

    for (const f of files) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const meta: FileMeta = {
        fieldname: "files",
        originalname: (f as any).name ?? "file",
        mimetype: (f.type || "").toLowerCase(),
        size: bytes.length
      };

      const r: any = await Promise.resolve(scanner(bytes, meta));
      const severity: Severity =
        (r?.severity as Severity) ??
        (r?.malicious ? "malicious" : r?.suspicious ? "suspicious" : "clean");

      results.push({ severity, ruleId: r?.ruleId, reason: r?.reason, tags: r?.tags });

      if (severity === "malicious") overall = "malicious";
      else if (severity === "suspicious" && overall === "clean") overall = "suspicious";
    }

    const shouldBlock =
      (policy.stopOn === "suspicious" && (overall === "suspicious" || overall === "malicious")) ||
      (policy.stopOn === "malicious" && overall === "malicious");

    if (shouldBlock) {
      return NextResponse.json({ error: "blocked_by_policy", message: `Upload blocked (${overall}).`, results }, { status: 422 });
    }

    return NextResponse.json({ ok: true, verdict: overall, results }, { status: 200 });
  } catch (err: any) {
    if (policy.failClosed) {
      return NextResponse.json({ error: "scan_error", message: err?.message || "Upload rejected by scanner" }, { status: 422 });
    }
    throw err;
  }
}
