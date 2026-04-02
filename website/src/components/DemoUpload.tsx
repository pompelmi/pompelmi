import React, { useCallback, useRef, useState } from 'react';

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
  browserMime: string;
  ext: string;
  verdict: Verdict;
  findings: ScanFinding[];
  notes: string[];
};

const EICAR_ASCII =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const EICAR_BYTES = new TextEncoder().encode(EICAR_ASCII);
const PDF_RISK_TOKENS = ['/JavaScript', '/OpenAction', '/AA', '/Launch'];
const SVG_RISK_TOKENS = ['<script', 'onload=', 'foreignobject'];
const MIME_BY_EXT: Record<string, string> = {
  exe: 'application/x-msdownload',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  zip: 'application/zip',
};

const textDecoder = new TextDecoder();

function findBytes(hay: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return i;
  }

  return -1;
}

function readTextPrefix(buf: Uint8Array, limit = 65536): string {
  return textDecoder.decode(buf.subarray(0, Math.min(buf.length, limit))).toLowerCase();
}

function getExt(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function detectMime(buf: Uint8Array): string {
  const h = buf.subarray(0, 16);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const sig = Array.from(h).map(hex).join('');

  if (sig.startsWith('89504e470d0a1a0a')) return 'image/png';
  if (sig.startsWith('ffd8ff')) return 'image/jpeg';
  if (sig.startsWith('25504446')) return 'application/pdf';
  if (sig.startsWith('504b0304')) return 'application/zip';
  if (sig.startsWith('4d5a')) return 'application/x-msdownload';

  const prefix = readTextPrefix(buf, 4096);

  if (prefix.includes('<svg')) return 'image/svg+xml';
  if (prefix.trimStart().startsWith('{') || prefix.trimStart().startsWith('[')) {
    return 'application/json';
  }

  const ascii = buf.slice(0, 1024);
  const printable = ascii.every((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126));
  return printable ? 'text/plain' : 'application/octet-stream';
}

function bytesToSize(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = n;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(1)} ${units[index]}`;
}

function verdictClasses(verdict: Verdict): string {
  if (verdict === 'malicious') {
    return 'border border-red-200 bg-red-50 text-red-700';
  }

  if (verdict === 'suspicious') {
    return 'border border-amber-200 bg-amber-50 text-amber-800';
  }

  return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
}

function findingClasses(severity: ScanFinding['severity']): string {
  if (severity === 'high') return 'bg-red-500';
  if (severity === 'medium') return 'bg-amber-500';
  return 'bg-sky-500';
}

function verdictFromFindings(findings: ScanFinding[]): Verdict {
  if (findings.some((finding) => finding.severity === 'high')) {
    return 'malicious';
  }

  if (findings.length > 0) {
    return 'suspicious';
  }

  return 'clean';
}

export default function DemoUpload() {
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (message: string) => setLog((existing) => [message, ...existing]);

  const scanFile = useCallback(async (file: File): Promise<ScanResult> => {
    const buf = new Uint8Array(await file.arrayBuffer());
    const mime = detectMime(buf);
    const ext = getExt(file.name);
    const browserMime = file.type || 'not reported';
    const findings: ScanFinding[] = [];
    const notes: string[] = [];
    const prefix = readTextPrefix(buf);
    const expectedMime = ext ? MIME_BY_EXT[ext] : undefined;

    if (findBytes(buf, EICAR_BYTES) !== -1) {
      findings.push({
        id: 'eicar-test-string',
        title: 'EICAR test string found',
        description:
          'This harmless test string is commonly used to verify that a malware-detection path is wired up end to end.',
        severity: 'high',
      });
    }

    if (expectedMime && expectedMime !== mime) {
      findings.push({
        id: 'extension-mismatch',
        title: 'Extension does not match detected type',
        description: `The filename suggests ${expectedMime}, but the first bytes look like ${mime}.`,
        severity: 'medium',
      });
    }

    if (
      file.type &&
      file.type !== mime &&
      file.type !== 'application/octet-stream' &&
      !(file.type === 'text/plain' && mime === 'application/json')
    ) {
      findings.push({
        id: 'browser-mime-mismatch',
        title: 'Browser MIME does not match detected type',
        description: `The browser reported ${file.type}, but the preview detected ${mime}.`,
        severity: 'low',
      });
    }

    if (mime === 'application/pdf') {
      const tokens = PDF_RISK_TOKENS.filter((token) => prefix.includes(token.toLowerCase()));
      if (tokens.length > 0) {
        findings.push({
          id: 'pdf-risky-actions',
          title: 'Risky PDF actions detected',
          description: `Found PDF markers such as ${tokens.join(', ')}.`,
          severity: 'medium',
        });
      }
    }

    if (mime === 'image/svg+xml') {
      const tokens = SVG_RISK_TOKENS.filter((token) => prefix.includes(token));
      if (tokens.length > 0) {
        findings.push({
          id: 'svg-active-content',
          title: 'Active SVG content detected',
          description: `Found SVG markers such as ${tokens.join(', ')}.`,
          severity: 'medium',
        });
      }
    }

    if (mime === 'application/x-msdownload') {
      findings.push({
        id: 'pe-header',
        title: 'Executable header detected',
        description: 'The file starts with an MZ header and should not be treated like a normal document upload.',
        severity: 'medium',
      });
    }

    if (mime === 'application/octet-stream' && file.size > 5 * 1024 * 1024) {
      findings.push({
        id: 'opaque-binary',
        title: 'Large opaque binary',
        description: 'Unknown binaries usually need a stricter backend policy than a normal form upload.',
        severity: 'medium',
      });
    }

    if (mime === 'application/zip') {
      notes.push(
        'Archive bytes detected. This browser preview does not unpack ZIPs. Real backend integration adds traversal, expansion, entry-count, and nesting checks.',
      );
    }

    if (findings.length === 0) {
      notes.push(
        'No preview-visible findings. Server-side policy, archive controls, and optional YARA still belong on the real upload path.',
      );
    }

    return {
      fileName: file.name,
      size: file.size,
      mime,
      browserMime,
      ext,
      verdict: verdictFromFindings(findings),
      findings,
      notes,
    };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setProgress(0);
      const next: ScanResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        push(`previewing ${file.name}`);
        const result = await scanFile(file);
        next.push(result);
        setProgress(Math.round(((i + 1) / files.length) * 100));
        push(`${file.name} -> ${result.verdict}`);
      }

      setResults((existing) => [...next, ...existing]);
      setProgress(null);
    },
    [scanFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      void handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <p className="font-semibold text-slate-900">Client-side preview only</p>
        <p className="mt-2">
          This widget reads selected files locally. It never uploads them, and it does not claim to run the full backend policy path.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => inputRef.current?.click()}
          className="action-primary w-full sm:w-auto"
          type="button"
        >
          Choose file(s)
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
        />
        <p className="text-sm leading-6 text-slate-600">
          Files stay in your browser for this preview.
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-[1.75rem] border border-dashed p-8 text-center transition ${
          dragOver
            ? 'border-sky-400 bg-sky-50'
            : 'border-slate-300 bg-white/80 hover:border-slate-400'
        }`}
      >
        <p className="text-base font-semibold tracking-tight text-slate-950">
          Drag files here to preview a verdict
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Useful tests: a normal PDF or PNG, a renamed file, or a text file containing the EICAR test string.
        </p>
      </div>

      {progress !== null && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900">Reading selected files</span>
            <span className="font-semibold text-slate-700">{progress.toFixed(0)}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {results.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-5">
          <p className="text-sm font-semibold text-slate-900">What makes this preview useful</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            <li>Try a file whose extension does not match its actual bytes.</li>
            <li>Try a ZIP to see where the browser preview stops and the server path begins.</li>
            <li>Try an EICAR test file to confirm how a high-confidence verdict is presented.</li>
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Preview results</h3>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {results.length} file{results.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="space-y-3">
            {results.map((result, index) => (
              <li
                key={`${result.fileName}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="break-all font-mono text-sm font-semibold text-slate-900">
                      {result.fileName}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-slate-900">Detected type:</span> {result.mime}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">Browser MIME:</span> {result.browserMime}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">Extension:</span>{' '}
                        {result.ext ? `.${result.ext}` : 'none'}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">Size:</span> {bytesToSize(result.size)}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${verdictClasses(result.verdict)}`}
                  >
                    {result.verdict}
                  </span>
                </div>

                {result.findings.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-900">Signals</p>
                    <ul className="mt-3 space-y-2">
                      {result.findings.map((finding) => (
                        <li
                          key={finding.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${findingClasses(finding.severity)}`}
                            />
                            <div>
                              <div className="font-semibold text-slate-900">{finding.title}</div>
                              {finding.description && <p className="mt-1">{finding.description}</p>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.notes.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {result.notes.map((note, noteIndex) => (
                      <p key={`${result.fileName}-note-${noteIndex}`}>{note}</p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {log.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white/85 p-4 text-sm leading-6 text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-900">Preview log</summary>
          <ul className="mt-3 space-y-2">
            {log.map((entry, index) => (
              <li
                key={`${entry}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600"
              >
                {entry}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
