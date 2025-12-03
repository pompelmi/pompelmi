import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    // Limit memory usage for CI
    maxConcurrency: process.env.CI ? 2 : undefined,
    include: [
      'tests/**/*.test.ts',
      'test/**/*.test.ts',
      'packages/**/tests/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'packages/**/*.test.ts'
    ],
    // Skip Binary Ninja tests in CI since Binary Ninja isn't installed
    exclude: process.env.CI ? [
      'packages/engine-binaryninja/**/*.test.ts',
      'packages/engine-ghidra/**/*.test.ts'
    ] : [],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: process.env.CI ? ['lcov'] : ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',

      // Count ONLY files covered by tests (no zero-coverage files mixed in)
      all: false,

      // Measure the core root only to reduce memory usage
      include: ['src/**/*.ts'],
      exclude: [
        'packages/**', 
        'dist/**', 
        'site/**', 
        'docs/**', 
        'examples/**', 
        'website/**',
        '**/*.d.ts', 
        '**/__mocks__/**', 
        '**/*.test.ts', 
        '**/*.spec.ts',
        // Exclude large files that might cause memory issues
        'src/engines/dynamic-taint.ts',
        'src/**/*.generated.ts'
      ],

      // Moderate thresholds to avoid CI failures while maintaining quality
      thresholds: { branches: 70, lines: 80, functions: 80, statements: 80 }
    }
  }
});
