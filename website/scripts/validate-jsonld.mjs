import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultDistDir = fileURLToPath(new URL('../dist', import.meta.url));
const distDir = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : defaultDistDir;
const htmlFiles = [];
const scriptPattern = /<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (fullPath.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
};

walk(distDir);

let jsonLdBlockCount = 0;
const failures = [];

for (const htmlFile of htmlFiles) {
  const html = readFileSync(htmlFile, 'utf8');
  let match;
  let blockIndex = 0;

  while ((match = scriptPattern.exec(html)) !== null) {
    blockIndex += 1;
    jsonLdBlockCount += 1;

    const rawJson = match[2].trim();

    if (!rawJson) {
      failures.push(`${htmlFile} block #${blockIndex}: JSON-LD script is empty.`);
      continue;
    }

    try {
      const parsed = JSON.parse(rawJson);

      if (!parsed || typeof parsed !== 'object') {
        failures.push(
          `${htmlFile} block #${blockIndex}: JSON-LD root must be an object or array.`,
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${htmlFile} block #${blockIndex}: ${reason}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Invalid JSON-LD detected in built HTML:\n');

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  `Validated ${jsonLdBlockCount} JSON-LD block(s) across ${htmlFiles.length} HTML file(s) in ${distDir}.`,
);
