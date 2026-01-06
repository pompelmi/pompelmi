# YARA — Getting Started (alpha)

YARA lets you detect suspicious or malicious content using pattern‑matching rules.
**pompelmi** treats YARA matches as signals that you can map to your own verdicts
(e.g., mark high‑confidence rules as `malicious`, heuristics as `suspicious`).

> **Status:** Optional. You can run pomp elmi without YARA. If you adopt it, keep your rules small, time‑bound, and tuned to your threat model.

---

## 1) Install (optional)

Install a YARA binding for Node to compile and run rules locally:

```bash
npm i -D @automattic/yara
# or
pnpm add -D @automattic/yara
# or
yarn add -D @automattic/yara
```

> If you prefer running YARA out‑of‑process (CLI), you can shell out to a sandboxed worker process and feed back matches into your **pompelmi** policy.

---

## 2) Starter rules

Below are three example rules you can start from.  
Create a folder like `rules/starter/` in your project and add these files.

**`rules/starter/eicar.yar`**
```yar
rule EICAR_Test_File
{
    meta:
        description = "EICAR antivirus test string (safe)"
        reference   = "https://www.eicar.org"
        confidence  = "high"
        verdict     = "malicious"
    strings:
        $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    condition:
        $eicar
}
```

**`rules/starter/pdf_js.yar`**
```yar
rule PDF_JavaScript_Embedded
{
    meta:
        description = "PDF contains embedded JavaScript (heuristic)"
        confidence  = "medium"
        verdict     = "suspicious"
    strings:
        $magic = { 25 50 44 46 } // "%PDF"
        $js1 = "/JavaScript" ascii
        $js2 = "/JS" ascii
        $open = "/OpenAction" ascii
        $aa = "/AA" ascii
    condition:
        uint32(0) == 0x25504446 and ( $js1 or $js2 ) and ( $open or $aa )
}
```

**`rules/starter/office_macros.yar`**
```yar
rule Office_Macro_Suspicious_Words
{
    meta:
        description = "Heuristic: suspicious VBA macro keywords"
        confidence  = "medium"
        verdict     = "suspicious"
    strings:
        $s1 = /Auto(Open|Close)/ nocase
        $s2 = "Document_Open" nocase ascii
        $s3 = "CreateObject(" nocase ascii
        $s4 = "WScript.Shell" nocase ascii
        $s5 = "Shell(" nocase ascii
        $s6 = "Sub Workbook_Open()" nocase ascii
    condition:
        2 of ($s*)
}
```

> **Notes:** These are **examples**. Expect some false positives; tune to your app and consider adding file‑type parsers and stricter ZIP checks alongside YARA.

---

## 3) Minimal integration with pomp elmi

Wrap your YARA engine behind a **scanner** that matches the `composeScanners` contract.  
The snippet below shows the idea (pseudo‑code):

```ts
// Example YARA scanner adapter (pseudo‑code)
import * as Y from '@automattic/yara';
// import { promises as fs } from 'node:fs';
// const sources = await fs.readFile('rules/starter/*.yar', 'utf8'); // or glob & join
// const compiled = await Y.compile(sources); // compile once at boot

export const YourYaraScanner = {
  async scan(bytes: Uint8Array) {
    // const matches = await compiled.scan(bytes, { timeout: 1500 });
    const matches: any[] = []; // plug your engine here
    return matches.map((m) => ({
      rule: m.rule,
      meta: m.meta ?? {},
      tags: m.tags ?? [],
    }));
  }
};
```

Compose it with the built‑in heuristics:

```ts
import { composeScanners, CommonHeuristicsScanner } from 'pompelmi';
// import { YourYaraScanner } from './yara-scanner';

export const scanner = composeScanners(
  [
    ['heuristics', CommonHeuristicsScanner],
    // ['yara', YourYaraScanner],
  ],
  { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
);
```

---

## 4) Quick local check (optional)

To sanity‑check the rules locally, you can use this simple script:

**`scripts/yara-quick-check.mjs`**
```js
// Minimal checker for rules under rules/starter/*.yar
// Usage: node scripts/yara-quick-check.mjs /path/to/file
import { promises as fs } from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import * as url from "node:url";

let Yara;
try {
  Yara = await import("@automattic/yara");
} catch {
  console.error("Please install @automattic/yara first: npm i -D @automattic/yara");
  process.exit(1);
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const RULES_DIR = path.join(__dirname, "..", "rules", "starter");

async function compileRules() {
  const ruleFiles = await glob(path.join(RULES_DIR, "*.yar"));
  if (!ruleFiles.length) throw new Error("No .yar files found in rules/starter/");
  const sources = await Promise.all(ruleFiles.map(p => fs.readFile(p, "utf8")));
  const sourceText = sources.join("\n\n");
  return await Yara.compile(sourceText);
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/yara-quick-check.mjs /path/to/file");
    process.exit(1);
  }

  const stats = await fs.stat(target).catch(() => null);
  if (!stats || !stats.isFile()) throw new Error(`Not a file: ${target}`);

  const rules = await compileRules();
  const buf = await fs.readFile(target);

  const matches = await rules.scan(buf, { timeout: 1500 });
  if (!matches.length) {
    console.log("No YARA matches.");
    return;
  }

  console.log(`Matched ${matches.length} rule(s):`);
  for (const m of matches) {
    console.log(`- ${m.rule} (${m.meta?.verdict ?? "n/a"}) — ${m.meta?.description ?? ""}`);
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
```

Add a convenience script:

```json
{
  "scripts": {
    "yara:check": "node scripts/yara-quick-check.mjs"
  }
}
```

Run it:

```bash
npm run yara:check -- ./some/file/to/test.pdf
```

---

## 5) Policy mapping (matches → verdict)

Suggested baseline:

- **malicious** — high‑confidence rules (e.g., `EICAR_Test_File`)
- **suspicious** — heuristic rules (e.g., PDF JavaScript, macro keywords)
- **clean** — no matches

In production, combine YARA with MIME sniffing, ZIP safety checks, and strict size/time caps.

---

## 6) Operational notes

- **Time/size limits:** cap scan time and bytes per file; fail‑closed on timeouts.
- **Privacy:** keep scans local; avoid third‑party upload unless policy allows it.
- **Updates:** version your rule set; add product‑specific packs (PDF, Office, Archives).
- **Isolation:** consider worker threads or a separate process for untrusted bytes.

---

## 7) Troubleshooting

- `ERR_MODULE_NOT_FOUND @automattic/yara`: ensure it’s installed (dev dep) and your Node version is supported.
- “No .yar files found”: check your `rules/starter/` path.
- Matches but no blocking: verify your policy mapping and HTTP response codes (e.g., `422 Unprocessable Entity` for blocked uploads).
