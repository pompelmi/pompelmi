'use client';

import React, { useState } from 'react';
import { UploadButton, UploadDropzone } from '@pompelmi/ui-react';

export default function Home() {
  const [log, setLog] = useState<string[]>([]);

  const onOk = (r: any, tag = '') =>
    setLog((L) => [`${tag} ${r.result?.malicious ? 'MALICIOUS' : 'CLEAN'}`, ...L]);
  const onErr = (e: Error, tag = '') =>
    setLog((L) => [`${tag} ERROR: ${e.message}`, ...L]);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">pompelmi – Demo</h1>

      <UploadButton
        action="/api/scan"
        accept="*/*"
        maxSize={50 * 1024 * 1024}
        onResult={(r) => onOk(r, 'Button →')}
        onError={(e) => onErr(e, 'Button →')}
        onProgress={(p) => console.log(`Button progress: ${p.toFixed(0)}%`)}
        label="Choose a file and scan"
      />

      <UploadDropzone
        action="/api/scan"
        accept="*/*"
        maxSize={50 * 1024 * 1024}
        onResult={(r) => onOk(r, 'Dropzone →')}
        onError={(e) => onErr(e, 'Dropzone →')}
        onProgress={(p) => console.log(`Dropzone progress: ${p.toFixed(0)}%`)}
        className="h-40"
      />

      <div>
        <h2 className="font-semibold mb-2">Log</h2>
        <ul className="text-sm space-y-1">
          {log.map((l, i) => (
            <li key={i} className="font-mono">{l}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}