"use client";

import { UploadButton, UploadDropzone } from "@pompelmi/ui-react";
import React, { useRef, useState } from "react";

export default function Home() {
  const [log, setLog] = useState<Array<{ id: string; message: string }>>([]);
  const nextLogId = useRef(0);

  const appendLog = (message: string) =>
    setLog((entries) => [{ id: `log-${nextLogId.current++}`, message }, ...entries]);
  const onOk = (r: any, tag = "") =>
    appendLog(`${tag} ${r.result?.malicious ? "MALICIOUS" : "CLEAN"}`);
  const onErr = (e: Error, tag = "") => appendLog(`${tag} ERROR: ${e.message}`);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">pompelmi – Demo</h1>

      <UploadButton
        action="/api/scan"
        accept="*/*"
        maxSize={50 * 1024 * 1024}
        onResult={(r) => onOk(r, "Button →")}
        onError={(e) => onErr(e, "Button →")}
        onProgress={(p) => console.log(`Button progress: ${p.toFixed(0)}%`)}
        label="Choose a file and scan"
      />

      <UploadDropzone
        action="/api/scan"
        accept="*/*"
        maxSize={50 * 1024 * 1024}
        onResult={(r) => onOk(r, "Dropzone →")}
        onError={(e) => onErr(e, "Dropzone →")}
        onProgress={(p) => console.log(`Dropzone progress: ${p.toFixed(0)}%`)}
        className="h-40"
      />

      <div>
        <h2 className="font-semibold mb-2">Log</h2>
        <ul className="text-sm space-y-1">
          {log.map((entry) => (
            <li key={entry.id} className="font-mono">
              {entry.message}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
