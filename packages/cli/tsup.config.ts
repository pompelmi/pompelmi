import { defineConfig } from 'tsup';

export default defineConfig({
  esbuildOptions(options) {
    options.logOverride = Object.assign({}, options.logOverride, { 'import-is-undefined': 'silent' });
  },
  entry: {
    cli: 'src/cli.ts',
    'commands/scan': 'src/commands/scan.ts',
    'commands/watch': 'src/commands/watch.ts',
    'formatters/index': 'src/formatters/index.ts',
  },
  target: 'node18',
  format: ['esm'],
  platform: 'node',
  sourcemap: true,
  dts: false,      // CLI doesn't ship types
  clean: true,
  noExternal: ['@pompelmi/core'],
  treeshake: true,
});
