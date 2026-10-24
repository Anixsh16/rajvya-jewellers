import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@':path.resolve(__dirname,'src')}},test:{include:['tests/**/*.test.ts'],setupFiles:['tests/env.ts'],testTimeout:45000,hookTimeout:45000,fileParallelism:false}});
