import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  sourcemap: true,
  clean: true,
  outExtension() { return { js: '.mjs' } },
  banner: { js: '#!/usr/bin/env node' },
  noExternal: ['pompelmi'],
})
