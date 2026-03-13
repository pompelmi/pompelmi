// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const NATIVE_EXTERNAL = [
  /^@litko\/yara-x(?:$|\/)/,
  /\.node(\?|$)/,
];

// Shared plugins
const plugins = (tsconfig = './tsconfig.json') => [
  resolve({ preferBuiltins: true }),
  commonjs(),
  typescript({ tsconfig }),
];

// Shared output options
const outputs = (stem) => [
  {
    file: `dist/${stem}.esm.js`,
    format: 'esm',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  {
    file: `dist/${stem}.cjs`,
    format: 'cjs',
    sourcemap: true,
    inlineDynamicImports: true,
  },
];

export default [
  // ── Primary Node.js bundle ────────────────────────────────────────────────
  {
    input: 'src/index.ts',
    output: outputs('pompelmi'),
    external: (id) => NATIVE_EXTERNAL.some((re) => re.test(id)),
    plugins: plugins(),
  },

  // ── Browser-safe bundle ───────────────────────────────────────────────────
  // No Node.js built-ins (no crypto/os/path/unzipper).
  // Import from 'pompelmi/browser'.
  {
    input: 'src/browser-index.ts',
    output: outputs('pompelmi.browser'),
    external: (id) => NATIVE_EXTERNAL.some((re) => re.test(id)),
    plugins: plugins(),
  },

  // ── React bundle ──────────────────────────────────────────────────────────
  // Browser-safe API + useFileScanner hook.
  // Import from 'pompelmi/react'.
  // Peer dependency: react ^18 || ^19
  {
    input: 'src/react-index.ts',
    output: outputs('pompelmi.react'),
    external: (id) => id === 'react' || NATIVE_EXTERNAL.some((re) => re.test(id)),
    plugins: plugins(),
  },

  // ── Quarantine bundle (Node.js only) ──────────────────────────────────────
  // Provides the quarantine/review/promote/delete workflow for upload pipelines.
  // Import from 'pompelmi/quarantine'.
  {
    input: 'src/quarantine/index.ts',
    output: outputs('pompelmi.quarantine'),
    // Keep Node.js built-ins external — they must not be inlined.
    external: (id) =>
      ['fs', 'path', 'crypto', 'os', 'stream', 'events', 'util', 'buffer'].includes(id) ||
      NATIVE_EXTERNAL.some((re) => re.test(id)),
    plugins: plugins(),
  },

  // ── Hooks bundle (browser-safe) ───────────────────────────────────────────
  // Scan lifecycle event hooks.
  // Import from 'pompelmi/hooks'.
  {
    input: 'src/hooks.ts',
    output: outputs('pompelmi.hooks'),
    external: (id) => NATIVE_EXTERNAL.some((re) => re.test(id)),
    plugins: plugins(),
  },

  // ── Audit bundle (Node.js only) ───────────────────────────────────────────
  // Structured audit trail logging.
  // Import from 'pompelmi/audit'.
  {
    input: 'src/audit.ts',
    output: outputs('pompelmi.audit'),
    external: (id) =>
      ['fs', 'path', 'crypto', 'os', 'stream', 'events', 'util', 'buffer'].includes(id) ||
      NATIVE_EXTERNAL.some((re) => re.test(id)),
    plugins: plugins(),
  },

  // ── Policy packs bundle (browser-safe) ───────────────────────────────────
  // Named, pre-configured upload policies.
  // Import from 'pompelmi/policy-packs'.
  {
    input: 'src/policy-packs.ts',
    output: outputs('pompelmi.policy-packs'),
    external: (id) => NATIVE_EXTERNAL.some((re) => re.test(id)),
    plugins: plugins(),
  },
];