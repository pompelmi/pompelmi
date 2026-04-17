// typescript-usage.ts
// TypeScript example using pompelmi with manually declared types.
// NOTE: pompelmi does not currently ship a .d.ts file — the module and Verdict
//       types are declared inline. Once official types land, remove the
//       `declare module` block.
// NOTE: requires  npm install --save-dev @types/node typescript
// Compile: npx tsc --target ES2020 --module commonjs --lib es2020 --esModuleInterop true examples/typescript-usage.ts
// Run:     node examples/typescript-usage.js

// ---- inline type declarations (remove when pompelmi ships its own .d.ts) ----
declare module 'pompelmi' {
  export const Verdict: {
    readonly Clean:     unique symbol;
    readonly Malicious: unique symbol;
    readonly ScanError: unique symbol;
  };
  export type VerdictSymbol = (typeof Verdict)[keyof typeof Verdict] & { readonly description: string };
  export function scan(
    filePath: string,
    options?: { host?: string; port?: number; timeout?: number }
  ): Promise<VerdictSymbol>;
}
// ---- end inline declarations -----------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path') as typeof import('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs   = require('fs')   as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { scan, Verdict } = require('pompelmi') as typeof import('pompelmi');

interface ScanResult {
  file:    string;
  verdict: string;
  clean:   boolean;
}

async function scanFile(filePath: string): Promise<ScanResult> {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const result = await scan(resolved);
  return {
    file:    resolved,
    verdict: result.description,
    clean:   result === (Verdict.Clean as symbol),
  };
}

(async (): Promise<void> => {
  const files: string[] = [
    './uploads/document.pdf',
    './uploads/archive.zip',
  ];

  const results: ScanResult[] = await Promise.all(files.map(scanFile));

  for (const r of results) {
    process.stdout.write(`${r.verdict.padEnd(10)} ${r.file}\n`);
  }

  const allClean = results.every((r) => r.clean);
  process.exit(allClean ? 0 : 1);
})();
