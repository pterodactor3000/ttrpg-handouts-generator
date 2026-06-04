import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const srcAlias = {
  '@': resolve(__dirname, './src'),
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
