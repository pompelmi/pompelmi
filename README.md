<p align="center">
  <a href="https://github.com/pompelmi/pompelmi" target="_blank" rel="noopener noreferrer">
    <img
      src="https://raw.githubusercontent.com/pompelmi/pompelmi/refs/heads/main/assets/logo.svg"
      alt="pompelmi"
      width="120"
      height="120"
    />
  </a>
</p>


<h1 align="center">pompelmi</h1>

<p align="center">
  Light-weight file scanner with optional <strong>YARA</strong> integration.<br/>
  Works out-of-the-box in <strong>Node.js</strong>; supports <strong>browser</strong> via an HTTP remote engine.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi">
    <img alt="npm" src="https://img.shields.io/npm/v/pompelmi?label=pompelmi">
  </a>
  <a href="https://www.npmjs.com/package/pompelmi">
    <img alt="downloads" src="https://img.shields.io/npm/dw/pompelmi">
  </a>
  <a href="https://github.com/pompelmi/pompelmi/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/npm/l/pompelmi">
  </a>
  <img alt="node" src="https://img.shields.io/node/v/pompelmi">
  <img alt="types" src="https://img.shields.io/badge/types-TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="status" src="https://img.shields.io/badge/channel-alpha-orange">
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#features">Features</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#api">API</a> •
  <a href="#browser-remote-yara">Browser (Remote YARA)</a> •
  <a href="#examples">Examples</a> •
  <a href="#faq">FAQ</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Install

```bash
# library
npm i pompelmi

# (dev) scripts / server example might use these
npm i -D tsx express multer cors
```

> The Node YARA engine uses native binaries via platform packages (pulled automatically by dependencies). **No brew / apt** required for consumers.

---


## Features

- **Node.js first**: recursive directory scanning with **YARA** (no brew/apt required).
- **Flexible YARA rules**: from `.yar` file or inline string.
- **Smart scanning path**:
  - `scanFileAsync` → `scanFile` → `scan(buffer)` (with optional **sampling** of the first N bytes).
- **Policies & filters**:
  - include extensions, max file size, buffer-only mode, async preference, sampling bytes.
- **Structured results** per file:
  - `matches`, `status`, `reason`, `mode`, derived **`verdict`**: `malicious | suspicious | clean`.
- **Browser support** via **Remote Engine** (HTTP endpoint):
  - `multipart` or `json-base64` (with `rulesB64` to avoid JSON escaping headaches).
- **TypeScript** types included. ESM & CJS builds, tree-shake friendly.

---



## Quickstart

### Node.js (scan a folder with YARA)

```ts
import { scanDir } from 'pompelmi';
import { resolve } from 'node:path';

const opts = {
  enableYara: true,
  yaraRulesPath: resolve(process.cwd(), 'rules/demo.yar'),
  // optional policies
  includeExtensions: ['.txt', '.bin'],
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MiB
  yaraAsync: true,
};

for await (const entry of scanDir('./some-folder', opts)) {
  // entry: { path, absPath, isDir, yara? }
  console.log(entry.path, entry.yara);
}
```

### Browser (HTTP remote engine, no WASM)

```ts
import { createRemoteEngine } from 'pompelmi';

const RULES = `
rule demo_contains_virus_literal {
  strings: $a = "virus" ascii nocase
  condition: $a
}
`;

async function scanFileInBrowser(file: File) {
  const engine = await createRemoteEngine({
    endpoint: 'http://localhost:8787/api/yara/scan',
    // choose one:
    // mode: 'multipart',
    mode: 'json-base64',
    rulesAsBase64: true, // sends rulesB64 in JSON
  });

  const compiled = await engine.compile(RULES);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const matches = await compiled.scan(bytes);

  console.log('REMOTE MATCHES:', matches);
}
```

---

## API

### Node

#### `async function* scanDir(root: string, opts?: NodeScanOptions): AsyncGenerator<NodeFileEntry>`

Recursively scans `root` and yields entries with optional YARA results.

**`NodeScanOptions`**
```ts
type NodeScanOptions = {
  enableYara?: boolean;    // default: false
  yaraRules?: string;      // inline rules
  yaraRulesPath?: string;  // path to .yar file

  includeExtensions?: string[]; // ['.txt', '.bin']
  maxFileSizeBytes?: number;    // skip if size > threshold

  yaraAsync?: boolean;        // prefer scanFileAsync if available
  yaraPreferBuffer?: boolean; // force buffer mode (enables sampling)
  yaraSampleBytes?: number;   // if buffer mode: scan first N bytes only
};
```

**`NodeFileEntry`**
```ts
type NodeFileEntry = {
  path: string;     // relative to root
  absPath: string;  // absolute
  isDir: boolean;
  yara?: NodeYaraResult;
};
```

**`NodeYaraResult`**
```ts
type NodeYaraVerdict = 'malicious' | 'suspicious' | 'clean';

type NodeYaraResult = {
  matches: YaraMatch[];
  status: 'scanned' | 'skipped' | 'error';
  reason?: 'max-size' | 'filtered-ext' | 'not-enabled' | 'engine-missing' | 'error';
  mode?: 'async' | 'file' | 'buffer' | 'buffer-sampled';
  verdict?: NodeYaraVerdict; // when status === 'scanned'
};

type YaraMatch = {
  rule: string;
  tags?: string[];
};
```

**Scanning path**
- If `yaraAsync` is true and engine exposes `scanFileAsync` → use it.
- Else if engine exposes `scanFile` → use it.
- Else → fallback to buffer mode (`scan(bytes)`).
  - If `yaraSampleBytes` is set, only the first N bytes are read (sampling).

