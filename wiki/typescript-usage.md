# TypeScript Usage

pompelmi ships CommonJS source without bundled `.d.ts` files. This page shows how to add inline type declarations and build typed wrappers for use in TypeScript projects.

---

## Inline type declaration (one file)

Add a declaration block at the top of any `.ts` file that imports pompelmi:

```ts
declare module 'pompelmi' {
  export interface ScanOptions {
    host?: string;
    port?: number;
    timeout?: number;
  }

  export interface DirectoryScanResult {
    clean: string[];
    malicious: string[];
    errors: string[];
  }

  export interface VerdictSymbols {
    Clean: symbol;
    Malicious: symbol;
    ScanError: symbol;
  }

  export const Verdict: VerdictSymbols;

  export function scan(filePath: string, options?: ScanOptions): Promise<symbol>;
  export function scanBuffer(buffer: Buffer, options?: ScanOptions): Promise<symbol>;
  export function scanStream(stream: import('stream').Readable, options?: ScanOptions): Promise<symbol>;
  export function scanDirectory(dirPath: string, options?: ScanOptions): Promise<DirectoryScanResult>;
}
```

---

## Shared declaration file

For projects with multiple files importing pompelmi, put the declaration in a `.d.ts` file:

```ts
// types/pompelmi.d.ts
declare module 'pompelmi' {
  export interface ScanOptions {
    host?: string;
    port?: number;
    timeout?: number;
  }

  export interface DirectoryScanResult {
    clean: string[];
    malicious: string[];
    errors: string[];
  }

  export interface VerdictSymbols {
    readonly Clean: unique symbol;
    readonly Malicious: unique symbol;
    readonly ScanError: unique symbol;
  }

  export const Verdict: VerdictSymbols;
  export function scan(filePath: string, options?: ScanOptions): Promise<symbol>;
  export function scanBuffer(buffer: Buffer, options?: ScanOptions): Promise<symbol>;
  export function scanStream(stream: import('stream').Readable, options?: ScanOptions): Promise<symbol>;
  export function scanDirectory(dirPath: string, options?: ScanOptions): Promise<DirectoryScanResult>;
}
```

Include it in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "typeRoots": ["./types", "./node_modules/@types"]
  }
}
```

---

## Typed wrapper

Wrap pompelmi in a typed service class for easier use across a NestJS or typed Express app:

```ts
// scan.service.ts
import { scan, scanBuffer, scanStream, scanDirectory, Verdict, ScanOptions } from 'pompelmi';
import { Readable } from 'stream';

export type ScanVerdict = 'clean' | 'malicious' | 'error';

export interface FileScanResult {
  verdict: ScanVerdict;
  description: string;
}

export interface DirectoryResult {
  clean: string[];
  malicious: string[];
  errors: string[];
}

export class ScanService {
  constructor(private readonly opts: ScanOptions = {}) {}

  private mapVerdict(symbol: symbol): ScanVerdict {
    if (symbol === Verdict.Clean)     return 'clean';
    if (symbol === Verdict.Malicious) return 'malicious';
    return 'error';
  }

  async scanFile(filePath: string): Promise<FileScanResult> {
    const result = await scan(filePath, this.opts);
    return { verdict: this.mapVerdict(result), description: (result as symbol & { description: string }).description };
  }

  async scanBuffer(buffer: Buffer): Promise<FileScanResult> {
    const result = await scanBuffer(buffer, this.opts);
    return { verdict: this.mapVerdict(result), description: (result as symbol & { description: string }).description };
  }

  async scanStream(stream: Readable): Promise<FileScanResult> {
    const result = await scanStream(stream, this.opts);
    return { verdict: this.mapVerdict(result), description: (result as symbol & { description: string }).description };
  }

  async scanDirectory(dirPath: string): Promise<DirectoryResult> {
    return scanDirectory(dirPath, this.opts);
  }
}
```

---

## Express with typed request handlers

```ts
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import { scan, Verdict } from 'pompelmi';

const app    = express();
const upload = multer({ dest: './uploads' });

const SCAN_OPTS = {
  host: process.env.CLAMAV_HOST,
  port: Number(process.env.CLAMAV_PORT) || 3310,
};

app.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    try {
      const result = await scan(req.file.path, SCAN_OPTS);

      if (result !== Verdict.Clean) {
        fs.unlinkSync(req.file.path);
        res.status(422).json({ error: (result as { description: string }).description });
        return;
      }

      res.json({ ok: true, filename: req.file.filename });
    } catch (err: unknown) {
      try { fs.unlinkSync(req.file.path); } catch {}
      next(err);
    }
  }
);
```

---

## Strict null checks

With `"strict": true` in `tsconfig.json`, guard against `undefined` file fields:

```ts
async function handleUpload(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (file === undefined) {
    res.status(400).json({ error: 'No file.' });
    return;
  }

  const result = await scan(file.path, SCAN_OPTS);

  if (result === Verdict.Malicious) {
    fs.unlinkSync(file.path);
    res.status(422).json({ error: 'Malicious file rejected.' });
    return;
  }

  res.json({ ok: true });
}
```

---

## `tsconfig.json` settings

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "typeRoots": ["./types", "./node_modules/@types"]
  },
  "include": ["src/**/*", "types/**/*"]
}
```

---

## Using with `ts-node`

```bash
npm install -D ts-node typescript @types/node @types/multer
npx ts-node src/server.ts
```

No additional configuration is needed for pompelmi specifically.
