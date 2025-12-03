import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // Increased timeout for CI
    // Aggressive memory optimization for CI
    maxConcurrency: process.env.CI ? 1 : 4,
    isolate: process.env.CI ? false : true, // Disable test isolation in CI
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: process.env.CI, // Use single fork in CI
      },
    },
    include: [
      'tests/**/*.test.ts',
      'test/**/*.test.ts',
      'packages/**/tests/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'packages/**/*.test.ts'
    ],
    // Skip memory-intensive tests in CI
    exclude: process.env.CI ? [
      'packages/engine-binaryninja/**/*.test.ts',
      'packages/engine-ghidra/**/*.test.ts',
      'packages/engine-clamav/**/*.test.ts', // Skip ClamAV tests too
      '**/memory-intensive.test.ts',
      '**/large-file.test.ts'
    ] : [
      'packages/engine-binaryninja/**/*.test.ts',
      'packages/engine-ghidra/**/*.test.ts'
    ],
    // Disable coverage completely in CI to save memory
    coverage: {
      enabled: !process.env.CI,
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      
      // Only measure core files
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
        'src/engines/dynamic-taint.ts',
        'src/**/*.generated.ts'
      ],

      thresholds: { branches: 70, lines: 80, functions: 80, statements: 80 }
    }
  }
});
