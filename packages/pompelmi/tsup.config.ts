import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  clean: true,
  // Se in futuro il core userà unzipper/S3, tenerli esterni evita warning/build errors
  external: ['unzipper', '@aws-sdk/client-s3']
});
