import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/env.ts'],
    testTimeout: 90000,
    hookTimeout: 90000,
    fileParallelism: false,
  },
});
