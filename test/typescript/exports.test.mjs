/**
 * Regression test for https://github.com/pompelmi/pompelmi/issues/190
 *
 * Verifies that the package.json `exports` map correctly exposes TypeScript
 * type declarations to consumers using a modern module resolver
 * (moduleResolution: "bundler" or "node16"/"nodenext").
 *
 * The previous package.json had:
 *   "exports": { ".": { "import": "...", "require": "..." } }
 * with a top-level "types" field, but the top-level field is IGNORED when
 * `exports` is present. So `tsc` reported:
 *   "Could not find a declaration file for module 'pompelmi'...
 *    There are types at '.../types/index.d.ts', but this result could not be
 *    resolved when respecting package.json "exports"."
 *
 * This test installs pompelmi from the local checkout into a temp consumer
 * project and runs `tsc --noEmit` against a typed import. The consumer is
 * wired to use moduleResolution: "bundler" (the modern, exports-aware mode).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

function hasTypescript() {
  try {
    execFileSync('npx', ['--no', '-y', '-p', 'typescript@5.9.3', 'tsc', '--version'], {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

describe('package.json exports — types resolution (issue #190)', () => {
  it('exports map includes a "types" condition', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const exp = pkg.exports && pkg.exports['.'];
    assert.ok(exp, 'package.json must have an exports["."] entry');
    assert.ok(
      Object.prototype.hasOwnProperty.call(exp, 'types'),
      'exports["."] must include a "types" condition so TypeScript module ' +
        'resolution can locate ./types/index.d.ts when honoring exports'
    );
  });

  it('"types" condition points at the existing types/index.d.ts file', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const typesPath = pkg.exports['.'].types;
    assert.ok(
      typeof typesPath === 'string' && typesPath.length > 0,
      'exports["."].types must be a non-empty string'
    );
    const abs = join(repoRoot, typesPath);
    assert.ok(
      readFileSync(abs, 'utf8').length > 0,
      `exports["."].types (${typesPath}) must reference an existing file`
    );
  });

  // Optional runtime check: actually resolve types with tsc in a consumer.
  // Skipped if the network or npx fails (CI environments without TS).
  it('a typed consumer project can resolve pompelmi types under moduleResolution: bundler', { skip: !hasTypescript() && 'typescript@5.9.3 not reachable via npx' }, () => {
    const tmp = mkdtempSync(join(tmpdir(), 'pompelmi-types-'));
    try {
      const consumer = join(tmp, 'consumer');
      mkdirSync(consumer, { recursive: true });

      // Copy the package into the consumer's node_modules so we test the
      // *published* layout (types/ next to package.json, not relative to the
      // source tree we are editing).
      const nm = join(consumer, 'node_modules', 'pompelmi');
      mkdirSync(nm, { recursive: true });
      cpSync(join(repoRoot, 'package.json'), join(nm, 'package.json'));
      cpSync(join(repoRoot, 'types'), join(nm, 'types'), { recursive: true });
      cpSync(join(repoRoot, 'src'), join(nm, 'src'), { recursive: true });
      // The CJS bundle pulls in terminal-image and fs at runtime; for the
      // type-resolution test we don't need a full dependency install, but we
      // DO need a minimal package.json for the consumer to be a valid project.

      writeFileSync(join(consumer, 'package.json'), JSON.stringify({
        name: 'pompelmi-types-consumer',
        version: '0.0.0',
        private: true,
        type: 'module',
      }, null, 2));

      writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'es2022',
          module: 'esnext',
          moduleResolution: 'bundler',
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ['index.ts'],
      }, null, 2));

      // Two import shapes that both should resolve to typed symbols.
      writeFileSync(join(consumer, 'index.ts'),
        "import { scan, Verdict, type ScanOptions } from 'pompelmi';\n" +
        "const opts: ScanOptions = { host: 'localhost', port: 3310 };\n" +
        "void scan; void Verdict; void opts;\n"
      );

      const out = execFileSync(
        'npx',
        ['--no', '-y', '-p', 'typescript@5.9.3', 'tsc', '-p', consumer],
        { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
      );
      assert.ok(
        out === '' || !/TS7016|Could not find a declaration file/.test(out),
        'tsc must not emit TS7016 (could not find a declaration file for ' +
          "'pompelmi'). Output was:\n" + out
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
