import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Look for test files across the monorepo (root + packages, test/tests folders)
    include: [
        'src/**/*.ts'
      ],

    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      all: false, // flip to true after you have a base to include all uncovered files
      include: [
        'src/**/*.ts',
        'packages/pompelmi/src/**/*.ts'
      ],
      exclude: [
'dist/**',
'site/**',
'docs/**',
'examples/**',
'website/**',
'**/*.d.ts',
'**/__mocks__/**',
'**/*.test.ts',
'packages/express-middleware/**',
'packages/koa-middleware/**',
'packages/fastify-plugin/**',
'packages/next-upload/**',
'packages/engine-clamav/**',
'packages/engine-yara/**',
'packages/engine/**',
'packages/engine-heuristics/**',
        'packages/**',
'**/*.spec.ts'
      ],
      
    
  }
});
