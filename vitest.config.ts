import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Look for test files across workspace packages
    include: [
      'packages/**/test/**/*.test.ts',
      'packages/**/*.test.ts',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        branches: 80,
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
