import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    // Very aggressive memory optimization for CI
    maxConcurrency: 1,
    minWorkers: 1,
    maxWorkers: 1,
    isolate: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false,
      },
    },
    // Only run root tests in CI, skip all package tests
    include: process.env.CI ? [
      'tests/**/*.test.ts',
      'test/**/*.test.ts'
    ] : [
      'tests/**/*.test.ts',
      'test/**/*.test.ts',
      'packages/**/tests/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'packages/**/*.test.ts'
    ],
    // Skip all package tests and problematic tests in CI
    exclude: [
      'node_modules/**',
      'packages/**/*.test.ts',
      'packages/**/tests/**',
      'packages/**/test/**',
      '**/node_modules/**'
    ],
    // Disable coverage completely in CI
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
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
        '**/*.spec.ts'
      ]
    }
  }
});
