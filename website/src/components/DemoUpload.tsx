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
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 hover:from-blue-700 hover:to-purple-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          Choose file(s) and scan
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.currentTarget.files)}
        />
        <p className="text-sm text-gray-500 italic">Files are scanned entirely in your browser. Nothing is uploaded.</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative border-3 border-dashed rounded-2xl p-12 text-center transition-all ${
          dragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            dragOver ? 'bg-blue-500 scale-110' : 'bg-gray-200'
          }`}>
            <svg className={`w-10 h-10 ${dragOver ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-700">Drag & drop files here</p>
            <p className="text-sm text-gray-500 mt-1">or click the button above to select</p>
          </div>
        </div>
      </div>

      {progress !== null && (
        <div className="glass rounded-xl p-5 border-2 border-blue-200">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-gray-700">Scanning files...</span>
            <span className="text-sm font-bold text-blue-600">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold">Scan Results</h3>
          </div>
          <ul className="space-y-3">
            {results.map((r, i) => (
              <li key={i} className="glass rounded-2xl p-5 border-2 border-transparent hover:border-blue-300 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-mono text-base font-semibold text-gray-800 break-all">{r.fileName}</div>
                    <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        {bytesToSize(r.size)}
                      </span>
                      <span>•</span>
                      <span>{r.mime}</span>
                      {r.ext && (
                        <>
                          <span>•</span>
                          <span className="font-mono">.{r.ext}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-full whitespace-nowrap ${
                      r.verdict === 'malicious'
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : r.verdict === 'suspicious'
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                        : 'bg-green-100 text-green-700 border-2 border-green-300'
                    }`}
                  >
                    {r.verdict === 'malicious' && '✗'}
                    {r.verdict === 'clean' && '✓'}
                    {r.verdict === 'suspicious' && '⚠'}
                    {r.verdict.toUpperCase()}
                  </span>
                </div>
                {r.findings.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {r.findings.map((f) => (
                      <li key={f.id} className="flex items-start gap-3 bg-white/50 rounded-lg p-3 border border-gray-200">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          f.severity === 'high' ? 'bg-red-500' : f.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></div>
                        <div className="text-sm">
                          <span className="font-semibold text-gray-800">{f.title}</span>
                          {f.description && <span className="text-gray-600"> — {f.description}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {log.length > 0 && (
        <details className="glass rounded-2xl p-5 border-2 border-gray-200">
          <summary className="font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Scan Log ({log.length} entries)
          </summary>
          <ul className="mt-4 space-y-1 max-h-64 overflow-y-auto">
            {log.map((l, i) => (
              <li key={i} className="font-mono text-sm text-gray-600 bg-gray-50 rounded px-3 py-1">
                {l}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}