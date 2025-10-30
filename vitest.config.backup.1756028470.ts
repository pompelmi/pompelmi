import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Look for tests in root and packages (even though we exclude packages from coverage)
    include: [
      'tests/**/*.test.ts',
      'test/**/*.test.ts',
      'packages/**/tests/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'packages/**/*.test.ts'
    ],

    coverage: {
      enabled: true,
      provider: 'v8',                     // usa @vitest/coverage-v8
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',

      // >>> scope ridotto al core del root per ottenere 90%+ subito
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'packages/**',                    // esclude tutti i packages dalla coverage
        'dist/**', 'site/**', 'docs/**', 'examples/**', 'website/**',
        '**/*.d.ts', '**/__mocks__/**', '**/*.test.ts', '**/*.spec.ts'
      ],

      // soglie alte per blindare l'obiettivo
      thresholds: { branches: 85, lines: 90, functions: 90, statements: 90 }
    }
  }
});
