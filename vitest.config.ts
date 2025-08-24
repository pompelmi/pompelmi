import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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

      // Conta SOLO i file coperti dai test (niente zero-coverage in mezzo)
      all: false,

      // Misura il core root
      include: ['src/**/*.ts'],
      exclude: [
        'packages/**', 'dist/**', 'site/**', 'docs/**', 'examples/**', 'website/**',
        '**/*.d.ts', '**/__mocks__/**', '**/*.test.ts', '**/*.spec.ts'
      ],

      // Soglie alte (lo zipTraversalGuard.ts ha già branches ~85.7%)
      thresholds: { branches: 85, lines: 90, functions: 90, statements: 90 }
    }
  }
});
