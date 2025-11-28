import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: [
      'tests/**/*.test.ts',
      'test/**/*.test.ts',
      'packages/**/tests/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'packages/**/*.test.ts'
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',

      // Count ONLY files covered by tests (no zero-coverage files mixed in)
      all: false,

      // Measure the core root
      include: ['src/**/*.ts'],
      exclude: [
        'packages/**', 'dist/**', 'site/**', 'docs/**', 'examples/**', 'website/**',
        '**/*.d.ts', '**/__mocks__/**', '**/*.test.ts', '**/*.spec.ts'
      ],

      // High thresholds (zipTraversalGuard.ts already has ~85.7% branches)
      thresholds: { branches: 85, lines: 90, functions: 90, statements: 90 }
    }
  }
});
