// @ts-check
import process from 'node:process';
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import sentry from '@sentry/astro';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [
    react(),
    sitemap(),
    sentry({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: { 'react-dom/server': 'react-dom/server.edge' },
    },
    ssr: {
      noExternal: ['react', 'react-dom'],
    },
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SUPABASE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_SENTRY_DSN: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
