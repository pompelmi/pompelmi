import React, { useState } from 'react';
import { UploadButton, UploadDropzone } from '@pompelmi/ui-react';

// In produzione su GitHub Pages la demo parlerà direttamente all'engine /scan con CORS abilitato.
// Imposta PUBLIC_ENGINE_URL in build/deploy. Se vuota, mostrerà errore "endpoint mancante".
const ENGINE_URL = (import.meta.env.PUBLIC_ENGINE_URL || '').replace(/\/$/, '');

export default function DemoUpload() {
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const push = (s: string) => setLog((L) => [s, ...L]);

  const action = ENGINE_URL ? `${ENGINE_URL}/scan` : '/__engine_missing__';

  return (
    <section className="max-w-3xl mx-auto my-8 space-y-6">
      <div className="flex items-center gap-4">
        <UploadButton
          action={action}
          maxSize={50 * 1024 * 1024}
          onResult={(r: any) => push(`Button → ${r?.result?.malicious ? 'MALICIOUS' : 'CLEAN'}`)}
          onError={(e: Error) => push(`Button ERROR → ${e.message}`)}
          onProgress={(p) => setProgress(p)}
          label="Choose a file and scan"
        />
      </div>

      <UploadDropzone
        action={action}
        maxSize={50 * 1024 * 1024}
        onResult={(r: any) => push(`Dropzone → ${r?.result?.malicious ? 'MALICIOUS' : 'CLEAN'}`)}
        onError={(e: Error) => push(`Dropzone ERROR → ${e.message}`)}
        onProgress={(p) => setProgress(p)}
        className="mt-2"
      />

      {progress !== null && (
        <div>
          <div className="h-2 w-full bg-gray-200 rounded">
            <div className="h-2 bg-black rounded transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <p className="text-xs mt-1">{progress.toFixed(0)}%</p>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">Log</h3>
        <ul className="text-sm space-y-1">
          {log.map((l, i) => <li key={i} className="font-mono">{l}</li>)}
        </ul>
      </div>
    </section>
  );
}