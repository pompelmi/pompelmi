import path from 'path';
import { defineConfig } from 'tsup'
export default defineConfig({
  
  esbuildOptions(options){
    options.alias = { ...(options.alias||{}), pompelmi: path.resolve(__dirname, '../pompelmi/src/index.ts') };
  },entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  sourcemap: true,
  clean: true,
  outExtension() { return { js: '.mjs' } },
  banner: { js: '#!/usr/bin/env node' },
  noExternal: ['pompelmi'],
})