---

### Browser (Remote YARA)

#### `createRemoteEngine(options: RemoteEngineOptions)`

Creates an engine that **delegates** scanning to your HTTP endpoint.

```ts
type RemoteEngineOptions = {
  endpoint: string;                  // e.g. '/api/yara/scan'
  headers?: Record<string, string>;  // Authorization, etc.
  rulesField?: string;               // default 'rules' (multipart/json)
  fileField?: string;                // default 'file'  (multipart/json)
  mode?: 'multipart' | 'json-base64';// default 'multipart'
  rulesAsBase64?: boolean;           // if mode='json-base64', sends 'rulesB64'
};
```

**Protocol**
- `multipart`: send `rules` (text or file) + `file` (binary).
- `json-base64`: send `{ rules: string, file: base64 }` or `{ rulesB64: base64, file: base64 }`.

**Returned engine**
- `await engine.compile(rulesSource)` → `compiled`
- `await compiled.scan(bytes)` → `YaraMatch[]`

---

## Browser (Remote YARA)

### Example Express endpoint

```ts
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { createYaraScannerFromRules } from 'pompelmi'; // or from './src/yara/index' in dev

const app = express();
const upload = multer();

app.use(cors({ origin: true, methods: ['POST','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '20mb' }));
app.options('/api/yara/scan', cors());

app.post('/api/yara/scan',
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'rules', maxCount: 1 }]),
  async (req, res) => {
    try {
      let rules = '';
      let bytes: Uint8Array;

      if (req.is('multipart/form-data')) {
        const files = req.files as Record<string, Array<{ buffer: Buffer }>> | undefined;
        if (files?.rules?.[0]) rules = files.rules[0].buffer.toString('utf8');
        else rules = (req.body?.rules ?? '').toString();

        const f = files?.file?.[0];
        if (!f) return res.status(400).json({ error: 'file missing' });
        bytes = new Uint8Array(f.buffer);
      } else {
        const rulesB64 = (req.body as any)?.rulesB64;
        if (typeof rulesB64 === 'string') rules = Buffer.from(rulesB64, 'base64').toString('utf8');
        else rules = (req.body?.rules ?? '').toString();

        const b64 = (req.body as any)?.file;
        if (typeof b64 !== 'string') return res.status(400).json({ error: 'file (base64) missing' });
        bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
      }

      if (!rules.trim()) return res.status(400).json({ error: 'rules empty' });

      const compiled = await createYaraScannerFromRules(rules);
      const matches = await compiled.scan(bytes);
      res.json(matches);
    } catch (err: any) {
      console.error('[remote-yara] error', err);
      res.status(500).json({ error: 'internal_error', detail: String(err?.message ?? err) });
    }
  }
);

app.listen(8787, () => {
  console.log('[remote-yara] listening on http://localhost:8787');
});
```

---

## Examples

- **Node integration smoke**  
  `npm run yara:int:smoke` – creates a temporary directory with sample files and runs several scenarios (rules from path/string, includeExtensions, maxFileSizeBytes, sampling miss/hit, async/file/buffer paths) with **assertions**.

- **Remote server (dev)**  
  `npm run dev:remote` – starts the Express endpoint shown above.

- **cURL examples**
```bash
# multipart, rules as text
curl -sS -F file=@tmp-yara-int/sample.txt \
  --form-string "rules=$(cat rules/demo.yar)" \
  http://localhost:8787/api/yara/scan

# multipart, rules as file
curl -sS -F rules=@rules/demo.yar -F file=@tmp-yara-int/sample.txt \
  http://localhost:8787/api/yara/scan

# JSON base64
FILE_B64=$(base64 -i tmp-yara-int/sample.txt | tr -d '\n')
RULES_B64=$(base64 -i rules/demo.yar | tr -d '\n')
curl -sS -H "Content-Type: application/json" \
  --data "{\"rulesB64\": \"${RULES_B64}\", \"file\": \"${FILE_B64}\"}" \
  http://localhost:8787/api/yara/scan
```

---

## FAQ

**Does this detect all malware?**  
No. It matches **YARA rules** you provide. That means detection quality depends on your rule set. No cloud reputation, sandboxing, or emulation is included.

**Browser scanning without WASM?**  
Yes, via the **Remote Engine**: the browser posts bytes + rules to your server, your server runs YARA, and returns matches.

**Can I scan only a sample of each file?**  
Yes. In Node buffer mode, set `yaraSampleBytes`. Or force buffer mode with `yaraPreferBuffer: true`.

**What about large directories?**  
You can filter by extension and cap the file size (`maxFileSizeBytes`). Concurrency controls may be added in a future release.

---

## Security & Disclaimer

- This library **reads** files; it does not execute them.  
- YARA detections depend entirely on the rules you supply. Expect **false positives** and **false negatives**.  
- Always run scanning in a controlled environment with appropriate security controls.

---

## Contributing

PRs and issues are welcome!  
Before submitting, please:

- Run the build and tests:
  ```bash
  npm run build
  npm run yara:int:smoke
  ```
- Keep commits focused and well described.
- For new features, consider adding/adjusting integration tests.

---

## Versioning

Current channel: **`0.2.0-alpha.x`**  
This is a pre-release channel. Expect minor API changes before a stable `0.2.0`.

Publish suggestion:
```bash
npm version 0.2.0-alpha.0
npm publish --tag next
```

---

## License

[MIT](./LICENSE) © 2025-present pompelmi contributors