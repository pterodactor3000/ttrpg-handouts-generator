import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const srcAlias = {
  '@': resolve(__dirname, './src'),
  'astro:middleware': resolve(__dirname, './src/integration/helpers/astro-middleware-stub.ts'),
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
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/integration/**'],
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'integration',
          environment: 'node',
          // Loads only .env.test via setup-env.ts (Vitest 4 projects do not honor envFile per-project)
          setupFiles: ['src/integration/setup-env.ts'],
          include: ['src/integration/**/*.test.ts'],
        },
      },
    ],
  },
});
