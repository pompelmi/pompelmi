"use client";

import { useState } from "react";

export default function Page() {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setResult({ status: res.status, json });
    setBusy(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Next.js App Router • file upload demo
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        This sends files to <code>/api/upload</code> which enforces a simple policy (extension/MIME/size) and runs a demo scanner.
      </p>
      <form onSubmit={onSubmit} encType="multipart/form-data" style={{ display: "grid", gap: 12 }}>
        <input name="files" type="file" multiple />
        <button disabled={busy} type="submit" style={{ padding: "8px 14px" }}>
          {busy ? "Uploading..." : "Upload"}
        </button>
      </form>

      {result && (
        <pre style={{ marginTop: 16, background: "#0b1020", color: "white", padding: 12, borderRadius: 8, overflow: "auto" }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
