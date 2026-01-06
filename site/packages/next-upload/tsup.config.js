import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  clean: true,
  // evita che l’SDK S3 opzionale di unzipper rompa la build
  external: ['unzipper', '@aws-sdk/client-s3']
});