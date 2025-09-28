import { defineConfig } from 'tsup';

export default defineConfig({
  
  esbuildOptions(options) {
    options.logOverride = Object.assign({}, options.logOverride, { 'import-is-undefined': 'silent' });
  },entry: ['src/index.ts'],
  target: 'node18',
  format: ['esm'],
  platform: 'node',
  sourcemap: true,
  dts: false,      // CLI doesn't ship types
  clean: true,
  noExternal: [ '@pompelmi/engine', '@pompelmi/engine-heuristics' ],
  treeshake: true,
});
