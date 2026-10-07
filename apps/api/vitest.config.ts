import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC conserve les métadonnées de décorateurs dont NestJS a besoin pour l'injection.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://kle:kle@localhost:5432/kle_test',
      JOBS_ENABLED: 'false',
      STORAGE_LOCAL_DIR: './storage-test',
    },
  },
});
