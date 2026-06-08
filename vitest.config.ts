import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const srcAlias = {
  '@': resolve(__dirname, './src'),
  '@/integration': resolve(__dirname, './__tests__/integration'),
  'astro:middleware': resolve(__dirname, './__tests__/integration/helpers/astro-middleware-stub.ts'),
};

const sharedConfig = {
  plugins: [react()],
  resolve: {
    alias: srcAlias,
  },
};

export default defineConfig({
  ...sharedConfig,
  test: {
    projects: [
      {
        ...sharedConfig,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['__tests__/**/*.test.{ts,tsx}'],
          exclude: ['__tests__/integration/**'],
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'integration',
          environment: 'node',
          // Loads only .env.test via setup-env.ts (Vitest 4 projects do not honor envFile per-project)
          setupFiles: ['__tests__/integration/setup-env.ts'],
          include: ['__tests__/integration/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
