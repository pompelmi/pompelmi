import React, { useCallback, useRef, useState } from 'react';

// Client‑only demo: no network calls. We scan in the browser and never upload files.
// Shows: choose button + dropzone, progress, log, and simple detections (magic bytes + EICAR).

type Verdict = 'malicious' | 'clean' | 'suspicious';

type ScanFinding = {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high';
};

type ScanResult = {
  fileName: string;
  size: number;
  mime: string;
  ext: string;
  verdict: Verdict;
  findings: ScanFinding[];
};

const EICAR_ASCII =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

const asBytes = (s: string) => new TextEncoder().encode(s);
const EICAR_BYTES = asBytes(EICAR_ASCII);

function findBytes(hay: Uint8Array, needle: Uint8Array): number {
  // naive search (fine for demo)
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function getExt(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function detectMime(buf: Uint8Array): string {
  const h = buf.subarray(0, 16);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const sig = Array.from(h).map(hex).join('');
  if (sig.startsWith('89504e470d0a1a0a')) return 'image/png';
  if (sig.startsWith('ffd8ff')) return 'image/jpeg';
  if (sig.startsWith('25504446')) return 'application/pdf';
  if (sig.startsWith('504b0304')) return 'application/zip';
  if (sig.startsWith('7b0a') || sig.startsWith('7b22')) return 'application/json';
  // basic text check
  const ascii = buf.slice(0, 1024);
  const printable = ascii.every((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126));
  return printable ? 'text/plain' : 'application/octet-stream';
}

function bytesToSize(n: number) {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${u[i]}`;
}

export default function DemoUpload() {
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (s: string) => setLog((L) => [s, ...L]);

  const scanFile = useCallback(async (file: File): Promise<ScanResult> => {
    // Read file
    const buf = new Uint8Array(await file.arrayBuffer());
    const mime = detectMime(buf);
    const ext = getExt(file.name);

    const findings: ScanFinding[] = [];
    let verdict: Verdict = 'clean';

    // EICAR detection (ASCII sequence)
    if (findBytes(buf, EICAR_BYTES) !== -1) {
      findings.push({
        id: 'EICAR',
        title: 'EICAR test string found',
        description:
          'This is a harmless test string used to verify anti‑virus pipelines. It is flagged to prove the demo is wired up.',
        severity: 'high',
      });
      verdict = 'malicious';
    }

    // Suspicious heuristics (demo only)
    if (mime === 'application/octet-stream' && file.size > 5 * 1024 * 1024) {
      findings.push({
        id: 'opaque-large',
        title: 'Large opaque binary',
        description: 'Large unknown binaries may warrant deeper inspection.',
        severity: 'medium',
      });
      verdict = verdict === 'malicious' ? 'malicious' : 'suspicious';
    }

    return {
      fileName: file.name,
      size: file.size,
      mime,
      ext,
      verdict,
      findings,
    };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setProgress(0);
      const next: ScanResult[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        push(`Scanning ${f.name} …`);
        const r = await scanFile(f);
        next.push(r);
        setProgress(Math.round(((i + 1) / files.length) * 100));
        push(`${f.name} → ${r.verdict.toUpperCase()}`);
      }
      setResults((old) => [...next, ...old]);
      setProgress(null);
    },
    [scanFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <section className="max-w-3xl mx-auto my-8 space-y-6">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Client‑side demo (no upload)</h2>
        <p className="text-sm text-gray-600">
          Files are scanned entirely in your browser. Nothing is sent to any server.
          To connect a real backend later, set <code>PUBLIC_ENGINE_URL</code> and switch back to the
          server upload component.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="border px-4 py-2 rounded hover:bg-gray-50"
        >
          Choose file(s) and scan
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.currentTarget.files)}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-2 border-2 border-dashed rounded p-6 text-center transition-colors ${
          dragOver ? 'border-black bg-gray-50' : 'border-gray-300'
        }`}
      >
        Drag & drop files here
      </div>

      {progress !== null && (
        <div>
          <div className="h-2 w-full bg-gray-200 rounded">
            <div
              className="h-2 bg-black rounded transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-xs mt-1">{progress.toFixed(0)}%</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Results</h3>
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={i} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm">{r.fileName}</div>
                    <div className="text-xs text-gray-600">
                      {bytesToSize(r.size)} · {r.mime}
                      {r.ext ? ` · .${r.ext}` : ''}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      r.verdict === 'malicious'
                        ? 'bg-red-100 text-red-700'
                        : r.verdict === 'suspicious'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {r.verdict.toUpperCase()}
                  </span>
                </div>
                {r.findings.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {r.findings.map((f) => (
                      <li key={f.id}>
                        <span className="font-medium">{f.title}</span>
                        {f.description ? ` — ${f.description}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">Log</h3>
        <ul className="text-sm space-y-1">
          {log.map((l, i) => (
            <li key={i} className="font-mono">
              {l}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}